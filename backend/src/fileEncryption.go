package main

import (
	"bytes"
	"context"
	"database/sql"
	"fmt"
	"io"
	"os"

	"filippo.io/age"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"
)

// Encrpts the file at the specified path and uploads it to S3 with the specified object key
// Missing way of specifing the publicKeys
func encryptAndUploadFile(ctx context.Context, filePath, s3ObjKey string, fileID string, parentDir string) (*s3.PutObjectOutput, error) {
	// get file
	fileIn, err := os.Open(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to open file %q. %w", filePath, err)
	}
	defer fileIn.Close()

	// Get the public key associated with the parent folder
	publicKey, err := getPublicKeyForFolder(ctx, parentDir, 0)
	if err != nil {
		return nil, fmt.Errorf("failed to get public key for folder %s: %w", parentDir, err)
	}

	// Parse the public key into an age recipient
	recipients, err := age.ParseX25519Recipient(publicKey)
	if err != nil {
		return nil, fmt.Errorf("failed to parse public key: %w", err)
	}

	// encrypt
	encryptedData := &bytes.Buffer{}
	// variadic function
	// https://go.dev/ref/spec#Passing_arguments_to_..._parameters
	// https://gobyexample.com/variadic-functions
	ageWriter, err := age.Encrypt(encryptedData, []age.Recipient{recipients}...)
	if err != nil {
		return nil, fmt.Errorf("failed to start encrypting the file: %w", err)
	}

	n, err := io.Copy(ageWriter, fileIn)
	if err != nil {
		return nil, fmt.Errorf("failed to encrypt the file : %w", err)
	}
	err = ageWriter.Close()
	if err != nil {
		return nil, fmt.Errorf("failed to close the ageWriter: %w", err)
	}

	log.WithField("bytesEncrypted", n).Trace("[encryptFile] Encrypted file")

	// age --decrypt -i "/Users/FedeMtz/Downloads/testing-age-key copy.txt" testImage-0.png.age > out-testImage-0.png
	// upload file
	res, err := uploadBytes(ctx, s3Client, serverConfig.S3BucketName, encryptedData, int64(encryptedData.Len()), s3ObjKey)
	if err != nil {
		return nil, fmt.Errorf("failed to upload the file: %w", err)
	}

	return res, err
	// Example Usage:
	/*
		filePath := "tmp/testImage-0.png"
		parts := strings.Split(filePath, "/tmp/")
		newFilename := parts[len(parts)-1] + ".age"
		res, err = encryptAndUploadFile(filePath, newFilename)
		if err != nil {
			fmt.Printf("[main] encryptFile error: ")
			fmt.Println(err)
		}
		fmt.Print("result: ")
		fmt.Println(res)
	*/
}

func getPublicKeys(ctx context.Context, fileID string) ([]age.Recipient, error) {
	var recipients []age.Recipient

	userID, err := getUserIDFromFileID(ctx, fileID)
	if err != nil {
		return nil, fmt.Errorf("failed to get userID from fileID: %w", err)
	}

	publicKey, err := getPublicKeyForUser(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get public key for userID %s: %w", userID, err)
	}

	recipient, err := age.ParseX25519Recipient(publicKey)
	if err != nil {
		return nil, fmt.Errorf("failed to parse public key: %w", err)
	}

	recipients = append(recipients, recipient)
	return recipients, nil
}

func getUserIDFromFileID(ctx context.Context, fileID string) (string, error) {
	var userID string
	query := `SELECT userID FROM files WHERE id = ? LIMIT 1`
	err := db.QueryRowContext(ctx, query, fileID).Scan(&userID)
	if err != nil {
		if err == sql.ErrNoRows {
			return "", fmt.Errorf("no file found with ID %s", fileID)
		}
		return "", err
	}
	return userID, nil
}

func getPublicKeyForUser(ctx context.Context, userID string) (string, error) {
	var publicKey string
	query := `SELECT publicKey FROM encryptionKeys WHERE userID = ? LIMIT 1`

	err := db.QueryRowContext(ctx, query, userID).Scan(&publicKey)
	if err != nil {
		if err == sql.ErrNoRows {
			return "", fmt.Errorf("no public key found for userID %s", userID)
		}
		return "", err
	}

	return publicKey, nil
}

func generateFolderKey(ctx context.Context) (*age.X25519Identity, *age.X25519Recipient, error) {
	identity, err := age.GenerateX25519Identity()
	if err != nil {
		return nil, nil, fmt.Errorf("failed to generate age identity: %w", err)
	}
	privateKey := identity
	publicKey := identity.Recipient()

	return privateKey, publicKey, err
}

func encryptFolderKeyForUsers(folderKey []byte, publicKeys []string) ([]byte, error) {
	if folderKey == nil || publicKeys == nil {
		log.WithFields(log.Fields{
			"folderKey":  folderKey,
			"publicKeys": publicKeys,
		}).Error("[encryptFolderKeyForUsers] Error: folder key or public keys are nil")
		return nil, fmt.Errorf("folder key or public keys are nil")
	}

	// Convert string public keys to age recipients
	var recipients []age.Recipient
	for _, pubKey := range publicKeys {
		recipient, err := age.ParseX25519Recipient(pubKey)
		if err != nil {
			log.WithField("pubKey", pubKey).WithError(err).Error("[encryptFolderKeyForUsers] Invalid public key")
			return nil, fmt.Errorf("invalid public key: %w", err)
		}
		recipients = append(recipients, recipient)
	}

	// Encrypt the folder key in-memory
	encryptedData := &bytes.Buffer{}

	ageWriter, err := age.Encrypt(encryptedData, recipients...)
	if err != nil {
		return nil, fmt.Errorf("failed to start encrypting the folder key: %w", err)
	}

	_, err = ageWriter.Write(folderKey)
	if err != nil {
		return nil, fmt.Errorf("failed to write folder key: %w", err)
	}

	err = ageWriter.Close()
	if err != nil {
		return nil, fmt.Errorf("failed to close age writer: %w", err)
	}

	log.WithField("keyLength", len(encryptedData.Bytes())).Trace("[encryptFolderKeyForUsers] Folder key encrypted")

	return encryptedData.Bytes(), nil
}

func uploadEncryptedFolderKey(ctx context.Context, s3Client *s3.Client, encryptedKey []byte, folderID string) error {
	// S3 object key format (customize as needed)
	objKey := fmt.Sprintf("folderkeys/%s", folderID)

	// Wrap encryptedKey []byte in a reader
	reader := bytes.NewReader(encryptedKey)

	// Upload
	_, err := uploadBytes(ctx, s3Client, serverConfig.S3BucketName, reader, int64(len(encryptedKey)), objKey)
	if err != nil {
		return fmt.Errorf("failed to upload encrypted key to S3: %w", err)
	}

	return nil
}

func handleGetFolderKey(c *gin.Context) {
	if c.Request.Body == nil {
		c.JSON(400, gin.H{"error": "Request body is empty"})
		return
	}
	var request GetFolderKeyRequest
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
		c.JSON(400, gin.H{"success": false, "error": "Invalid Credentials"})
		return
	}
	// the S3 object key for this folder
	objKey := fmt.Sprintf("folderkeys/%s", request.FolderID)

	file, err := getFile(c, s3Client, serverConfig.S3BucketName, objKey)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "error": "Internal Server Error (3)"})
		log.WithField("error", err).Error("[handleGetEncryptedFolderKey] Failed to get key from S3")
		return
	}

	// https://www.iana.org/assignments/media-types/application/vnd.age
	// asumming that all files returned are encrypted with age

	// https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control
	extraHeaders := map[string]string{"Cache-Control": "private"}
	c.DataFromReader(200, int64(*file.ContentLength), "application/vnd.age", file.Body, extraHeaders)
}

// callNumber is increased in recursive calls, set it to zero.
func getPublicKeyForFolder(ctx context.Context, folderID string, callNumber int) (string, error) {
	// 10 might break folders inside folders inside folders
	if callNumber > 10 {
		return "", fmt.Errorf("called more than 10 times")
	}
	// Query to get the public key for the folder from the encryptionKeys table
	var publicKey string
	err := db.QueryRowContext(ctx, "SELECT publicKey FROM encryptionKeys WHERE folderID = ? LIMIT 1", folderID).Scan(&publicKey)
	if err != nil {
		if err == sql.ErrNoRows {
			parentDir, err := getParentDirID(ctx, folderID)
			if err != nil {
				return "", fmt.Errorf("error getting parentDirID: %w", err)
			}
			callNumber++
			return getPublicKeyForFolder(ctx, parentDir, callNumber)
		}
		return "", fmt.Errorf("failed to fetch public key: %w", err)
	}
	return publicKey, nil
}
