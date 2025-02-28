package main

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"os"

	log "github.com/sirupsen/logrus"

	"filippo.io/age"
)

func encryptAndUploadFile(filePath, s3ObjKey string) error {
	// get file
	fileIn, err := os.Open(filePath)
	if err != nil {
		return fmt.Errorf("failed to open file %q. %v", filePath, err)
	}
	defer fileIn.Close()

	// get public keys
	recipient, err := getPublicKeys()
	if err != nil {
		return err
	}

	// encrypt
	encryptedData := &bytes.Buffer{}
	ageWriter, err := age.Encrypt(encryptedData, recipient)
	if err != nil {
		return err
	}

	n, err := io.Copy(ageWriter, fileIn)
	if err != nil {
		return err
	}
	err = ageWriter.Close()
	if err != nil {
		return err
	}

	log.WithField("bytesEncrypted", n).Trace("[encryptFile] Encrypted file")

	// age --decrypt -i "/Users/FedeMtz/Downloads/testing-age-key copy.txt" testImage-0.png.age > out-testImage-0.png

	// upload file
	res, err := uploadBytes(context.Background(), s3Client, serverConfig.S3BucketName, encryptedData, int64(encryptedData.Len()), s3ObjKey)
	if err != nil {
		return err
	}

	fmt.Print("[encryptFile] result: ")
	fmt.Println(res)

	return nil
}

func getPublicKeys() (*age.X25519Recipient, error) {
	publicKey := "age1pkl3nxgdqlfe35g6x96spkvqf0ru8me2nhp5vcqeg5p5wthmuerqss6agj"
	recipient, err := age.ParseX25519Recipient(publicKey)
	return recipient, err
}
