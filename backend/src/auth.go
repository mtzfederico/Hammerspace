package main

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"net/mail"

	"strings"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"
	"golang.org/x/crypto/bcrypt"
)

const (
	MinUserLength     int    = 5
	MaxUserLength     int    = 30
	MinPasswordLength int    = 5
	MaxPasswordLength int    = 30
	MinUserIDLength   int    = 5
	MaxUserIDLength   int    = 14
	DefaultRoleID     string = "user"
	// The cost that bcrypt uses to hash passwords. This is a good explanation of what the cost is https://stackoverflow.com/a/25586134.
	// 14 is overkill for most laptops and very basic servers. Use https://github.com/mtzfederico/bcrypt-cost-benchmark to get a good value for the system running this code.
	BcryptHashCost int = 14
	// The characters that are allowed to be in a userID
	AllowedUserIDCharacters string = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456689.-_"
)

func handleLogin(c *gin.Context) {
	if c.Request.Body == nil {
		c.JSON(400, gin.H{"success": false, "error": "No data received"})
		return
	}

	var loginData LoginRequest
	err := c.BindJSON(&loginData)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (0), Please try again later"})
		log.WithField("error", err).Error("[handleLogin] Failed to decode JSON")
		return
	}

	valid, err := isPasswordCorrect(c, loginData.UserID, loginData.Password)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (1), Please try again later"})
		log.WithField("error", err).Error("[handleLogin] Failed to verify credentials")
		return
	}

	if !valid {
		c.JSON(400, gin.H{"success": false, "error": "UserID and/or password is wrong"})
		return
	}

	// generate an authentication token
	token, err := generateAuthToken(c, loginData.UserID)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (2), Please try again later"})
		log.WithField("error", err).Error("[handleLogin] Failed to generate authToken")
		return
	}

	c.JSON(200, gin.H{"success": true, "userID": loginData.UserID, "authToken": token})
}

func handleLogout(c *gin.Context) {
	if c.Request.Body == nil {
		c.JSON(400, gin.H{"success": false, "error": "No data received"})
		return
	}

	var request BasicRequest
	err := c.BindJSON(&request)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (0), Please try again later"})
		log.WithField("error", err).Error("[handleLogout] Failed to decode JSON")
		return
	}

	// verify that the token is valid
	valid, err := isAuthTokenValid(c, request.UserID, request.AuthToken)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (1), Please try again later"})
		log.WithField("error", err).Error("[handleLogout] Failed to verify token")
		return
	}

	if !valid {
		c.JSON(400, gin.H{"success": false, "error": "Invalid authToken"})
		return
	}

	// remoe the token
	err = removeAuthToken(c, request.UserID, request.AuthToken)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (2), Please try again later"})
		log.WithField("error", err).Error("[handleLogout] Failed to remove token")
		return
	}
	log.WithField("UserID", request.UserID).Trace("[handleLogout] Removed authToken")
	c.JSON(200, gin.H{"success": true})
}

func handleSignup(c *gin.Context) {
	if c.Request.Body == nil {
		c.JSON(400, gin.H{"success": false, "error": "No data received"})
		return
	}

	var signupData SignupRequest
	err := c.BindJSON(&signupData)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (0)"})
		log.WithField("error", err).Error("[handleSignup] Failed to decode JSON")
		return
	}

	if !isEmailValid(signupData.Email) {
		c.JSON(500, gin.H{"success": false, "error": "Invalid email address"})
		return
	}

	if !isUserIDValid(signupData.UserID) {
		c.JSON(500, gin.H{"success": false, "error": "Invalid UserID"})
		return
	}

	if !isValidPassword(signupData.Password) {
		c.JSON(500, gin.H{"success": false, "error": "Password must be between 5 and 30 characters long"})
		return
	}

	// Data is valid, add to DB
	err = createAccount(c, signupData.UserID, signupData.Email, signupData.Password)

	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Error creating account, Please try again later"})
		log.WithField("error", err).Error("[handleSignup] Failed to create account")
		return
	}

	token, err := generateAuthToken(c, signupData.UserID)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (2), Please try again later"})
		log.WithField("error", err).Error("[handleLogin] Failed to generate authToken")
		return
	}

	c.JSON(200, gin.H{"success": true , "userID": signupData.UserID, "authToken": token})
}

func handleChangePassword(c *gin.Context) {
	if c.Request.Body == nil {
		c.JSON(400, gin.H{"success": false, "error": "No data received"})
		return
	}

	var request ChangePassRequest
	err := c.BindJSON(&request)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (0), Please try again later"})
		log.WithField("error", err).Error("[handleChangePassword] Failed to decode JSON")
		return
	}

	// verify that the token is valid
	valid, err := isAuthTokenValid(c, request.UserID, request.AuthToken)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (1), Please try again later"})
		log.WithField("error", err).Error("[handleChangePassword] Failed to verify token")
		return
	}

	if !valid {
		c.JSON(400, gin.H{"success": false, "error": "Invalid authToken"})
		return
	}

	valid, err = isPasswordCorrect(c, request.UserID, request.CurrentPassword)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (1), Please try again later"})
		log.WithField("error", err).Error("[handleChangePassword] Failed to verify credentials")
		return
	}

	if !valid {
		c.JSON(200, gin.H{"success": false, "error": "Current password is wrong"})
		return
	}

	if !isValidPassword(request.NewPassword) {
		c.JSON(500, gin.H{"success": false, "error": "New password must be between 5 and 30 characters long"})
		return
	}

	err = changePassword(c, request.UserID, request.NewPassword)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (2), Please try again later"})
		log.WithField("error", err).Error("[handleChangePassword] Failed to change password")
	}

	c.JSON(200, gin.H{"success": true})
}

// Endpoint methods end

func isEmailValid(email string) bool {
	// https://stackoverflow.com/questions/66624011/how-to-validate-an-email-address-in-golang
	_, err := mail.ParseAddress(email)
	return err == nil
}

func isUserIDValid(userID string) bool {
	// TODO: check that userID is unique
	len := len(userID)
	if !(len >= MinUserIDLength && len <= MaxUserIDLength) {
		return false
	}

	return !strings.ContainsFunc(userID, func(r rune) bool {
		// return true if an any of the characters in userID is not in AllowedUserIDCharacters
		return !strings.ContainsRune(AllowedUserIDCharacters, r)
	})
}

// It checks that the password is valid, it doesn't check if it is correct. For that use isPasswordCorrect()
func isValidPassword(password string) bool {
	// TODO: This could be improved with checks for characters
	passLen := len(password)
	return passLen >= MinPasswordLength && passLen <= MaxPasswordLength
}

// Checks if the password is correct for the userID specified
func isPasswordCorrect(ctx context.Context, userID string, password string) (bool, error) {
	if !isValidPassword(password) {
		return false, nil
	}

	rows, err := db.QueryContext(ctx, "select password from users where userID=?;", userID)
	if err != nil {
		return false, err
	}

	defer rows.Close()

	if rows.Next() {
		var hash []byte
		err := rows.Scan(&hash)
		if err != nil {
			if err == sql.ErrNoRows {
				return false, nil
			}
			return false, err
		}

		err = bcrypt.CompareHashAndPassword(hash, []byte(password))
		if err != nil {
			if err == bcrypt.ErrMismatchedHashAndPassword {
				return false, nil
			}
			return false, err
		} else {
			return true, nil
		}
	}

	err = rows.Err()
	if err != nil {
		return false, err
	}

	return false, nil
}

func isAuthTokenValid(ctx context.Context, userID string, token string) (bool, error) {
	log.WithFields(log.Fields{"userID": userID, "token": token}).Trace("[isAuthTokenValid] Checking token")
	rows, err := db.QueryContext(ctx, "select count(*) as count from authTokens where userID=? AND tokenID=?", userID, token)
	if err != nil {
		return false, err
	}

	defer rows.Close()

	if rows.Next() {
		var count int
		err := rows.Scan(&count)
		if err != nil {
			return false, err
		}

		log.WithFields(log.Fields{"userID": userID, "token": token, "count": count}).Trace("[isAuthTokenValid]")
		return (count == 1), nil
	}

	err = rows.Err()
	if err != nil {
		if err == sql.ErrNoRows {
			return false, nil
		}
		return false, err
	}

	return false, nil
}

// Generates an authToken.
// Returns the token and nil on success and an empty string and an error if there is an issue
func generateAuthToken(ctx context.Context, userID string) (string, error) {
	authToken, err := generateBase64ID(10)
	if err != nil {
		return "", err
	}

	rows, err := db.QueryContext(ctx, "SELECT COUNT(*) FROM authTokens WHERE userID=? AND tokenID=?;", userID, authToken)
	if err != nil {
		return "", err
	}

	if rows.Next() {
		var count int
		rows.Scan(&count)
		if count != 0 {
			log.Debug("[generateAuthToken] authToken already in DB. Generating another one.")
			return generateAuthToken(ctx, userID)
		}
	} else {
		err = rows.Err()
		if err != nil {
			return "", err
		}
	}

	log.WithField("userID", userID).Debug("[generateAuthToken] Generated authToken")

	// store it on the DB
	_, err = db.ExecContext(ctx, "INSERT INTO authTokens (tokenID, userID, loginDate) VALUES (?, ?, now());", authToken, userID)
	return authToken, err
}

// Removes the authToken from the DB. It verifies that the authToken is for the specified user.
func removeAuthToken(ctx context.Context, userID string, authToken string) error {
	_, err := db.ExecContext(ctx, "DELETE FROM authTokens WHERE userID=? AND tokenID=?;", userID, authToken)
	return err
}

// Adds the new account to the DB
func createAccount(ctx context.Context, userID string, email string, newPass string) error {
	// https://stackoverflow.com/questions/5881169/what-column-type-length-should-i-use-for-storing-a-bcrypt-hashed-password-in-a-d
	newPassHashed, err := bcrypt.GenerateFromPassword([]byte(newPass), BcryptHashCost)
	if err != nil {
		return err
	}

	log.Debug("creating account")
	_, err = db.ExecContext(ctx, "INSERT INTO users (userID, email, password, roleID, createdDate) VALUES (?, ?, ?, ?, now());", userID, email, newPassHashed, DefaultRoleID)
	return err
}

// Changes the users password. newPass is the password in plaintext. This function hashes the password.
func changePassword(ctx context.Context, userID string, newPass string) error {
	newPassHashed, err := bcrypt.GenerateFromPassword([]byte(newPass), BcryptHashCost)
	if err != nil {
		return err
	}

	log.WithField("newPassHashed", string(newPassHashed)).Trace("[changePassword] pass hashed")

	_, err = db.ExecContext(ctx, "UPDATE users SET password=? WHERE userID=?", newPassHashed, userID)
	return err
}

// Generate a random base64 url encoded string
// https://medium.com/@jcox250/generating-prefixed-base64-ids-in-golang-e7731bd89c1b
func generateBase64ID(size int) (string, error) {
	b := make([]byte, size)
	_, err := rand.Read(b)
	if err != nil {
		return "", err
	}
	// Encode our bytes as a base64 encoded string using URLEncoding
	encoded := base64.URLEncoding.EncodeToString(b)
	return encoded, nil
}

// https://gowebexamples.com/password-hashing/
