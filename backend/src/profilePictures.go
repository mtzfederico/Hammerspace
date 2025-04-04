package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"
)

func handleGetProfilePicture(c *gin.Context) {
	/*
		curl -X POST "localhost:9090/getProfilePicture" -H 'Content-Type: application/json' -d '{"userID":"testUser","authToken":"K1xS9ehuxeC5tw==","forUserID": "testUser"}' --verbose --remote-header-name -O
	*/
	if c.Request.Body == nil {
		c.JSON(400, gin.H{"success": false, "error": "No data received"})
		return
	}

	var request GetProfilePictureRequest
	err := c.BindJSON(&request)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (0)"})
		log.WithField("error", err).Error("[handleGetProfilePicture] Failed to decode JSON")
		return
	}

	// verify that the token is valid
	valid, err := isAuthTokenValid(c, request.UserID, request.AuthToken)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (1), Please try again later"})
		log.WithField("error", err).Error("[handleGetProfilePicture] Failed to verify token")
		return
	}

	if !valid {
		c.JSON(400, gin.H{"success": false, "error": "Invalid Credentials"})
		return
	}

	profilePictureID, err := getProfilePictureIDFromDB(c, request.ForUserID)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (2), Please try again later"})
		log.WithField("error", err).Error("[handleGetProfilePicture] Error getting profilePictureID from DB")
		return
	}

	log.WithFields(log.Fields{"userID": request.UserID, "ForUserID": request.ForUserID, "profilePictureID": profilePictureID}).Trace("[handleGetProfilePicture] Got data from DB")

	if profilePictureID == "" {
		c.JSON(400, gin.H{"success": false, "error": "No profile picture found"})
		log.Trace("[handleGetProfilePicture] No profile picture found")
	}

	// Get the MIME Subtype from the ID. It is added to the end after a dot
	partsOfID := strings.Split(profilePictureID, ".")
	if len(partsOfID) != 2 {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (3), Please try again later"})
		log.WithField("profilePictureID", profilePictureID).Error("[handleGetProfilePicture] ID doesn't contain two parts")
		return
	}

	file, err := getFile(c, s3Client, serverConfig.S3BucketName, profilePictureID)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (4), Please try again later"})
		log.WithField("error", err).Error("[handleGetProfilePicture] Failed to get file")
		return
	}

	filename := fmt.Sprintf("attachment; filename=\"%s\"", profilePictureID)
	// https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Disposition
	extraHeaders := map[string]string{"Content-Disposition": filename, "Cache-Control": "public, max-age=604800"}
	contentType := fmt.Sprintf("image/%s", partsOfID[1])
	c.DataFromReader(http.StatusOK, int64(*file.ContentLength), contentType, file.Body, extraHeaders)
}

func handleUpdateProfilePicture(c *gin.Context) {
	/*
		curl -F "userID=testUser" -F "authToken=K1xS9ehuxeC5tw==" -F "file=@profilePicture.jpeg" localhost:9090/updateProfilePicture
	*/
	if c.Request.Body == nil {
		c.JSON(400, gin.H{"success": false, "error": "No data received"})
		return
	}

	userID := c.PostForm("userID")
	authToken := c.PostForm("authToken")
	if userID == "" || authToken == "" {
		c.JSON(400, gin.H{"success": false, "error": "Authentication Missing"})
		log.Error("[handleUpdateProfilePicture] No userID or authToken in request")
		return
	}

	// verify that the token is valid
	valid, err := isAuthTokenValid(c, userID, authToken)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (0), Please try again later"})
		log.WithField("error", err).Error("[handleUpdateProfilePicture] Failed to verify token")
		return
	}

	if !valid {
		c.JSON(400, gin.H{"success": false, "error": "Invalid Credentials"})
		return
	}

	profilePictureID, err := getNewID()
	if err != nil {
		log.WithFields(log.Fields{"error": err}).Error("[handleUpdateProfilePicture] Failed to get a new file ID")
	}

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (1), Please try again later"})
		log.WithField("Error", err).Error("[handleUpdateProfilePicture] Error getting uploaded file")
		return
	}

	// limit file size to 2 Megabytes. It is still a lot and should be lowered
	if file.Size > 2_000_000 {
		c.JSON(500, gin.H{"success": false, "error": "Image file too big"})
		log.WithField("size", file.Size).Debug("[handleUpdateProfilePicture] Image file too big")
		return
	}

	log.WithFields(log.Fields{"filename": file.Filename, "size": file.Size, "header": file.Header}).Debug("[handleUpdateProfilePicture] Received file")
	contentType := file.Header.Get("Content-Type")

	filePath := fmt.Sprintf("%s%s", serverConfig.TMPStorageDir, profilePictureID)
	fmt.Printf("Filepath: %s\n", filePath)
	err = c.SaveUploadedFile(file, filePath)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (2), Please try again later"})
		log.WithFields(log.Fields{"error": err, "filename": file.Filename, "size": file.Size, "header": file.Header, "filePath": filePath}).Error("[handleUpdateProfilePicture] Error saving uploaded file")
		return
	}

	fmt.Printf("Content Type: %s\n", contentType)

	// get the old profilePictureID to delete it from S3
	OLDProfilePictureID, err := getProfilePictureIDFromDB(c, userID)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (3), Please try again later"})
		log.WithField("error", err).Error("[handleGetProfilePicture] Error getting profilePictureID from DB")
		return
	}

	err = processProfilePicture(c, filePath, profilePictureID.String(), userID)
	if err != nil {
		if errors.Is(err, errUnknownFileType) {
			c.JSON(400, gin.H{"success": false, "error": "Invalid file type uploaded"})
			return
		}

		if errors.Is(err, errFileIsNotAnImg) {
			c.JSON(400, gin.H{"success": false, "error": "The file uploaded is not an image"})
			return
		}

		if errors.Is(err, errUnsuportedImgType) {
			c.JSON(400, gin.H{"success": false, "error": "The image uploaded is is an unsoported image format"})
			return
		}

		// return data here
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (4), Please try again later"})
		log.WithField("err", err).Error("[handleUpdateProfilePicture] Error processing file")
		return
	}

	c.JSON(200, gin.H{"success": true, "fileName": file.Filename, "bytesUploaded": file.Size, "profilePictureID": profilePictureID})

	// delete the old profilePicture from S3
	if OLDProfilePictureID != "" {
		res, err := deleteFile(context.Background(), s3Client, serverConfig.S3BucketName, OLDProfilePictureID)
		if err != nil {
			log.WithFields(log.Fields{"err": err, "OLDProfilePictureID": OLDProfilePictureID, "res": res}).Error("[handleUpdateProfilePicture] Error deleting old profile picture")
		}
	}
}

// gets a user's profilePictureID from the DB.
// if the user doesn't have a profile picture, it returns an empty string.
func getProfilePictureIDFromDB(ctx context.Context, userID string) (string, error) {
	rows, err := db.QueryContext(ctx, "select IFNULL(profilePictureID, '') from users where userID=?", userID)
	if err != nil {
		return "", fmt.Errorf("db query error. %w", err)
	}

	defer rows.Close()

	if rows.Next() {
		var profilePictureID string
		err := rows.Scan(&profilePictureID)
		if err != nil {
			return "", fmt.Errorf("failed to scan profilePictureID. %w", err)
		}
		return profilePictureID, nil
	} else {
		err = rows.Err()
		if err != nil {
			return "", fmt.Errorf("failed to get profilePictureID. %w", err)
		}
	}

	// User not found
	return "", nil
}
