package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	log "github.com/sirupsen/logrus"
)

var (
	// User doesn't have access to item error
	errUserAccessNotAllowed error = errors.New("user doesn't have access to item")
	// File not found in the files DB error
	errFileNotFound error = errors.New("file not found")
)

// Handles the requests to uplooad files to the server
func handleFileUpload(c *gin.Context) {
	/*
		Login first:
			curl --header "Content-Type: application/json" --data '{"userID":"testUser","password":"testPassword123"}' "http://localhost:9090/login"
		Upload file:
			curl -F "userID=testUser" -F "authToken=K1xS9ehuxeC5tw==" -F "parentDir=root" -F "file=@testFile.txt" localhost:9090/uploadFile

			curl -F "userID=testUser" -F "authToken=K1xS9ehuxeC5tw==" -F "parentDir=root" -F "file=@testImage-0.png" localhost:9090/uploadFile
	*/

	if c.Request.Body == nil {
		c.JSON(400, gin.H{"success": false, "error": "No data received"})
		return
	}

	userID := c.PostForm("userID")
	authToken := c.PostForm("authToken")
	// parentDir is a UUID for an actual folder. If it is the root/home folder, then it is 'root'
	parentDir := c.PostForm("parentDir")

	if userID == "" || authToken == "" {
		c.JSON(400, gin.H{"success": false, "error": "Authentication Missing"})
		log.Error("[handleFileUpload] No userID or authToken in request")
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

	if parentDir == "" {
		c.JSON(400, gin.H{"success": false, "error": "parentDir Missing"})
		log.Error("[handleFileUpload] No parentDir in request")
		return
	}

	fmt.Printf("[handleFileUpload] WARNING: authToken not verified. userID: '%s' authToken: '%s'. parentDir: '%s'\n", userID, authToken, parentDir)

	// Check that parentDir is a valid folder and that the user can create a new directory in that location.
	permission, err := getFolderPermission(c, parentDir, userID, true)
	if err != nil {
		if errors.Is(err, errDirNotFound) {
			c.JSON(400, gin.H{"success": false, "error": "Parent Directory doesn't exist"})
			return
		}

		log.WithField("Error", err).Error("[handleFileUpload] Error getting parentDir permission")
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (0), Please try again later"})
		return
	}
	if permission != WritePermission {
		c.JSON(403, gin.H{"success": false, "error": "No write permission on Parent Directory"})
		return
	}

	fileID, err := getNewID()
	if err != nil {
		log.WithFields(log.Fields{"error": err}).Error("[handleFileUpload] Failed to get a new file ID")
	}

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (1), Please try again later"})
		log.WithField("Error", err).Error("[handleFileUpload] Error getting uploaded file")
		return
	}

	log.WithFields(log.Fields{"filename": file.Filename, "size": file.Size, "header": file.Header}).Debug("[handleFileUpload] Received file")
	contentType := file.Header.Get("Content-Type")

	// filePath := fmt.Sprintf("%s%s", serverConfig.TMPStorageDir, file.Filename)
	filePath := fmt.Sprintf("%s%s", serverConfig.TMPStorageDir, fileID)
	fmt.Printf("Filepath: %s\n", filePath)
	err = c.SaveUploadedFile(file, filePath)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (2), Please try again later"})
		log.WithFields(log.Fields{"error": err, "filename": file.Filename, "size": file.Size, "header": file.Header, "filePath": filePath}).Error("[handleFileUpload] Error saving uploaded file")
		return
	}

	// add file to db with fileName as the name, contentType as type, and processed = false
	fmt.Printf("Content Type: %s\n", contentType)
	err = saveFileToDB(c, fileID.String(), parentDir, file.Filename, userID, contentType, int(file.Size))
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (3), Please try again later"})
		log.WithFields(log.Fields{"error": err, "filename": file.Filename, "size": file.Size, "header": file.Header, "filePath": filePath}).Error("[handleFileUpload] Error adding uploaded file to DB")
		return
	}

	// Start processing the file here
	expectedMIMEType := file.Header.Get("Content-Type")
	err = processFile(context.Background(), filePath, fileID.String(), expectedMIMEType)
	if err != nil {
		log.WithField("err", err).Error("[handleFileUpload] Error processing file")
	}

	c.JSON(200, gin.H{"success": true, "fileName": file.Filename, "bytesUploaded": file.Size, "fileID": fileID})
}

// Handles a request to get a file fom S3
func handleGetFile(c *gin.Context) {
	/*
		curl -X POST "localhost:9090/getFile" -H 'Content-Type: application/json' -d '{"userID":"testUser","authToken":"K1xS9ehuxeC5tw==","fileID": "01955f82-7409-7cfc-a6ab-af5a70ca5897"}'
	*/

	if c.Request.Body == nil {
		c.JSON(400, gin.H{"success": false, "error": "No data received"})
		return
	}

	var request GetFileRequest
	err := c.BindJSON(&request)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (0)"})
		log.WithField("error", err).Error("[handleGetFile] Failed to decode JSON")
		return
	}

	// verify that the token is valid
	valid, err := isAuthTokenValid(c, request.UserID, request.AuthToken)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (1), Please try again later"})
		log.WithField("error", err).Error("[handleGetFile] Failed to verify token")
		return
	}

	if !valid {
		c.JSON(400, gin.H{"success": false, "error": "Invalid Credentials"})
		return
	}

	// check that file exists, and the user has access to it, and get the s3 objKey
	objKey, err := getObjectKey(c, request.FileID, request.UserID, true)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (1), Please try again later"})
		log.WithField("error", err).Error("[handleGetFile] Failed to get object key")
		return
	}

	file, err := getFile(c, s3Client, serverConfig.S3BucketName, objKey)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (1)"})
		log.WithField("error", err).Error("[handleGetFile] Failed to get file")
		return
	}

	// https://www.iana.org/assignments/media-types/application/vnd.age
	// asumming that all files returned are encrypted with age

	// https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control
	extraHeaders := map[string]string{"Cache-Control": "private"}
	c.DataFromReader(http.StatusOK, int64(*file.ContentLength), "application/vnd.age", file.Body, extraHeaders)
}

func handleRemoveFile(c *gin.Context) {
	if c.Request.Body == nil {
		c.JSON(400, gin.H{"success": false, "error": "No data received"})
		return
	}

	var request GetFileRequest
	err := c.BindJSON(&request)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (0)"})
		log.WithField("error", err).Error("[handleRemoveFile] Failed to decode JSON")
		return
	}

	// verify that the token is valid
	valid, err := isAuthTokenValid(c, request.UserID, request.AuthToken)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (1), Please try again later"})
		log.WithField("error", err).Error("[handleRemoveFile] Failed to verify token")
		return
	}

	if !valid {
		c.JSON(400, gin.H{"success": false, "error": "Invalid Credentials"})
		return
	}

	// Query DB
	objKey, err := getObjectKey(c, request.FileID, request.UserID, false)
	if err != nil {
		if errors.Is(err, errUserAccessNotAllowed) {
			// User is not the owner and can't delete it
			c.JSON(403, gin.H{"success": false, "error": "Operation not allowed"})
			log.WithField("error", err).Debug("[handleRemoveFile] User tried to delete file without proper permission")
			return
		}
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (2), Please try again later"})
		log.WithField("error", err).Error("[handleRemoveFile] Failed to verify token")
		return
	}

	_, err = deleteFile(c, s3Client, serverConfig.S3BucketName, objKey)
	if err != nil {
		// handle the error
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (3), Please try again later"})
		log.WithField("error", err).Error("[handleRemoveFile] Failed to verify token")
		return
	}

	// remove from DB
	err = removeFileFromDB(c, request.FileID, request.UserID)
	if err != nil {
		// handle the error
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (4), Please try again later"})
		log.WithField("error", err).Error("[handleRemoveFile] Failed to delete file from DB")
		return
	}

	c.JSON(200, gin.H{"success": true, "fileID": request.FileID})
}

// ---------------------------------------------------------------------------

// Checks that the file actually exists and returns the objKey used in s3.
// allowShared is used to allow checking if the file is shared with the user, it is used for things things that require the user to own the file.
// When it is false, the sharedFiles DB will not be checked.
//
// Errors Returned:
// If the file exists but the user doesn't have access, the error errUserAccessNotAllowed is returned.
// If the file doesn't exist (or if the id is for a folder) it returns errFileNotFound.
func getObjectKey(ctx context.Context, fileID string, userID string, allowShared bool) (string, error) {
	// https://www.w3schools.com/sql/func_mysql_ifnull.asp
	// objKey can be null, but go doesn't support strings set to null/nil. If the value is null, it is set to an empty string.
	rows, err := db.QueryContext(ctx, "select userID, IFNULL(objKey, '') from files where id=? AND type!='folder'", fileID)
	if err != nil {
		return "", err
	}

	defer rows.Close()

	if rows.Next() {
		var fileOwnerUserID, objKey string
		err := rows.Scan(&fileOwnerUserID, &objKey)
		if err != nil {
			return "", err
		}

		log.WithFields(log.Fields{"userID": userID, "fileOwnerUserID": fileOwnerUserID, "fileID": fileID}).Trace("[getObjectKey]")

		if userID != fileOwnerUserID {
			// If the user doesn't own the file, check if they have access to it
			if !allowShared {
				return "", errUserAccessNotAllowed
			}
			// check sharedFiles table
			permission, err := hasSharedFilePermission(ctx, fileID, userID)
			if err != nil {
				return "", fmt.Errorf("hasSharedFilePermission error. %w", err)
			}
			if permission == "" {
				return "", errUserAccessNotAllowed
			}
		}
		// The user has access to this item
		return objKey, nil
	}

	// This should probably never be reached
	return "", errFileNotFound
}

func saveFileToDB(ctx context.Context, fileID, parentDir, fileName, ownerUserID, fileType string, size int) error {
	_, err := db.ExecContext(ctx, "INSERT INTO files (id, parentDir, name, type, size, userID, processed, createdDate) VALUES (?, ?, ?, ?, ?, ?, false, now());", fileID, parentDir, fileName, fileType, size, ownerUserID)
	return err
}

func removeFileFromDB(ctx context.Context, fileID, userID string) error {
	_, err := db.ExecContext(ctx, "DELETE FROM files WHERE id=?, userID=?) VALUES (?, ?);", fileID, userID)
	return err
}

// Returns a new v7 UUID.
// id, err := getNewID()
// id.String() to get it as a string " xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
func getNewID() (uuid.UUID, error) {
	// another option: https://planetscale.com/blog/why-we-chose-nanoids-for-planetscales-api
	id, err := uuid.NewV7()
	return id, err
}

/*
func getMIMEType(extension string) string {
	// https://developer.mozilla.org/en-US/docs/Web/HTTP/MIME_types#important_mime_types_for_web_developers
	// https://developer.mozilla.org/en-US/docs/Web/HTTP/MIME_types/Common_types
	// https://en.wikipedia.org/wiki/Media_type
	switch extension {
	case "age":
		// https://www.iana.org/assignments/media-types/application/vnd.age
		return "application/vnd.age"
	case "txt":
		return "text/plain"
	case "png":
		return "image/png"
	case "jpg", "jpeg":
		return "image/jpeg"
	case "pdf":
		return "application/pdf"
	case "mp4":
		return "video/mp4"
	default:
		return "application/octet-stream"
	}
}
*/
