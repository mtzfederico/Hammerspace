package main

import (
	"database/sql"
	"fmt"
	"log"

	"github.com/hammerspace/db"
)

// This is the main function to test the user search function
func main() {
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
