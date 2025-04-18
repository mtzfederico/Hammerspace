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

func handleGetFriends(c *gin.Context){
	if c.Request.Body == nil {
		c.JSON(400, gin.H{"success": false , "error": "No data recieved"})
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

c.JSON(200, gin.H{"success": true,"friends": friendIDs,})
}

func handleAddFriends(c *gin.Context) {
	if c.Request.Body == nil {
		c.JSON(400, gin.H{"success": false , "error": "No data recieved"})
	}
	var request AddFriendRequest
	err:= c.BindJSON(&request)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (0), Please try again later"})
		log.WithField("error", err).Error("[handleAddFriends] Failed to decode JSON")
		return
	}
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
		return
	}
	if !exists {
		c.JSON(404, gin.H{"success": false, "error": "User does not exist"})
		return
	}

	// Check if a friendship already exists
	var count int
	err = db.QueryRow(`
		SELECT COUNT(*) FROM user_friends
		WHERE (userID1 = ? AND userID2 = ?) OR (userID1 = ? AND userID2 = ?)
	`, request.UserID, request.ForUserID, request.ForUserID, request.UserID).Scan(&count)

	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (2), Please try again later"})
		log.WithField("error", err).Error("[handleAddFriends] Failed to check existing friendship")
		return
	}

	if count > 0 {
		c.JSON(400, gin.H{"success": false, "error": "Friend request already sent or already friends"})
		return
	}

	// Create new friendship request
	friendshipID, err := generateBase64ID(10)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (3), Please try again later"})
		log.WithField("error", err).Error("[handleAddFriends] Failed to generate friendship ID")
		return
	}
	

	_, err = db.Exec(`
		INSERT INTO user_friends (friendshipID, userID1, userID2, request_status, createdDate)
		VALUES (?, ?, ?, 'Pending', now())
	`, friendshipID, request.UserID, request.ForUserID)

	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (3), Please try again later"})
		log.WithField("error", err).Error("[handleAddFriends] Failed to insert new friendship")
		return
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