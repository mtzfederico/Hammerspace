package main

import (
	"context"
	"errors"
	"fmt"
	"os"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"
)

const (
	ReadOnlyPermission = "read"
	WritePermission    = "write"
)

func handleShareFile(c *gin.Context) {
	/*
		curl -X POST "localhost:9090/shareFile" -H 'Content-Type: application/json' -d '{"userID":"testUser","authToken":"K1xS9ehuxeC5tw==","fileID": "0195ddc2-dba1-7b94-acbb-b360f88dd9d6", "withUserID": "anotherTestUser", "isReadOnly": true}'
	*/
	if c.Request.Body == nil {
		c.JSON(400, gin.H{"success": false, "error": "No data received"})
		return
	}

	var request ShareFileRequest
	err := c.BindJSON(&request)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (0)"})
		log.WithField("error", err).Error("[handleShareFile] Failed to decode JSON")
		return
	}

	// verify that the token is valid
	valid, err := isAuthTokenValid(c, request.UserID, request.AuthToken)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (1), Please try again later"})
		log.WithField("error", err).Error("[handleShareFile] Failed to verify token")
		return
	}

	if !valid {
		c.JSON(400, gin.H{"success": false, "error": "Invalid Credentials"})
		return
	}

	// check that file exists and that the user is allowed to share it
	// TODO: Test this. Specially with another user's file
	_, err = getObjectKey(c, request.FileID, request.UserID, false)
	if err != nil {
		if errors.Is(err, errUserAccessNotAllowed) {
			c.JSON(403, gin.H{"success": false, "error": "Operation not allowed"})
			return
		}

		if errors.Is(err, errFileNotFound) {
			c.JSON(400, gin.H{"success": false, "error": "File not found"})
			log.WithFields(log.Fields{"error": err, "fileID": request.FileID}).Debug("[handleGetSharedWith] No file with that fileID found")
			return
		}

		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (2), Please try again later"})
		log.WithField("error", err).Error("[handleShareFile] Failed to if file exists")
		return
	}

	// file exists, check if it is already shared. If it is, check if the permission needs to be changed

	// TODO: Make sure this works
	// sharedFileID is empty if the file is inside of a shared dir. I.E., the user has access to the file because it is inside of a directory/folder that is shared with the user.
	sharedFileID, perm, err := checkFilePermission(c, request.FileID, request.WithUserID)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (3), Please try again later"})
		log.WithField("error", err).Error("[handleShareFile] Failed to check permission")
		return
	}

	log.WithFields(log.Fields{"sharedFileID": sharedFileID, "perm": perm}).Trace("[handleShareFile] got data from checkFilePermission")

	if perm != "" {
		// file is already shared. Either directly or a parentDir is
		if sharedFileID == "" {
			// a parentDir is shared
			if perm == WritePermission {
				if !request.ReadOnly {
					// do nothing
					c.JSON(400, gin.H{"success": false, "error": "User already has write permission via a shared directory"})
					log.Trace("[handleShareFile] File already has write permission from parentDir")
					return
				} else {
					// the file is already fully accesible.
					// Make the file read only
					log.Trace("[handleShareFile] File shared via parentDir, setting file permission from write to read")
				}
			} else {
				// perm is "read"
				if request.ReadOnly {
					// The file is already read-only and the user is sharing it with readOnly permission.
					// Do nothing
					c.JSON(400, gin.H{"success": false, "error": "User already has read-only permission via a shared directory"})
					log.Trace("[handleShareFile] File already has read-only permission from parentDir")
					return
				} else {
					// the file is already readable, owner wants user to be able to modify it
					// Make the file writeable
					log.Trace("[handleShareFile] File shared via parentDir, setting file permission from read to write")
				}
			}

			// add the new file permission
			err = addFilePermission(c, request.FileID, request.WithUserID, request.UserID, request.ReadOnly)
			if err != nil {
				c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (4b), Please try again later"})
				log.WithField("error", err).Error("[handleShareFile] Failed to add more specific permission")
				return
			}

			c.JSON(200, gin.H{"success": true})
			return

		} else {
			// File is shared directly
			switch perm {
			case WritePermission:
				// read and write perm
				if request.ReadOnly {
					// change permission to be read only
					err := changeFilePermission(c, sharedFileID, request.FileID, ReadOnlyPermission)
					if err != nil {
						c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (4c), Please try again later"})
						log.WithField("error", err).Error("[handleShareFile] Failed to change permission")
						return
					}
					c.JSON(200, gin.H{"success": true})
					return
				} else {
					// do nothing
					c.JSON(400, gin.H{"success": false, "error": "File already has write permission"})
					log.Trace("[handleShareFile] File already has write permission")
					return
				}

			case ReadOnlyPermission:
				// read-only perm
				if !request.ReadOnly {
					// change permission to write
					err := changeFilePermission(c, sharedFileID, request.FileID, WritePermission)
					if err != nil {
						c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (4d), Please try again later"})
						log.WithField("error", err).Error("[handleShareFile] Failed to change permission")
						return
					}
					c.JSON(200, gin.H{"success": true})
					return
				} else {
					// do nothing
					c.JSON(400, gin.H{"success": false, "error": "File already has read-only permission"})
					log.Trace("[handleShareFile] File already has read-only permission")
					return
				}
			default:
				// unkown permission value
				c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (5), Please try again later"})
				log.WithFields(log.Fields{"perm": perm}).Error("[handleShareFile] File has unkown permission")
				return
			}
		}
	}

	// File is not shared at all
	err = addFilePermission(c, request.FileID, request.WithUserID, request.UserID, request.ReadOnly)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (7)"})
		log.WithField("error", err).Error("[handleShareFile] Failed to add share to DB")
		return
	}

	// TODO: reencrypt the fKey with the user's publicKey

	// return to the client, the list of publicKeys that have access to the file, get it to encrypt it, and send it back.
	sharedWith := []string{}
	// TODO; work on this
	perms, err := getUsersWithFileAccess(c, request.FileID, 0, nil)

	publicKeys, err := getPublicKeysForUsers(c, sharedWith, request.UserID)

	c.JSON(200, gin.H{"success": true})
}

func handleUpdateFolderKey(c *gin.Context) {
	/*
		Upload file:
			curl -F "userID=testUser" -F "authToken=K1xS9ehuxeC5tw==" -F "parentDir=root" -F "file=@testFile.txt" localhost:9090/uploadFile
	*/

	if c.Request.Body == nil {
		c.JSON(400, gin.H{"success": false, "error": "No data received"})
		return
	}

	userID := c.PostForm("userID")
	authToken := c.PostForm("authToken")
	// parentDir is a UUID for an actual folder. If it is the root/home folder, then it is 'root'
	sharedFolderID := c.PostForm("sharedFolderID")

	if userID == "" || authToken == "" {
		c.JSON(400, gin.H{"success": false, "error": "Authentication Missing"})
		log.Error("[handleUpdateFolderKey] No userID or authToken in request")
		return
	}

	// verify that the token is valid
	valid, err := isAuthTokenValid(c, userID, authToken)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (1), Please try again later"})
		log.WithField("error", err).Error("[handleFileUpload] Failed to verify token")
		return
	}

	if !valid {
		c.JSON(400, gin.H{"success": false, "error": "Invalid Credentials"})
		return
	}

	if sharedFolderID == "" {
		c.JSON(400, gin.H{"success": false, "error": "sharedFolderID Missing"})
		log.Error("[handleUpdateFolderKey] No parentDir in request")
		return
	}

	fmt.Printf("[handleUpdateFolderKey] WARNING: authToken not verified. userID: '%s' authToken: '%s'. parentDir: '%s'\n", userID, authToken, sharedFolderID)

	// Check that parentDir is a valid folder and that the user can create a new directory in that location.
	permission, err := getFolderPermission(c, sharedFolderID, userID, true)
	if err != nil {
		if errors.Is(err, errDirNotFound) {
			c.JSON(400, gin.H{"success": false, "error": "Directory doesn't exist"})
			return
		}

		log.WithField("Error", err).Error("[handleUpdateFolderKey] Error getting parentDir permission")
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (0), Please try again later"})
		return
	}
	if permission != WritePermission {
		c.JSON(403, gin.H{"success": false, "error": "No write permission on directory"})
		return
	}

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (1), Please try again later"})
		log.WithField("Error", err).Error("[handleUpdateFolderKey] Error getting uploaded file")
		return
	}

	log.WithFields(log.Fields{"filename": file.Filename, "size": file.Size, "header": file.Header}).Trace("[handleUpdateFolderKey] Received new fKey")

	filePath := fmt.Sprintf("%s%s_fKey", serverConfig.TMPStorageDir, sharedFolderID)
	err = c.SaveUploadedFile(file, filePath)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (2), Please try again later"})
		log.WithFields(log.Fields{"error": err, "filename": file.Filename, "size": file.Size, "header": file.Header, "filePath": filePath}).Error("[handleUpdateFolderKey] Error saving uploaded file")
		return
	}

	// TODO: somehow validate the file, a user could upload random data and fuck the key up

	objKey := fmt.Sprintf("folderkeys/%s", sharedFolderID)

	file2, err := os.Open(filePath)
	if err != nil {
		c.JSON(400, gin.H{"success": false, "error": "File name is too long"})
		log.Debug("[handleUpdateFolderKey] Filename too long")
		err = os.Remove(filePath)
		if err != nil {
			log.WithError(err).Error("[handleUpdateFolderKey] Failed to delete file after error")
		}
		return
	}
	defer file2.Close()

	_, err = uploadFile(c, s3Client, serverConfig.S3BucketName, file2, objKey)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (3), Please try again later"})
		log.WithFields(log.Fields{"error": err, "filename": file.Filename, "size": file.Size, "header": file.Header, "filePath": filePath}).Error("[handleFihandleUpdateFolderKeyleUpload] Error uploading file")
		return
	}

	c.JSON(200, gin.H{"success": true})
}

// Changes a files permission in the DB
func changeFilePermission(ctx context.Context, sharedFileID, fileID, permission string) error {
	var isReadOnly = (permission == ReadOnlyPermission && permission != WritePermission)
	// fileID is not needed, but it could be a good check to make sure it is the right file
	_, err := db.ExecContext(ctx, "UPDATE sharedFiles SET isReadOnly=? WHERE id=? AND fileID=?", isReadOnly, sharedFileID, fileID)
	return err
}

func addFilePermission(ctx context.Context, fileID string, WithUserIDs []string, fileOwner string, isReadOnly bool) error {
	for _, userID := range WithUserIDs {
		newID, err := getNewID()
		if err != nil {
			return fmt.Errorf("failed to get new ID for shared file: %w", err)
		}

		_, err = db.ExecContext(ctx, "INSERT INTO sharedFiles (id, fileID, userID, fileOwner, isReadOnly, createdDate) VALUES (?, ?, ?, ?, ?, now());", newID, fileID, userID, fileOwner, isReadOnly)

		if err != nil {
			return fmt.Errorf("failed to insert shared file permission for user %s: %w", userID, err)
		}
	}
	return nil
}

// Used to check the permission when a request is sent to share it.
// Only used in handleShareFile.
// sharedFilesID is empty when a parentDir is shared.
// Returns ID from sharedFiles, permission level, error
func checkFilePermission(ctx context.Context, fileID string, withUserIDs []string) (string, string, error) {
	if len(withUserIDs) == 0 {
		return "", "", nil // No users to check
	}

	withUserID := withUserIDs[0] // Only process the first user

	// Check if the file is shared with the first user
	id, permission, err := querySharedFilesTable(ctx, fileID, withUserID)
	if err != nil {
		return "", "", fmt.Errorf("error from querySharedFilesTable for user %s: %w", withUserID, err)
	}

	if permission != "" {
		return id, permission, nil
	}

	// Check if a parentDir is shared with the first user
	permission, err = checkIfParentDirIsShared(ctx, fileID, withUserID, 0)
	if err != nil {
		return "", "", fmt.Errorf("error from checkIfParentDirIsShared for user %s: %w", withUserID, err)
	}

	return "", permission, nil
}

// Checks if the file is shared with the specified userID
// returns a string with the permission: "write", "read", or "" for no permission. and true if the permisison is for the file itself, false if it is for a parentDir
func hasSharedFilePermission(ctx context.Context, fileID, withUserID string) (string, error) {
	// Check if the file is shared
	_, permission, err := querySharedFilesTable(ctx, fileID, withUserID)
	if err != nil {
		return "", fmt.Errorf("error from querySharedFilesTable. %w", err)
	}

	if permission != "" {
		return permission, nil
	}

	// Check if a parentDir is shared
	permission, err = checkIfParentDirIsShared(ctx, fileID, withUserID, 0)
	if err != nil {
		return "", fmt.Errorf("error from checkIfParentDirIsShared. %w", err)
	}

	return permission, nil
}

// Recursively checks if a directory and any of its parent directories are shared with the specified userID.
// Should not be called directly. Use hasSharedFilePermission() or checkFilePermission() instead.
//
// fileID is the id of an item in the files table, it starts with a file and gets called recursively with a dirID.
// callNumber should be set to zero, it gets increased when the function calls itself.
// It returns the permission: "read", "write", or "" for no permission.
func checkIfParentDirIsShared(ctx context.Context, fileID, withUserID string, callNumber int) (string, error) {
	if fileID == "" || fileID == RootDirectoryID {
		// Stop recursion
		// return "", errors.New("root directory reached")
		return "", nil
	}

	parentDir, err := getParentDirID(ctx, fileID)
	if err != nil {
		return "", fmt.Errorf("getParentDirID error. callNumber %d. %w", callNumber, err)
	}

	if parentDir == "" {
		// TODO: Check this
		return "", fmt.Errorf("file not found. callNumber %d", callNumber)
	}

	log.WithFields(log.Fields{"userID": withUserID, "fileID": fileID, "parentDir": parentDir, "callNumber": callNumber}).Trace("[checkIfParentDirIsShared] Got parentDir")

	// Check if the parentDir is in the sharedFiles table
	_, permission, err := querySharedFilesTable(ctx, parentDir, withUserID)
	if err != nil {
		return "", err
	}

	if permission != "" {
		// Found the permission
		return permission, nil
	}

	// Call itself
	callNumber++
	return checkIfParentDirIsShared(ctx, parentDir, withUserID, callNumber)
}

// Checks the sharedFiles table if the fileID is shared with the userID.
//
// It returns the sharedFiles ID, readPermission, error.
// If no items are found, it returns empty values and no error.
func querySharedFilesTable(ctx context.Context, fileID, withUserID string) (string, string, error) {
	rows, err := db.QueryContext(ctx, "select id, isReadOnly from sharedFiles where fileID=? AND userID=?", fileID, withUserID)
	if err != nil {
		return "", "", err
	}

	defer rows.Close()

	if rows.Next() {
		var id string
		var isReadOnly bool
		err := rows.Scan(&id, &isReadOnly)
		if err != nil {
			return "", "", err
		}

		log.WithFields(log.Fields{"userID": withUserID, "isReadOnly": isReadOnly, "fileID": fileID, "id": id}).Trace("[GetSharedFiles] Found sharedFiles record")

		if isReadOnly {
			return id, ReadOnlyPermission, nil
		} else {
			return id, WritePermission, nil
		}
	}

	err = rows.Err()
	if err != nil {
		return "", "", err
	}

	// No rows found
	return "", "", nil
}
