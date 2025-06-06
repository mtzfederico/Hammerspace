package main

import (
	"database/sql"
	"fmt"
	"log"
	"time"
)

// This is the test function
func testUserFriendRequest() {
	var currentUser string
	fmt.Print("Enter your userID: ")
	fmt.Scanln(&currentUser)

	fmt.Println("1. Send friend request")
	fmt.Println("2. View friend list")
	fmt.Println("3. Accept friend request")
	fmt.Println("4. Decline friend request")
	var choice int
	fmt.Scanln(&choice)

	switch choice {
	case 1:
		var targetUser string
		fmt.Print("Enter the userID of the person you'd like to add: ")
		fmt.Scanln(&targetUser)
		err := sendFriendRequest(db, currentUser, targetUser)
		if err != nil {
			log.Println("Error sending request:", err)
		} else {
			fmt.Println("Friend request sent.")
		}
	case 2:
		friends, err := getFriendList(db, currentUser)
		if err != nil {
			log.Println("Error retrieving friend list:", err)
			return
		}
		if len(friends) == 0 {
			fmt.Println("You have no friends added yet.")
		} else {
			fmt.Println("Your friends:")
			for _, f := range friends {
				fmt.Println("- " + f)
			}
		}
	case 3:
		handleFriendRequestAction(db, currentUser, true)
	case 4:
		handleFriendRequestAction(db, currentUser, false)
	default:
		fmt.Println("Invalid choice.")
	}
}

// This is the function to send friend request
func sendFriendRequest(dbConn *sql.DB, userID, friendID string) error {
	id, err := getNewID()
	if err != nil {
		return err
	}
	_, err = dbConn.Exec("INSERT INTO user_friends (id, userID, friendID, status, createdDate) VALUES (?, ?, ?, 'pending', ?)",
		id.String(), userID, friendID, time.Now().Format("2006-01-02 15:04:05"))
	return err
}

// This is the function for user to view thier friends list
func getFriendList(dbConn *sql.DB, userID string) ([]string, error) {
	rows, err := dbConn.Query(`
		SELECT friendID FROM user_friends 
		WHERE userID = ? AND status = 'accepted'
		UNION
		SELECT userID FROM user_friends 
		WHERE friendID = ? AND status = 'accepted'`, userID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var friends []string
	for rows.Next() {
		var f string
		if err := rows.Scan(&f); err != nil {
			return nil, err
		}
		friends = append(friends, f)
	}
	return friends, nil
}

// This is the function for pending request
func getPendingRequests(dbConn *sql.DB, userID string) ([]string, error) {
	rows, err := dbConn.Query(`
		SELECT userID FROM user_friends 
		WHERE friendID = ? AND status = 'pending'`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var requests []string
	for rows.Next() {
		var sender string
		if err := rows.Scan(&sender); err != nil {
			return nil, err
		}
		requests = append(requests, sender)
	}
	return requests, nil
}

// This is the function for user to accept friend request
func acceptFriendRequest(dbConn *sql.DB, fromUserID, currentUserID string) error {
	_, err := dbConn.Exec(`
		UPDATE user_friends 
		SET status = 'accepted' 
		WHERE userID = ? AND friendID = ? AND status = 'pending'`,
		fromUserID, currentUserID)
	return err
}

// This is the function for user to decline friend request
func declineFriendRequest(dbConn *sql.DB, fromUserID, currentUserID string) error {
	_, err := dbConn.Exec(`
		DELETE FROM user_friends 
		WHERE userID = ? AND friendID = ? AND status = 'pending'`,
		fromUserID, currentUserID)
	return err
}

// This is the function that handles a suer's friend requests
func handleFriendRequestAction(dbConn *sql.DB, currentUser string, accept bool) {
	requests, err := getPendingRequests(dbConn, currentUser)
	if err != nil {
		log.Println("Error retrieving requests:", err)
		return
	}
	if len(requests) == 0 {
		fmt.Println("No pending friend requests.")
		return
	}

	fmt.Println("Pending friend requests:")
	for i, r := range requests {
		fmt.Printf("%d. %s\n", i+1, r)
	}
	var selection int
	fmt.Print("Enter the number of the request to process: ")
	fmt.Scanln(&selection)

	if selection < 1 || selection > len(requests) {
		fmt.Println("Invalid selection.")
		return
	}

	fromUser := requests[selection-1]
	if accept {
		err = acceptFriendRequest(dbConn, fromUser, currentUser)
		if err == nil {
			fmt.Println("Friend request accepted.")
		}
	} else {
		err = declineFriendRequest(dbConn, fromUser, currentUser)
		if err == nil {
			fmt.Println("Friend request declined.")
		}
	}
	if err != nil {
		log.Println("Error processing request:", err)
	}
}
