package main

import (
	"context"
	"errors"
	"fmt"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"
)

var (
	errDirNotFound error = errors.New("dirNotFound")
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
		c.JSON(400, gin.H{"success": false, "error": "Invalid authToken"})
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

// When a director and thus everything inside is deleted
func handleRemoveDirectory(c *gin.Context) {
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
		log.WithField("error", err).Error("[handleFolderUpload] Failed to decode JSON")
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

	// TODO: Check that the user can create a new directory in that location

	dirID, err := getNewFileID()
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (1)"})
		log.WithField("error", err).Error("[handleCreateDirectory] Failed to get new fileID")
		return
	}

	err = addDirectoryToDB(c, dirID.String(), request.ParentDir, request.DirName, request.UserID)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (2)"})
		log.WithField("error", err).Error("[handleCreateDirectory] Failed to create a directory")
		return
	}

	c.JSON(200, gin.H{"success": true, "message": "Folder created  successfully"})
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

func getParentDirID(ctx context.Context, dirID string) (string, error) {
	if dirID == "root" {
		return "", nil
	}

	rows, err := db.QueryContext(ctx, "select parentDir from files where id=? AND type='folder'", dirID)
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
			log.WithField("dirID", dirID).Warn("[getParentDirID] No rows and no error")
			return "", errDirNotFound
		}
	}

	return parentDir, nil
}
