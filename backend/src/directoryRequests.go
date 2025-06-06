package main

import (
	"context"
	"errors"
	"fmt"

	"filippo.io/age"
	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"
)

var (
	errDirNotFound error = errors.New("dirNotFound")
)

const (
	// The user's root/home directory's ID
	RootDirectoryID = "root"
)

func handleGetDirectory(c *gin.Context) {
	/*
		curl -X POST "localhost:9090/getDir" -H 'Content-Type: application/json' -d '{"userID":"testUser","authToken":"K1xS9ehuxeC5tw==","dirID": "root"}'

		curl -X POST "localhost:9090/getDir" -H 'Content-Type: application/json' -d '{"userID":"testUser","authToken":"K1xS9ehuxeC5tw==","dirID": "01955efc-ca5b-7b65-849e-ab9f1351de23"}'
	*/
	if c.Request.Body == nil {
		c.JSON(400, gin.H{"success": false, "error": "No data received"})
		return
	}

	var request GetDirectoryRequest
	err := c.BindJSON(&request)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (0), Please try again later"})
		log.WithField("error", err).Error("[handleGetDirectory] Failed to decode JSON")
		return
	}

	// verify that the token is valid
	valid, err := isAuthTokenValid(c, request.UserID, request.AuthToken)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (1), Please try again later"})
		log.WithField("error", err).Error("[handleGetDirectory] Failed to verify token")
		return
	}

	if !valid {
		c.JSON(400, gin.H{"success": false, "error": "Invalid Credentials"})
		return
	}

	// Get the items in the DB
	items, err := getItemsInDir(c, request.UserID, request.DirID)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (2), Please try again later"})
		log.WithField("error", err).Error("[handleGetDirectory] Failed to get items in directory")
		return
	}

	// Get the directory's parentDir
	parentDir, err := getParentDirID(c, request.DirID)
	if err != nil {
		if errors.Is(err, errDirNotFound) {
			// Ideally status code should not be 200. TODO: Check if the client can handle non 200 status codes
			c.JSON(200, gin.H{"success": false, "error": "Directory doesn't exist"})
			return
		}
		log.WithField("error", err).Error("[handleGetDirectory] Failed to get parentDir ID")
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (3), Please try again later"})
	}

	response := GetDirectoryResponse{true, request.DirID, parentDir, items}
	// Return json
	c.JSON(200, response)
}

// When a directory and thus everything inside is deleted
func handleRemoveDirectory(c *gin.Context) {
	// TODO: Test this. Figure out the logic when the directory is NOT empty
	if c.Request.Body == nil {
		c.JSON(400, gin.H{"success": false, "error": "No data received"})
		return
	}

	var request GetDirectoryRequest
	err := c.BindJSON(&request)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (0), Please try again later"})
		log.WithField("error", err).Error("[handleRemoveDirectory] Failed to decode JSON")
		return
	}

	// verify that the token is valid
	valid, err := isAuthTokenValid(c, request.UserID, request.AuthToken)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (1), Please try again later"})
		log.WithField("error", err).Error("[handleRemoveDirectory] Failed to verify token")
		return
	}

	if !valid {
		c.JSON(400, gin.H{"success": false, "error": "Invalid Credentials"})
		return
	}

	if request.DirID == RootDirectoryID {
		c.JSON(400, gin.H{"success": false, "error": "You cannot delete your home directory"})
		return
	}

	fmt.Println("request dirID is here ", request.DirID)
	// check that user owns the directory
	perm, err := getFolderPermission(c, request.DirID, request.UserID, false)
	if err != nil {
		if errors.Is(err, errDirNotFound) {
			c.JSON(400, gin.H{"success": false, "error": "Parent Directory doesn't exist"})
			return
		}

		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (2), Please try again later"})
		log.WithField("Error", err).Error("[handleRemoveDirectory] Error getting dir permission")
		return
	}

	if perm != WritePermission {
		c.JSON(403, gin.H{"success": false, "error": "You don't have permission to delete this folder"})
		return
	}

	// Get the items in the DB and delete them.
	rows, err := db.QueryContext(c, "select id, objKey from files where userID=? AND parentDir=?", request.UserID, request.DirID)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (2), Please try again later"})
		log.WithField("error", err).Error("[handleRemoveDirectory] Failed to get items in directory")
		return
	}

	defer rows.Close()

	var ids []string = []string{}

	for rows.Next() {
		var id, objKey string
		err := rows.Scan(&id, &objKey)
		if err != nil {
			c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (3), Please try again later"})
			idsLen := len(ids)
			log.WithFields(log.Fields{"error": err, "dirID": request.DirID, "idsCount": idsLen}).Error("[handleRemoveDirectory] Failed to scan item")
			if idsLen > 0 {
				fmt.Printf("IDs Deleted: %v\n", ids)
			}
			return
		}

		// delete the file from S3
		_, err = deleteFile(c, s3Client, serverConfig.S3BucketName, objKey)
		if err != nil {
			// handle the error
			c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (3), Please try again later"})
			log.WithFields(log.Fields{"error": err, "objKey": objKey}).Error("[handleRemoveDirectory] Failed to delete file from S3")
			return
		}

		// remove from DB
		err = removeFileFromDB(c, id, request.UserID)
		if err != nil {
			// handle the error
			c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (4), Please try again later"})
			log.WithFields(log.Fields{"error": err, "fileID": id, "objKey": objKey, "userID": request.UserID}).Error("[handleRemoveFile] Failed to delete file from DB")
			return
		}

		// log.WithFields(log.Fields{"userID": userID, "fileOwnerUserID": fileOwnerUserID, "fileID": fileID}).Trace("[isAuthTokenValid]")

		// append id deleted
		ids = append(ids, id)
	}
	err = removeFileFromDB(c, request.DirID, request.UserID)
	if err != nil {
		// handle the error
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (4), Please try again later"})
		log.WithFields(log.Fields{"error": err, "fileID": request.DirID, "userID": request.UserID}).Error("[handleRemoveFile] Failed to delete file from DB")
		return
	}

	// the loop might take too long on big directories, this should probably be done in the background

	c.JSON(200, gin.H{"success": true})
}

// When a whole directory is shared
func handleShareDirectory(c *gin.Context) {
	/*
		curl -X POST "localhost:9090/shareDir" -H 'Content-Type: application/json' -d '{"userID":"testUser","authToken":"K1xS9ehuxeC5tw==","dirID": "0195f78c-2487-75e7-b611-127b303d1e9e", "withUserID": "anotherTestUser", "isReadOnly": true}'
	*/
	if c.Request.Body == nil {
		c.JSON(400, gin.H{"success": false, "error": "No data received"})
		return
	}

	var request ShareDirectoryRequest
	err := c.BindJSON(&request)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (0), Please try again later"})
		log.WithField("error", err).Error("[handleShareDirectory] Failed to decode JSON")
		return
	}

	// verify that the token is valid
	valid, err := isAuthTokenValid(c, request.UserID, request.AuthToken)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (1), Please try again later"})
		log.WithField("error", err).Error("[handleShareDirectory] Failed to verify token")
		return
	}

	if !valid {
		c.JSON(400, gin.H{"success": false, "error": "Invalid Credentials"})
		return
	}

	if request.DirID == RootDirectoryID {
		c.JSON(400, gin.H{"success": false, "error": "You cannot share your home directory"})
		return
	}

	// check that user can actually share the directory
	perm, err := getFolderPermission(c, request.DirID, request.UserID, false)
	if err != nil {
		if errors.Is(err, errDirNotFound) {
			c.JSON(400, gin.H{"success": false, "error": "Parent Directory doesn't exist"})
			return
		}

		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (2), Please try again later"})
		log.WithField("Error", err).Error("[handleShareDirectory] Error getting dir permission")
		return
	}

	if perm != WritePermission {
		c.JSON(403, gin.H{"success": false, "error": "You don't have permission to share this folder"})
		return
	}

	// check that the directory is not already shared
	// This doesn't check if it is inside of a parentDir that is already shared
	// Loop over each user to share with using a basic for loop
	for i := 0; i < len(request.WithUserID); i++ {
		withUserID := request.WithUserID[i]

		sharedFilesID, perm, err := querySharedFilesTable(c, request.DirID, withUserID)
		if err != nil {
			log.WithFields(log.Fields{"error": err, "withUserID": withUserID}).Error("[handleShareDirectory] querySharedFilesTable")
			continue
		}

		// TODO: test this
		if perm != "" {
			switch perm {
			case WritePermission:
				// already has write permission
				if request.ReadOnly {
					// change the folder's permission to read only
					err := changeFilePermission(c, sharedFilesID, request.DirID, ReadOnlyPermission)
					if err != nil {
						c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (4a), Please try again later"})
						log.WithField("error", err).Error("[handleShareDirectory] Failed to change permission")
						return
					}
					c.JSON(200, gin.H{"success": true})
					return
				} else {
					// do nothing, user already has write permission
					c.JSON(400, gin.H{"success": false, "error": "User already has write permission for that directory"})
					log.Trace("[handleShareDirectory] Dir already has write permission")
					return
				}
			case ReadOnlyPermission:
				// already has read permission
				if !request.ReadOnly {
					// change the folder's permission to write
					err := changeFilePermission(c, sharedFilesID, request.DirID, WritePermission)
					if err != nil {
						c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (4b), Please try again later"})
						log.WithField("error", err).Error("[handleShareDirectory] Failed to change permission")
						return
					}
					c.JSON(200, gin.H{"success": true})
					return
				} else {
					// do nothing, user already has read permission
					c.JSON(400, gin.H{"success": false, "error": "User already has read permission for that directory"})
					log.Trace("[handleShareDirectory] Dir already has read permission")
					return
				}
			default:
				// unkown permission value
				c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (4c), Please try again later"})
				log.WithFields(log.Fields{"perm": perm}).Error("[handleShareDirectory] File has unkown permission")
				return
			}
		}

		// directory is not already shared

		id, err := getNewID()
		if err != nil {
			c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (5)"})
			log.WithField("error", err).Error("[handleShareDirectory] Failed to get new fileID")
			return
		}

		_, err = db.ExecContext(c, "INSERT INTO sharedFiles (id, fileID, userID, fileOwner, isReadOnly, createdDate) VALUES (?, ?, ?, ?, ?, now());", id, request.DirID, request.WithUserID, request.UserID, request.ReadOnly)
		if err != nil {
			c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (6)"})
			log.WithField("error", err).Error("[handleShareDirectory] Failed to add share to DB")
			return
		}
	}
	// The DB part is the same as with a file, but all of the files inside of the directory have to be reencrypted

	// TODO: get the client to encrypt the files with all recipients, upload it, and set processed to true on the db

	c.JSON(200, gin.H{"success": true})
}

// Returns the user's that have access to a file/folder
func handleGetSharedWith(c *gin.Context) {
	/*
		curl -X POST "localhost:9090/getSharedWith" -H 'Content-Type: application/json' -d '{"userID":"testUser","authToken":"K1xS9ehuxeC5tw==","dirID": "0195677e-5b7e-7445-b3e6-2f3dddb22683"}'
	*/
	if c.Request.Body == nil {
		c.JSON(400, gin.H{"success": false, "error": "No data received"})
		return
	}

	var request GetFileRequest
	err := c.BindJSON(&request)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (0), Please try again later"})
		log.WithField("error", err).Error("[handleGetSharedWith] Failed to decode JSON")
		return
	}

	valid, err := isAuthTokenValid(c, request.UserID, request.AuthToken)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (1), Please try again later"})
		log.WithField("error", err).Error("[handleGetSharedWith] Failed to verify token")
		return
	}

	if !valid {
		c.JSON(400, gin.H{"success": false, "error": "Invalid Credentials"})
		return
	}

	// TODO: Test this with shared files including ones that the user doesn't have access to

	// Check that the user can actually get this info. I.E., the user has access to the file.
	// TODO: change this since getObjectKey only checks files
	/*
		_, err = getObjectKey(c, request.FileID, request.UserID, true)
		if err != nil {
			if errors.Is(err, errUserAccessNotAllowed) {
				// User does not have access to the file
				c.JSON(403, gin.H{"success": false, "error": "Operation not allowed"})
				log.WithField("error", err).Debug("[handleGetSharedWith] User tried to get details without permission")
				return
			}

			if errors.Is(err, errFileNotFound) {
				c.JSON(400, gin.H{"success": false, "error": "File not found"})
				log.WithFields(log.Fields{"error": err, "fileID": request.FileID}).Debug("[handleGetSharedWith] No file with that fileID found")
				return
			}

			c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (2)"})
			log.WithField("error", err).Error("[handleGetSharedWith] getObjectKey error")
			return
		}*/

	users, err := getUsersWithFileAccess(c, request.FileID, 0, nil)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (3)"})
		log.WithField("error", err).Error("[handleGetSharedWith] Failed to get new fileID")
		return
	}

	c.JSON(200, gin.H{"success": true, "users": users})
}

// Handles the requests to create a folder
func handleCreateDirectory(c *gin.Context) {
	/*
		curl -X POST "localhost:9090/createDir" -H 'Content-Type: application/json' -d '{"userID":"testUser","authToken":"K1xS9ehuxeC5tw==","dirName": "memes","parentDir":"root"}'
	*/
	if c.Request.Body == nil {
		c.JSON(400, gin.H{"success": false, "error": "No data received"})
		return
	}

	var request CreateFolderRequest
	err := c.BindJSON(&request)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (0)"})
		log.WithField("error", err).Error("[handleCreateDirectory] Failed to decode JSON")
		return
	}

	// verify that the token is valid
	valid, err := isAuthTokenValid(c, request.UserID, request.AuthToken)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (1), Please try again later"})
		log.WithField("error", err).Error("[handleCreateDirectory] Failed to verify token")
		return
	}

	if !valid {
		c.JSON(400, gin.H{"success": false, "error": "Invalid Credentials"})
		return
	}

	// check that the user is allowed to create a new directory in that location
	// TODO: Test this
	perm, err := getFolderPermission(c, request.ParentDir, request.UserID, true)
	if err != nil {
		if errors.Is(err, errDirNotFound) {
			c.JSON(400, gin.H{"success": false, "error": "Parent Directory doesn't exist"})
			return
		}

		log.WithField("Error", err).Error("[handleCreateDirectory] Error getting parentDir permission")
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (2), Please try again later"})
		return
	}

	if perm != WritePermission {
		c.JSON(403, gin.H{"success": false, "error": "No write permission on Parent Directory"})
		return
	}

	dirID, err := getNewID()
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (3)"})
		log.WithField("error", err).Error("[handleCreateDirectory] Failed to get new fileID")
		return
	}

	err = addDirectoryToDB(c, dirID.String(), request.ParentDir, request.DirName, request.UserID)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (4)"})
		log.WithField("error", err).Error("[handleCreateDirectory] Failed to create a directory")
		return
	}

	// only generate a folderKey if the folder is shared
	shareWithLen := len(request.ShareWith)
	if shareWithLen > 0 {
		log.WithFields(log.Fields{"shareWithLen": shareWithLen}).Trace("[handleCreateDirectory] Directory is shared")

		//  Generate the folder key
		privateKey, publicKey, err := generateFolderKey(c)
		if err != nil {
			c.JSON(500, gin.H{"success": false, "error": "Failed to generate folder key"})
			return
		}

		_, err = db.ExecContext(c, "INSERT INTO encryptionKeys (publicKey, userID, description, createdDate, folderID) VALUES (?, ?, ?, now(), ?)", publicKey.String(), request.UserID, "Auto-generated folder key", dirID.String())
		if err != nil {
			log.WithFields(log.Fields{
				"error":     err,
				"publicKey": publicKey,
			}).Error("[handleCreateDirectory] Failed to insert public key into encryptionKeys table")
		}

		// Fetch public keys for all users including the creator
		shareWith := append(request.ShareWith, request.UserID)

		publicKeys := []age.Recipient{}
		for _, userID := range shareWith {
			pubKey, err := getPublicKeyForUser(c, userID)
			if err != nil {
				log.WithField("userID", userID).WithError(err).Error("[handleCreateDirectory] Failed to fetch user's public key")
				continue
			}

			recipient, err := age.ParseX25519Recipient(pubKey)
			if err != nil {
				log.WithFields(log.Fields{"pubKey": pubKey, "shareWith": shareWith}).WithError(err).Error("[handleCreateDirectory] Invalid public key")
				// TODO: maybe return an error here
				continue
			}
			publicKeys = append(publicKeys, recipient)
		}

		// Encrypt the folder key for all recipients at once
		encryptedKey, err := encryptFolderKeyForUsers([]byte(privateKey.String()), publicKeys)
		if err != nil {
			log.WithError(err).Error("[handleCreateDirectory] Failed to encrypt folder key")
			c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (5)"})
			return
		}

		// Upload the single encrypted key once
		err = uploadEncryptedFolderKey(c, encryptedKey, dirID.String())
		if err != nil {
			log.WithError(err).Error("[handleCreateDirectory] Failed to upload encrypted folder key")
			c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (6)"})
			return
		}

		// Share the newly created directory with the specified users
		// Grant write permission by default when creating and sharing
		err = addFilePermission(c, dirID.String(), request.ShareWith, request.UserID, false) // isReadOnly = false for write permission
		if err != nil {
			log.WithFields(log.Fields{"error": err, "dirID": dirID}).Error("[handleCreateDirectory] Failed to share directory")
			// Consider whether to rollback the directory creation or continue with errors
		}

		// https://gobyexample.com/goroutines
		go func() {
			for _, userID := range shareWith {
				if request.UserID == userID {
					continue
				}
				err := addAlert(context.Background(), userID, "sharedFolder", request.UserID, dirID.String())
				if err != nil {
					log.WithFields(log.Fields{"userID": userID, "dirID": dirID.String(), "error": err.Error()}).Error("[handleCreateDirectory: Goroutine] Failed to send alert to user")
				}
			}
		}()
	} else {
		log.Trace("[handleCreateDirectory] Directory is not shared")
	}

	c.JSON(200, gin.H{"success": true, "dirID": dirID})
}

func addDirectoryToDB(ctx context.Context, dirID, parentDir, name, userID string) error {
	_, err := db.ExecContext(ctx, "INSERT INTO files (id, parentDir, name, type, size, userID, processed, createdDate) VALUES (?, ?, ?, 'folder', 0, ?, true, now());", dirID, parentDir, name, userID)
	return err
}

func getItemsInDir(ctx context.Context, userID, dirID string) ([]GetDirectoryResponseItems, error) {
	var items []GetDirectoryResponseItems

	rows, err := db.QueryContext(ctx, "select id, name, type, size from files where userID=? AND parentDir=?", userID, dirID)
	if err != nil {
		return nil, err
	}

	defer rows.Close()

	for rows.Next() {
		var item GetDirectoryResponseItems
		err := rows.Scan(&item.ID, &item.Name, &item.FileType, &item.Size)
		if err != nil {
			/*
				if err == sql.ErrNoRows {
					return "", nil
				}
			*/
			return nil, err
		}

		// log.WithFields(log.Fields{"userID": userID, "fileOwnerUserID": fileOwnerUserID, "fileID": fileID}).Trace("[isAuthTokenValid]")
		items = append(items, item)
	}

	return items, nil
}

// It returns the parentDir for the fileID/dirID.
// If the file/folder is not found, it returns errDirNotFound
func getParentDirID(ctx context.Context, dirID string) (string, error) {
	if dirID == RootDirectoryID {
		return "", nil
	}

	rows, err := db.QueryContext(ctx, "select parentDir from files where id=?", dirID)
	if err != nil {
		return "", err
	}

	defer rows.Close()

	var parentDir string
	if rows.Next() {
		err := rows.Scan(&parentDir)
		if err != nil {
			return "", err
		}
	} else {
		err = rows.Err()
		if err != nil {
			return "", fmt.Errorf("rows.next error. %w", err)
		} else {
			log.WithField("dirID", dirID).Trace("[getParentDirID] File not found")
			return "", errDirNotFound
		}
	}

	return parentDir, nil
}

// Returns the permission that the userID has for the specified fileID/folderID.
// returns a string with the permission: "write", "read", or "" for no permission.
// Use the constants WritePermission and ReadOnlyPermission when checking the permission.
//
// allowShared is used to allow checking if the file is shared with the user, it is used for things things that require the user to own the file.
// When it is false, the sharedFiles DB will not be checked.
//
// If the folder doesn't exist, it returns the error errDirNotFound.
func getFolderPermission(ctx context.Context, fileID, userID string, allowShared bool) (string, error) {
	if fileID == "" {
		log.Trace("[getFolderPermission] fileID is empty. returning errDirNotFound")
		return "", errDirNotFound
	}

	if fileID == RootDirectoryID {
		return WritePermission, nil
	}

	// Check that folder exists. Query files db, type should be "folder"
	rows, err := db.QueryContext(ctx, "select userID from files where id=? AND type='folder';", fileID)
	if err != nil {
		return "", err
	}

	defer rows.Close()

	if rows.Next() {
		var ownerUserID string
		err := rows.Scan(&ownerUserID)
		if err != nil {
			return "", err
		}

		if ownerUserID == userID {
			return WritePermission, nil
		} else {
			// If the user doesn't own the file, check if they have access to it
			if !allowShared {
				return "", errUserAccessNotAllowed
			}
			log.Trace("[getFolderPermission] File not owned by user, checking sharedFiles.")
			permission, err := hasSharedFilePermission(ctx, fileID, userID)
			if err != nil {
				return "", fmt.Errorf("error from hasSharedFilePermission. %w", err)
			}
			return permission, nil
		}
	}

	err = rows.Err()
	if err != nil {
		return "", err
	}

	return "", errDirNotFound
}

// Returns a list of userIDs that have access to the fileID specified and the permission type. The fileID can also be a folder
// It is a recursive function, on initial call set callNumber to 0 and userPermissions to nil
func getUsersWithFileAccess(ctx context.Context, fileID string, callNumber int, userPermissions []UserFilePermission) ([]UserFilePermission, error) {
	// It needs to consider the cases when a file is inside of a shared folder and when the file is inside a folder that is inside the shared folder
	// sharedDir > someDir > actualFile
	//
	// It is recursive until the root has been reached
	//
	// sharedDir is shared with userA
	// someDir is shared with userB
	// actualFile is shared with userC
	// users that can access actualFile: userA, userB, userC

	if userPermissions == nil {
		userPermissions = []UserFilePermission{}
	}

	rows, err := db.QueryContext(ctx, "select userID, isReadOnly from sharedFiles where fileID=?", fileID)
	if err != nil {
		return nil, fmt.Errorf("QueryContext Error. callNumber: %d. %w", callNumber, err)
	}

	defer rows.Close()

	// var newUserIDs []string
	for rows.Next() {
		var userID string
		var isReadOnly bool
		err := rows.Scan(&userID, &isReadOnly)
		if err != nil {
			return nil, fmt.Errorf("rows.Scan Error. callNumber: %d. %w", callNumber, err)
		}

		if isReadOnly {
			userPermissions = append(userPermissions, UserFilePermission{userID, ReadOnlyPermission})
		} else {
			userPermissions = append(userPermissions, UserFilePermission{userID, WritePermission})
		}
	}

	parentDir, err := getParentDirID(ctx, fileID)
	if err != nil {
		return userPermissions, fmt.Errorf("getParentDirID Error. callNumber: %d. %w", callNumber, err)
	}

	if parentDir == RootDirectoryID || parentDir == "" {
		return userPermissions, nil
	}

	// Check the parentDir
	return getUsersWithFileAccess(ctx, parentDir, callNumber, userPermissions)
}

func handleSync(c *gin.Context) {
	/*
		curl -X POST "localhost:9090/sync" -H 'Content-Type: application/json' -d '{"userID":"testUser","authToken":"K1xS9ehuxeC5tw=="}'
	*/
	if c.Request.Body == nil {
		c.JSON(400, gin.H{"success": false, "error": "No data received"})
		return
	}

	var request BasicRequest
	err := c.BindJSON(&request)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (0)"})
		log.WithField("error", err).Error("[handleSync] Failed to decode JSON")
		return
	}

	valid, err := isAuthTokenValid(c, request.UserID, request.AuthToken)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (1), Please try again later"})
		log.WithField("error", err).Error("[handleSync] Failed to verify token")
		return
	}

	if !valid {
		c.JSON(400, gin.H{"success": false, "error": "Invalid Credentials"})
		return
	}

	// Get the user's own folders and files.  These functions now return both.
	userItems, err := getFolders(c, request.UserID)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (2)"})
		log.WithField("error", err).Error("[handleSync] Failed to get user folders and files")
		return
	}

	// Get the folders and files shared with the user.  These functions now return both.
	sharedItems, err := getSharedFolders(c, request.UserID)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (3)"})
		log.WithField("error", err).Error("[handleSync] Failed to get shared folders and files")
		return
	}
	// Combine all files and folders into a single slice.
	var allItems []Folder
	allItems = append(allItems, userItems...)
	allItems = append(allItems, sharedItems...)

	for i := range sharedItems {
		folder := sharedItems[i] // pointer to modify in-place

		owner := folder.UserID

		objKey, err := getObjectKey(c, folder.ID, owner, true)
		if err != nil {
			log.WithField("error", err).Error("[handleSync] Failed to get object key")

		}
		files, err := getItemsInDir(c, owner, folder.ID)
		if err != nil {
			c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (4)"})
			log.WithField("error", err).Error("[handleSync] Failed to get items in directory")
			return
		}
		for _, file := range files {
			fileItem := Folder{
				ID:        file.ID,
				Name:      file.Name,
				Type:      file.FileType, // Map FileType
				FileSize:  file.Size,
				ParentDir: folder.ID,
				//  or set it to a default value.
			}
			allItems = append(allItems, fileItem)
		}
		log.WithField("sharedItems", sharedItems).Trace("[handleSync] shareItems")
		log.WithField("ownerID", owner).Trace("[handleSync] owner")
		log.WithField("folder", folder).Trace("[handleSync] folder")
		log.WithField("files", files).Trace("[handleSync] files")
		log.WithField("folder", objKey).Trace("[handleSync] Object key")
		log.WithField("folder", allItems).Trace("[handleSync] All items")

	}
	fmt.Printf("\nAll items: %v\n", allItems)

	c.JSON(200, gin.H{"success": true, "folders": allItems})
}

func getFolders(ctx context.Context, userID string) ([]Folder, error) {
	// It needs to consider the cases when a file is inside of a shared folder and when the file is inside a folder that is inside the shared folder
	rows, err := db.QueryContext(ctx, "SELECT id, parentDir, name, type, size, userID, lastModified FROM files WHERE userID = ?", userID)
	if err != nil {
		return nil, err
	}

	defer rows.Close()

	// Initialize an empty array so that the json returns an empty array instead of null.
	var folders []Folder = []Folder{}
	for rows.Next() {
		var folder Folder
		if err := rows.Scan(&folder.ID, &folder.ParentDir, &folder.Name, &folder.Type, &folder.FileSize, &folder.UserID, &folder.LastModified); err != nil {
			return nil, err
		}
		folders = append(folders, folder)
	}
	return folders, nil
}

// getSharedFolders fetches all folders that are shared with a specific user
func getSharedFolders(ctx context.Context, userID string) ([]Folder, error) {
	// ctx to control DB interaction
	// userID used to find files shared with them

	// find folders from the files table that are shared with the given user
	// only select folders that are listed in the 'sharedFiles' table
	rows, err := db.QueryContext(ctx, `
		SELECT f.id, f.parentDir, f.name, f.type, f.size, f.userID, f.lastModified
		FROM files f
		INNER JOIN sharedFiles s ON f.id = s.fileID
		WHERE s.userID = ?`, userID)
	// if error executing the query, return the error
	if err != nil {
		return nil, err
	}
	// rows object closed after we're done reading from i
	defer rows.Close()

	// empty slice to hold the folder structs
	var folders []Folder = []Folder{}

	// loop through each row returned by the query
	for rows.Next() {
		var folder Folder

		// read the data from the current row into the folder struct
		err := rows.Scan(&folder.ID, &folder.ParentDir, &folder.Name, &folder.Type, &folder.FileSize, &folder.UserID, &folder.LastModified)
		if err != nil {
			//fail to read a row, return the error
			return nil, err
		}

		// add successfully read folder
		folders = append(folders, folder)
	}

	// return the full list of shared folders and no error
	return folders, nil
}

// handleGetSharedFolders handles incoming HTTP POST requests to fetch shared folders for a given user.
func handleGetSharedFolders(c *gin.Context) {
	// BasicRequest struct capture userID and authToken from the request body
	var request BasicRequest

	// bind JSON request to struct
	if err := c.ShouldBindJSON(&request); err != nil {
		// if bind fails return "400 Bad Request" with an error message
		c.JSON(400, gin.H{
			"success": false,
			"error":   "Invalid request",
		})
		return
	}

	// validate auth token
	valid, err := isAuthTokenValid(c, request.UserID, request.AuthToken)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (1), Please try again later"})
		log.WithField("error", err).Error("[handleLogout] Failed to verify token")
		return
	}

	if !valid {
		c.JSON(400, gin.H{"success": false, "error": "Invalid Credentials"})
		return
	}

	// call getSharedFolders function to fetch folders the user has access to
	// passing gin context directly(?)
	folders, err := getSharedFolders(c, request.UserID)
	if err != nil {
		// if error during the DB query return "500 Internal Server Error"
		c.JSON(500, gin.H{
			"success": false,
			"error":   "Database query failed",
		})
		return
	}

	// success,, return in a JSON response with 200 OK
	c.JSON(200, gin.H{
		"success": true,
		"folders": folders,
	})
}
