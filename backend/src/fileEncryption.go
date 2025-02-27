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

func encryptFile(filePath string) error {
	// get file
	fileIn, err := os.Open(filePath)
	if err != nil {
		return fmt.Errorf("failed to open file %q. %v", filePath, err)
	}

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

	log.WithField("bytesEncrypted", n).Trace("[encryptFile] Encrypted file")

	// save file
	size := (encryptedData.Cap() - encryptedData.Available())
	fmt.Printf("size: %d\n", size)
	res, err := uploadBytes(context.Background(), s3Client, serverConfig.S3BucketName, encryptedData, int64(encryptedData.Len()), "superSecretTestFile.txt.age")
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

/*
func testEncryption() error {
	publicKey := "age1pkl3nxgdqlfe35g6x96spkvqf0ru8me2nhp5vcqeg5p5wthmuerqss6agj"
	recipient, err := age.ParseX25519Recipient(publicKey)
	if err != nil {
		log.Fatalf("Failed to parse public key %q: %v", publicKey, err)
	}

	// Create a file to write the contents to
	filename := "../tmp/testFile.age"
	f, err := os.Create(filename)
	if err != nil {
		return fmt.Errorf("failed to create file %q, %v", filename, err)
	}

	// out := &bytes.Buffer{}

	w, err := age.Encrypt(f, recipient)
	if err != nil {
		log.Fatalf("Failed to create encrypted file: %v", err)
	}
	if _, err := io.WriteString(w, "Very very secret message."); err != nil {
		log.Fatalf("Failed to write to encrypted file: %v", err)
	}
	if err := w.Close(); err != nil {
		log.Fatalf("Failed to close encrypted file: %v", err)
	}

	info, err := f.Stat()
	if err != nil {
		return err
	}

	fileSize := info.Size()

	fmt.Printf("Encrypted file size: %d\n", fileSize)

		// fmt.Printf("Encrypted file size: %d\n", out.Len())
		//
		// Copy from the reader to new File
		// nCopied, err := io.Copy(f, out)
		// if err != nil {
		//	   print("Error copying data: ", err)
		//	   return err
		// }

		fmt.Printf("file copied, %d bytes\n", nCopied)

	// size := int64(out.Len())
	// fmt.Printf("File size: %v\n", size)
	_, err = f.Seek(0, 0)
	if err != nil {
		return err
	}

	result, err := uploadBytes(context.TODO(), s3Client, serverConfig.S3BucketName, f, fileSize, "testAgeFile2")
	//result, err := uploadFile(context.TODO(), s3Client, serverConfig.S3BucketName, filename, "testAgeFile1")
	if err != nil {
		return err
	}
	fmt.Print("uploadFile result: ", result)
	fmt.Println()
	return nil
}
*/
