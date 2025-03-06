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
)

// Encrpts the file at the specified path and uploads it to S3 with the specified object key
// Missing way of specifing the publicKeys
func encryptAndUploadFile(filePath, s3ObjKey string) (*s3.PutObjectOutput, error) {
	// get file
	fileIn, err := os.Open(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to open file %q. %w", filePath, err)
	}
	defer fileIn.Close()

	// get public keys
	recipients, err := getPublicKeys()
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
		return nil, err
	}

	n, err := io.Copy(ageWriter, fileIn)
	if err != nil {
		return nil, err
	}
	err = ageWriter.Close()
	if err != nil {
		return nil, err
	}

	log.WithField("bytesEncrypted", n).Trace("[encryptFile] Encrypted file")

	// age --decrypt -i "/Users/FedeMtz/Downloads/testing-age-key copy.txt" testImage-0.png.age > out-testImage-0.png
	// upload file
	res, err := uploadBytes(context.Background(), s3Client, serverConfig.S3BucketName, encryptedData, int64(encryptedData.Len()), s3ObjKey)
	if err != nil {
		return nil, err
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

func getPublicKeys() ([]age.Recipient, error) {
	var recipients []age.Recipient
	publicKey := "age1pkl3nxgdqlfe35g6x96spkvqf0ru8me2nhp5vcqeg5p5wthmuerqss6agj"
	recipient, err := age.ParseX25519Recipient(publicKey)
	recipients = append(recipients, recipient)
	return recipients, err
}
