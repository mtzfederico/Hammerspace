package main

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"os"
	"crypto/rand"
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

func generateFolderKey(ctx context.Context) ([]byte, error) {
	key := make([]byte, 64)

    _, err := rand.Read(key)
    if err != nil {
        // handle error here
		log.WithField("err", err).Error("[generateFolderKey] Error generating random key")
    }
	return key, nil
}

func encryptFolderKeyForUsers(folderKey []byte, publicKeys []string) (map[string][]byte, error) {
	encryptedKeys := make(map[string][]byte)

	if(folderKey == nil || publicKeys == nil) {
		log.WithField("folderKey", folderKey).Error("[encryptFolderKeyForUsers] Error: folder key or public keys are nil")
	}

	for _, pubKey := range publicKeys {
		recipient, err := age.ParseX25519Recipient(pubKey)
		if err != nil {
			return nil, fmt.Errorf("invalid public key: %w", err)
		}

		var buf bytes.Buffer
		wc, err := age.Encrypt(&buf, recipient)
		if err != nil {
			return nil, fmt.Errorf("failed to initialize age encryption: %w", err)
		}

		_, err = wc.Write(folderKey)
		if err != nil {
			return nil, fmt.Errorf("failed to write folder key: %w", err)
		}

		if err := wc.Close(); err != nil {
			return nil, fmt.Errorf("failed to close age writer: %w", err)
		}

		encryptedKeys[pubKey] = buf.Bytes()
	}

	return encryptedKeys, nil
}


func uploadEncryptedFolderKey(ctx context.Context, s3Client *s3.Client, encryptedKey []byte, folderID string, userPublicKey string) error {
	// S3 object key format (customize as needed)
	objKey := fmt.Sprintf("folderkeys/%s/%s.age", folderID, userPublicKey)

	// Wrap encryptedKey []byte in a reader
	reader := bytes.NewReader(encryptedKey)

	// Upload
	_, err := uploadBytes(ctx, s3Client, serverConfig.S3BucketName, reader, int64(len(encryptedKey)), objKey)
	if err != nil {
		return fmt.Errorf("failed to upload encrypted key to S3: %w", err)
	}

	return nil
}