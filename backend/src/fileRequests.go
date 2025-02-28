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
		fmt.Printf("userID %s authToken %s\n", userID,authToken)

	file, err := c.FormFile("file")
	if err != nil {
		log.WithField("Error", err).Error("[handleFileUpload] Error getting uploaded file")
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (0), Please try again later"})
	}

	log.WithFields(log.Fields{"filename": file.Filename, "size": file.Size, "header": file.Header}).Debug("[handleFileUpload] Received file")

	filePath := fmt.Sprintf("%s%s", serverConfig.TMPStorageDir, file.Filename)
	fmt.Printf("Filepath: %s\n", filePath)
	err = c.SaveUploadedFile(file, filePath)
	if err != nil {
		log.WithFields(log.Fields{"error": err, "filename": file.Filename, "size": file.Size, "header": file.Header, "filePath": filePath}).Fatal("[handleFileUpload] Error saving uploaded file")
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (1), Please try again later"})
	}
	c.JSON(200, gin.H{"success": true, "fileName": file.Filename, "bytesUploaded": file.Size})
}

<<<<<<< HEAD
func handleGetFile(c *gin.Context) {

	s3Client, err := getS3Client()
	if err != nil {
		log.Fatal(err)
	}
	file, err := getFile(c, s3Client, "", "")
	if err != nil {
		// TODO
	}

	c.DataFromReader(http.StatusOK, 20, "contentType", file, nil)
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
=======

func handleTesting(c *gin.Context){

	if c.Request.Body == nil {
		c.JSON(400, gin.H{"success": false, "error": "No data received"})
		return
	}
	c.String(200, "Hello WOrld")
}
>>>>>>> aleks_branch
