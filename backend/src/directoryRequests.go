package main

import (
	"os"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"
)

func handleGetDirectory(c *gin.Context) {
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
		c.JSON(400, gin.H{"success": false, "error": "Invalid authToken"})
		return
	}

	// Query DB

	// Return json
}

// When a folder and thus everything inside is deleted
func handleRemoveFolder(c *gin.Context) {
	// Auth

	// Query DB

	// Return json
}

// When a whole directory is shared
func handleShareDirectory(c *gin.Context) {
	// Auth

	// Query DB

	// Return json
}

// Handles the requests to create a folder
func handleCreateFolder(c *gin.Context) {
	if c.Request.Body == nil {
		c.JSON(400, gin.H{"success": false, "error": "No data received"})
		return
	}

	var request CreateFolderRequest
	err := c.BindJSON(&request)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (0)"})
		log.WithField("error", err).Error("[handleFolderUpload] Failed to decode JSON")
		return
	}

	dirPath := request.DirName // You might want to add path validation/sanitization here

	//we will not be using os.Mkdir for the final version
	err = os.Mkdir(dirPath, 0755)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (0)"})
		log.WithField("error", err).Error("[Mkdir]] Failed to create a directory")
		return
	}
	c.JSON(200, gin.H{"success": true, "message": "Folder created  successfully"})
}
