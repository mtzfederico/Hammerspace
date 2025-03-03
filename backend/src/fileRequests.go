package main

import (
	"context"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	log "github.com/sirupsen/logrus"
)

// Handles the requests to uplooad files to the server
func handleFileUpload(c *gin.Context) {
	/*
		Login first:
			curl --header "Content-Type: application/json" --data '{"userID":"testUser","password":"testPassword123"}' "http://localhost:9090/login"
		Upload file:
			curl -F "userID=testUser" -F "authToken=K1xS9ehuxeC5tw==" -F "file=@testFile.txt" localhost:9090/uploadFile
	*/

	if c.Request.Body == nil {
		c.JSON(400, gin.H{"success": false, "error": "No data received"})
		return
	}

	userID := c.PostForm("userID")
	authToken := c.PostForm("authToken")
	// parentDir is a UUID for an actual folder. If it is the root/home folder, then it is 'root'
	parentDir := c.PostForm("parentDir")
	// Commented to simplify testing, it works
	/*
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
			c.JSON(400, gin.H{"success": false, "error": "Invalid authToken"})
			return
		}
	*/

	// TODO: check that parentDir is valid and that the user can create a new directory in that location

	fmt.Printf("userID %s authToken %s\n", userID, authToken)

	fileID, err := getNewFileID()
	if err != nil {
		log.WithFields(log.Fields{"error": err}).Error("[handleFileUpload] Failed to get a new file ID")
	}

	file, err := c.FormFile("file")
	if err != nil {
		log.WithField("Error", err).Error("[handleFileUpload] Error getting uploaded file")
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (0), Please try again later"})
	}

	log.WithFields(log.Fields{"filename": file.Filename, "size": file.Size, "header": file.Header}).Debug("[handleFileUpload] Received file")
	contentType := file.Header.Get("Content-Type")

	// filePath := fmt.Sprintf("%s%s", serverConfig.TMPStorageDir, file.Filename)
	filePath := fmt.Sprintf("%s%s", serverConfig.TMPStorageDir, fileID)
	fmt.Printf("Filepath: %s\n", filePath)
	err = c.SaveUploadedFile(file, filePath)
	if err != nil {
		log.WithFields(log.Fields{"error": err, "filename": file.Filename, "size": file.Size, "header": file.Header, "filePath": filePath}).Fatal("[handleFileUpload] Error saving uploaded file")
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (1), Please try again later"})
	}

	// add file to db with fileName as the name, contentType as type, and processed = false
	fmt.Printf("Content Type: %s\n", contentType)
	err = saveFileToDB(c, fileID.String(), parentDir, file.Filename, userID, contentType, int(file.Size))
	if err != nil {
		log.WithFields(log.Fields{"error": err, "filename": file.Filename, "size": file.Size, "header": file.Header, "filePath": filePath}).Fatal("[handleFileUpload] Error saving uploaded file")
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (2), Please try again later"})
	}

	c.JSON(200, gin.H{"success": true, "fileName": file.Filename, "bytesUploaded": file.Size, "fileID": fileID})
}

// Handles a request to get a file fom S3
func handleGetFile(c *gin.Context) {
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
		c.JSON(400, gin.H{"success": false, "error": "Invalid authToken"})
		return
	}

	// TODO: check that file exists, and the user has access to it, and get the s3 objKey
	objKey, err := getObjectKey(c, request.FileID, request.UserID)
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
	c.DataFromReader(http.StatusOK, int64(*file.ContentLength), "application/vnd.age", file.Body, nil)
}

func handleRemoveFile(c *gin.Context) {
	// Auth

	// Query DB

	// Return json
}

// When an individual file is shared
func handleShareFile(c *gin.Context) {
	// Auth

	// Query DB

	// Return json
}

// ---------------------------------------------------------------------------

func getObjectKey(ctx context.Context, fileID string, userID string) (string, error) {
	rows, err := db.QueryContext(ctx, "select userID, objKey from files where id=?", fileID)
	if err != nil {
		return "", err
	}

	defer rows.Close()

	for rows.Next() {
		var fileOwnerUserID, objKey string
		err := rows.Scan(&fileOwnerUserID, &objKey)
		if err != nil {
			/*
				if err == sql.ErrNoRows {
					return "", nil
				}
			*/
			return "", err
		}

		log.WithFields(log.Fields{"userID": userID, "fileOwnerUserID": fileOwnerUserID, "fileID": fileID}).Trace("[isAuthTokenValid]")

		if userID != fileOwnerUserID {
			// check sharedFiles table
			permission, err := hasSharedFilePermission(ctx, fileID, userID)
			if err != nil {
				return "", err
			}
			if permission == "" {
				return "", fmt.Errorf("user doesn't have access to item")
			}
		}
		// The user has access to this item
		return objKey, nil
	}

	// This should probably never be reached
	return "", fmt.Errorf("file not found")
}

// Checks if the file is shared with the specified userID
// returns a string with the permission: "write" or "read"
func hasSharedFilePermission(ctx context.Context, fileID, withUserID string) (string, error) {
	rows, err := db.QueryContext(ctx, "select isReadOnly from sharedFiles where fileID=? AND userID=?", fileID, withUserID)
	if err != nil {
		return "", err
	}

	defer rows.Close()

	for rows.Next() {
		var isReadOnly bool
		err := rows.Scan(&isReadOnly)
		if err != nil {
			/*
				if err == sql.ErrNoRows {
					return "", nil
				}
			*/
			return "", err
		}

		log.WithFields(log.Fields{"userID": withUserID, "isReadOnly": isReadOnly, "fileID": fileID}).Trace("[isAuthTokenValid]")

		if isReadOnly {
			return "read", nil
		} else {
			return "write", nil
		}
	}

	return "", fmt.Errorf("")
}

func saveFileToDB(ctx context.Context, fileID, parentDir, fileName, ownerUserID, fileType string, size int) error {
	_, err := db.ExecContext(ctx, "INSERT INTO files (id, parentDir, name, type, size, userID, processed, createdDate) VALUES (?, ?, ?, ?, ?, ?, false, now());", fileID, parentDir, fileName, fileType, size, ownerUserID)
	return err
}

// Returns a new v7 UUID.
// id, err := getNewFileID()
// id.String() to get it as a string " xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
func getNewFileID() (uuid.UUID, error) {
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
