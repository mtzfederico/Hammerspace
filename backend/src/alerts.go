package main

import (
	"context"
	"errors"
	"fmt"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"
)

var (
	// No alert with the particular ID for the userID specified was found in the DB error
	errAlertNotFound error = errors.New("alert not found")
)

func handleGetAlerts(c *gin.Context) {
	/*
		curl -X POST "localhost:9090/getAlerts" -H 'Content-Type: application/json' -d '{"userID":"testUser","authToken":"K1xS9ehuxeC5tw=="}'
	*/
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
		log.WithField("error", err).Error("[handleGetAlerts] Failed to get alerts")
		return
	}

	c.JSON(200, gin.H{"success": true, "alerts": alerts})
}

func handleRemoveAlert(c *gin.Context) {
	/*
		curl -X POST "localhost:9090/removeAlert" -H 'Content-Type: application/json' -d '{"userID":"testUser","authToken":"K1xS9ehuxeC5tw==","alertID":"0195d945-f799-7e9a-a3cd-fc0a92365006"}'
	*/
	if c.Request.Body == nil {
		c.JSON(400, gin.H{"success": false, "error": "No data received"})
		return
	}

	var request RemoveAlertRequest
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

	if request.AlertID == "" {
		c.JSON(400, gin.H{"success": false, "error": "AlertID Missing"})
		return
	}

	err = removeAlert(c, request.AlertID, request.UserID)
	if err != nil {
		if errors.Is(err, errAlertNotFound) {
			c.JSON(400, gin.H{"success": false, "error": "No alert with that ID was found"})
			return
		}

		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (2), Please try again later"})
		log.WithField("error", err).Error("[handleGetAlerts] Failed to verify token")
		return
	}

	c.JSON(200, gin.H{"success": true})
}

// Returns a list with all of the alerts for the specified userID
func getAlerts(ctx context.Context, userID string) ([]Alert, error) {
	rows, err := db.QueryContext(ctx, "select id, alertType, dataPrimary, IFNULL(dataSecondary, ''), createdDate from activeAlerts where userID=?", userID)
	if err != nil {
		return nil, err
	}

	defer rows.Close()

	// Initialize an empty array so that the json returns an empty array instead of null. {"alerts":null,"success":true} --> {"alerts":[],"success":true}
	var alerts []Alert = []Alert{}
	for rows.Next() {
		var alert Alert
		err := rows.Scan(&alert.ID, &alert.AlertType, &alert.DataPrimary, &alert.DataSecondary, &alert.CreatedDate)
		if err != nil {
			return nil, err
		}

		alerts = append(alerts, alert)
	}

	return alerts, nil
}

// adds an alert for the specified userID with the specified values
func addAlert(ctx context.Context, userID, alertType, dataPrimary, dataSecondary string) error {
	alertID, err := getNewID()
	if err != nil {
		return fmt.Errorf("failed to get a new ID. %w", err)
	}
	_, err = db.ExecContext(ctx, "INSERT INTO activeAlerts (id, userID, alertType, dataPrimary, dataSecondary, createdDate) VALUES (?, ?, ?, ?, ?, now());", alertID, userID, alertType, dataPrimary, dataSecondary)
	return err
}

// removes an alert with a specific alertID for a userID
func removeAlert(ctx context.Context, alertID, userID string) error {
	res, err := db.ExecContext(ctx, "DELETE FROM activeAlerts WHERE id = ? AND userID = ?;", alertID, userID)
	if err != nil {
		return err
	}

	n, err := res.RowsAffected()
	if err != nil {
		return err
	}

	fmt.Printf("rows affected: %v\n", n)
	if n == 0 {
		// No items were modified, I.E., no alert found.
		return errAlertNotFound
	}

	return nil
}
