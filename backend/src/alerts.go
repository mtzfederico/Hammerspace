package main

import (
	"context"
	"fmt"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"
)

func handleGetAlerts(c *gin.Context) {
	if c.Request.Body == nil {
		c.JSON(400, gin.H{"success": false, "error": "No data received"})
		return
	}

	var request BasicRequest
	err := c.BindJSON(&request)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (0)"})
		log.WithField("error", err).Error("[handleGetAlerts] Failed to decode JSON")
		return
	}

	// verify that the token is valid
	valid, err := isAuthTokenValid(c, request.UserID, request.AuthToken)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (1), Please try again later"})
		log.WithField("error", err).Error("[handleGetAlerts] Failed to verify token")
		return
	}

	if !valid {
		c.JSON(400, gin.H{"success": false, "error": "Invalid Credentials"})
		return
	}

	// Query DB
	alerts, err := getAlerts(c, request.UserID)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (2), Please try again later"})
		log.WithField("error", err).Error("[handleGetAlerts] Failed to verify token")
		return
	}

	c.JSON(200, gin.H{"success": true, "alerts": alerts})
}

// Returns a list with all of the alerts for the specified userID
func getAlerts(ctx context.Context, userID string) ([]Alert, error) {
	rows, err := db.QueryContext(ctx, "select id, description, fileID, fileOwner, createdDate from activeAlerts where userID=?", userID)
	if err != nil {
		return nil, err
	}

	defer rows.Close()

	var alerts []Alert
	for rows.Next() {
		var alert Alert
		err := rows.Scan(&alert.ID, &alert.Description, &alert.FileID, &alert.FileOwner, &alert.CreatedDate)
		if err != nil {
			return nil, err
		}

		alerts = append(alerts, alert)
	}

	return alerts, errFileNotFound
}

// adds an alert for the specified userID with the specified values
func addAlert(ctx context.Context, userID, description, fileID, fileOwner string) error {
	alertID, err := getNewFileID()
	if err != nil {
		return fmt.Errorf("failed to get a new ID. %w", err)
	}
	_, err = db.ExecContext(ctx, "INSERT INTO activeAlerts (id, userID, description, fileID, fileOwner, createdDate) VALUES (?, ?, ?, ?, ?, now());", alertID, userID, description, fileID, fileOwner)
	return err
}

// removes an alert with a specific alertID for a userID
func removeAlert(ctx context.Context, alertID, userID string) error {
	// TODO: make sure both values are not empty
	_, err := db.ExecContext(ctx, "REMOVE FROM activeAlerts WHERE id = ? AND userID = ?;", alertID, userID)

	return err
}
