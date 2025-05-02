package main

import (
	"database/sql"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"
)

/*
// This is the main function to test the user search function
func testUserSearch() {
	db.InitDB()
	defer db.DB.Close()

	var userID string
	fmt.Print("Enter userID to search: ")
	fmt.Scanln(&userID)

	user, err := userSearch(db.DB, userID)
	if err != nil {
		log.Println("User not found or error: ", err)
		return
	}

	fmt.Printf("\nUser Found:\n- userID: %s\n- Email: %s\n- Role: %s\n- Created: %s\n",
		user.UserID, user.Email, user.RoleID, user.Created)
}
*/

// This function looks for the userID through queries
func userSearch(conn *sql.DB, userID string) (*User, error) {
	query := `
		SELECT userID, email, roleID, createdDate
		FROM users
		WHERE userID = ?
	`

	var u User
	err := conn.QueryRow(query, userID).Scan(&u.UserID, &u.Email, &u.RoleID, &u.Created)
	if err != nil {
		return nil, err
	}

	return &u, nil
}

func handleGetFriends(c *gin.Context) {
	if c.Request.Body == nil {
		c.JSON(400, gin.H{"success": false, "error": "No data recieved"})
	}
	var request BasicRequest
	err := c.BindJSON(&request)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (0), Please try again later"})
		log.WithField("error", err).Error("[handleGetFriends] Failed to decode JSON")
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
		c.JSON(400, gin.H{"success": false, "error": "Invalid Credentials"})
		return
	}
	// Query accepted friendships
	rows, err := db.Query(`
	SELECT userID1, userID2 FROM user_friends
	WHERE (userID1 = ? OR userID2 = ?) AND request_status = 'Accepted'
`, request.UserID, request.UserID)

	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (2), Please try again later"})
		log.WithField("error", err).Error("[handleGetFriends] DB query failed")
		return
	}
	defer rows.Close()

	friendIDs := []string{}

	for rows.Next() {
		var userID1, userID2 string
		if err := rows.Scan(&userID1, &userID2); err != nil {
			log.WithField("error", err).Error("[handleGetFriends] Failed to scan row")
			continue
		}

		if userID1 == request.UserID {
			friendIDs = append(friendIDs, userID2)
		} else {
			friendIDs = append(friendIDs, userID1)
		}
	}

	c.JSON(200, gin.H{"success": true, "friends": friendIDs})
}

/*
func handleGetPendingFriendRequests(c *gin.Context) {
	if c.Request.Body == nil {
		c.JSON(400, gin.H{"success": false, "error": "No data received"})
		return
	}

	var request AddFriendRequest
	err := c.BindJSON(&request)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (0), Please try again later"})
		log.WithField("error", err).Error("[handleGetPendingFriendRequests] Failed to decode JSON")
		return
	}

	valid, err := isAuthTokenValid(c, request.UserID, request.AuthToken)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (1), Please try again later"})
		log.WithField("error", err).Error("[handleGetPendingFriendRequests] Failed to verify token")
		return
	}
	if !valid {
		c.JSON(400, gin.H{"success": false, "error": "Invalid Credentials"})
		return
	}

	rows, err := db.Query(`
		SELECT userID1
		FROM user_friends
		WHERE userID2 = ? AND request_status = 'pending'
	`, request.UserID)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (2), Please try again later"})
		log.WithField("error", err).Error("[handleGetPendingFriendRequests] Failed to query pending requests")
		return
	}
	defer rows.Close()

	var pendingUsers []string
	for rows.Next() {
		var userID1 string
		if err := rows.Scan(&userID1); err != nil {
			log.WithField("error", err).Error("[handleGetPendingFriendRequests] Failed to scan row")
			continue
		}
		pendingUsers = append(pendingUsers, userID1)
	}

	c.JSON(200, gin.H{"success": true, "pendingRequests": pendingUsers})
}*/

func handleAddFriends(c *gin.Context) {
	if c.Request.Body == nil {
		c.JSON(400, gin.H{"success": false, "error": "No data received"})
		return
	}

	var request AddFriendRequest
	err := c.BindJSON(&request)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (0), Please try again later"})
		log.WithField("error", err).Error("[handleAddFriends] Failed to decode JSON")
		return
	}

	// Verify authentication token
	valid, err := isAuthTokenValid(c, request.UserID, request.AuthToken)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (1), Please try again later"})
		log.WithField("error", err).Error("[handleAddFriends] Failed to verify token")
		return
	}
	if !valid {
		c.JSON(400, gin.H{"success": false, "error": "Invalid Credentials"})
		return
	}

	// Prevent self-friend requests
	if request.UserID == request.ForUserID {
		c.JSON(400, gin.H{"success": false, "error": "Cannot add yourself as a friend"})
		return
	}

	// Check if target user exists
	exists, err := doesUserExist(request.ForUserID)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (2), Please try again later"})
		log.WithField("error", err).Error("[handleAddFriends] Failed check if user exists")
		return
	}
	if !exists {
		c.JSON(404, gin.H{"success": false, "error": "User does not exist"})
		return
	}

	// Check if a friendship already exists
	var count int
	err = db.QueryRow("SELECT COUNT(*) FROM user_friends WHERE (userID1 = ? AND userID2 = ?) OR (userID1 = ? AND userID2 = ?)", request.UserID, request.ForUserID, request.ForUserID, request.UserID).Scan(&count)

	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (2), Please try again later"})
		log.WithField("error", err).Error("[handleAddFriends] Failed to check existing friendship")
		return
	}

	if count > 0 {
		c.JSON(400, gin.H{"success": false, "error": "Friend request already sent or already friends"})
		return
	}

	// Generate a unique friendship ID
	friendshipID, err := getNewID()
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (3), Please try again later"})
		log.WithField("error", err).Error("[handleAddFriends] Failed to generate friendship ID")
		return
	}

	// Insert the new friendship request into the database
	_, err = db.Exec("INSERT INTO user_friends (friendshipID, userID1, userID2, request_status, createdDate) VALUES (?, ?, ?, 'Pending', now())", friendshipID, request.UserID, request.ForUserID)

	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (3), Please try again later"})
		log.WithField("error", err).Error("[handleAddFriends] Failed to insert new friendship")
		return
	}

	// Create an alert for the recipient about the friend request
	// alertDescription := fmt.Sprintf("%s sent you a friend request", request.UserID)
	err = addAlert(c, request.ForUserID, "friendRequest", request.UserID, friendshipID.String())
	if err != nil {
		log.WithField("error", err).Error("[handleAddFriends] Failed to create friend request alert")
		// We don't fail the friend request creation if alert creation fails
	}

	c.JSON(200, gin.H{"success": true, "message": "Friend request sent"})
}

func doesUserExist(userID string) (bool, error) {
	var count int
	err := db.QueryRow("SELECT COUNT(*) FROM users WHERE userID = ?", userID).Scan(&count)
	if err != nil {
		log.WithField("error", err).Error("[doesUserExist] Database query failed")
		return false, err
	}
	return count > 0, nil
}

func handleAcceptFriendRequest(c *gin.Context) {
	if c.Request.Body == nil {
		c.JSON(400, gin.H{"success": false, "error": "No data received"})
		return
	}

	var request AddFriendRequest
	err := c.BindJSON(&request)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (0), Please try again later"})
		log.WithField("error", err).Error("[handleAcceptFriendRequest] Failed to decode JSON")
		return
	}

	// Verify authentication token
	valid, err := isAuthTokenValid(c, request.UserID, request.AuthToken)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (1), Please try again later"})
		log.WithField("error", err).Error("[handleAcceptFriendRequest] Failed to verify token")
		return
	}
	if !valid {
		c.JSON(400, gin.H{"success": false, "error": "Invalid Credentials"})
		return
	}

	log.Infof("Querying friend request: userID1=%s, userID2=%s", request.ForUserID, request.UserID)

	// Check if the friend request exists and is pending
	var status string
	err = db.QueryRow(`
	SELECT request_status FROM user_friends
	WHERE userID1 = ? AND userID2 = ? AND request_status = 'pending'
`, request.ForUserID, request.UserID).Scan(&status)

	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(404, gin.H{"success": false, "error": "No pending friend request found"})
			return
		} else {
			c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (2), Please try again later"})
			log.WithField("error", err).Error("[handleAcceptFriendRequest] Failed to query request")
			return
		}
	}

	// Update the request status to accepted
	_, err = db.Exec(`
		UPDATE user_friends
		SET request_status = 'accepted'
		WHERE userID1 = ? AND userID2 = ? AND request_status = 'pending'
	`, request.ForUserID, request.UserID)

	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (3), Please try again later"})
		log.WithField("error", err).Error("[handleAcceptFriendRequest] Failed to update request status")
		return
	}

	// Create an alert for the sender that their friend request was accepted
	// alertDescription := fmt.Sprintf("%s accepted your friend request", request.UserID)
	err = addAlert(c, request.ForUserID, "friendRequestAccepted", request.UserID, "")
	if err != nil {
		log.WithField("error", err).Error("[handleAcceptFriendRequest] Failed to create acceptance alert")
		// Still return success even if alert creation fails
	}

	c.JSON(200, gin.H{"success": true, "message": "Friend request accepted"})
}
