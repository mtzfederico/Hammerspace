package main

import (
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

	c.JSON(200, gin.H{"success": true, "fileName": file.Filename, "bytesUploaded": file.Size, "fileID": fileID})
}

// Handles a request to get a file fom S3
func handleGetFile(c *gin.Context) {
	if c.Request.Body == nil {
		c.JSON(400, gin.H{"success": false, "error": "No data received"})
		return
	}

	var request GetDirectoryRequest
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
		log.WithField("error", err).Error("[handleLogout] Failed to verify token")
		return
	}

	if !valid {
		c.JSON(400, gin.H{"success": false, "error": "Invalid authToken"})
		return
	}

	// TODO: check that file exists, and the user has access to it, and get the s3 objKey
	objKey := "SomeKey"

	file, err := getFile(c, s3Client, serverConfig.S3BucketName, objKey)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (1)"})
		log.WithField("error", err).Error("[handleGetFile] Failed to get file from S3")
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
