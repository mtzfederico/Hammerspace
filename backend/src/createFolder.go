package main

import (
	"os"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"
)

// Handles the requests to uplooad files to the server
func handleFolderUpload(c *gin.Context) {
	if c.Request.Body == nil {
		c.JSON(400, gin.H{"success": false, "error": "No data received"})
		return
	}

	var request FolderRequest
    err := c.BindJSON(&request)
	 if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (0)"})
	log.WithField("error", err).Error("[handleFolderUpload] Failed to decode JSON")
	return
	 }
    
	dirPath := request.DirName // You might want to add path validation/sanitization here

	//we will not be using os.Mkdir for the final version
	   
	os.Mkdir(dirPath, 0755)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (0)"})
	log.WithField("error", err).Error("[Mkdir]] Failed to create a directory")
	return
	}
	c.JSON(200, gin.H{"success": true, "message": "Folder created  successfully"})
    
    

}