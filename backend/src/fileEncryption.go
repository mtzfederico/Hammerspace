package main

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"os"

	"github.com/aws/aws-sdk-go-v2/service/s3"
	log "github.com/sirupsen/logrus"

	"filippo.io/age"
	"database/sql"
)

// Encrpts the file at the specified path and uploads it to S3 with the specified object key
// Missing way of specifing the publicKeys
func encryptAndUploadFile(ctx context.Context, filePath, s3ObjKey string,  fileID string) (*s3.PutObjectOutput, error) {
	// get file
	fileIn, err := os.Open(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to open file %q. %w", filePath, err)
	}
	defer fileIn.Close()

	// get public keys
	recipients, err := getPublicKeys(ctx, fileID)
	if err != nil {
		return nil, err
	}

	// encrypt
	encryptedData := &bytes.Buffer{}
	// variadic function
	// https://go.dev/ref/spec#Passing_arguments_to_..._parameters
	// https://gobyexample.com/variadic-functions
	ageWriter, err := age.Encrypt(encryptedData, recipients...)
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