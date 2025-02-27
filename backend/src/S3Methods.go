package main

import (
	"context"
	"fmt"
	"io"
	"os"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// Creates an S3 client using the options in settings.yaml
func getS3Client() (*s3.Client, error) {
	if serverConfig.S3AccessKeyID == "" {
		return nil, fmt.Errorf("no S3AccessKeyID in config file")
	}

	if serverConfig.S3AccessKeySecret == "" {
		return nil, fmt.Errorf("no S3AccessKeySecret in config file")
	}

	if serverConfig.S3Endpoint == "" {
		return nil, fmt.Errorf("no S3Endpoint in config file")
	}

	// checsum calculation and validation need to be turned off when using R2
	cfg, err := config.LoadDefaultConfig(context.Background(),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(serverConfig.S3AccessKeyID, serverConfig.S3AccessKeySecret, "")),
		config.WithRegion("auto"), config.WithRequestChecksumCalculation(0), config.WithResponseChecksumValidation(0),
	)

	if err != nil {
		return nil, err
	}

	// Start a new client with the config
	client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(serverConfig.S3Endpoint)
	})

	return client, nil
}

// Get a file from S3 with the specified objKey
// The objKey is the name/id given to the file in S3. It is needed to get the file
func getFile(ctx context.Context, client *s3.Client, bucketName, objKey string) (io.ReadCloser, error) {
	getObjectOutput, err := s3Client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(bucketName),
		Key:    aws.String(objKey),
	})

	if err != nil {
		return nil, fmt.Errorf("getObjectOutput error, %v", err)
	}

	return getObjectOutput.Body, nil

	/*
		// Create a file to write the S3 Object contents to.
		f, err := os.Create(filename)
		if err != nil {
			return nil, fmt.Errorf("failed to create file %q, %v", filename, err)
		}
		// Copy from the reader to new File
		nCopied, err := io.Copy(f, getObjectOutput.Body)
		if err != nil {
			print("Error copying data: ", err)
			return nil, err
		}

		fmt.Printf("file copied, %d bytes\n", nCopied)
		return nil
	*/
}

// Uploads the file at the filePath to the bucket and gives it the specified objKey
// The objKey is the name/id given to the file in S3. It is needed to retrieve the file later
func uploadFile(ctx context.Context, client *s3.Client, bucketName, filePath, objKey string) (*s3.PutObjectOutput, error) {
	// https://github.com/realchandan/pgbackup/blob/1353f1cd131ff338800b69ddb861901e76151691/main.go#L314
	file, err := os.Open(filePath)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	info, err := file.Stat()
	if err != nil {
		return nil, err
	}

	fileSize := info.Size()

	putObjectOutput, err := uploadBytes(ctx, client, bucketName, file, fileSize, objKey)

	if err != nil {
		return nil, err
	}

	return putObjectOutput, nil
}

// Uploads the bytes to the bucket and gives it the specified objKey
// The objKey is the name/id given to the file in S3. It is needed to retrieve the file later
func uploadBytes(ctx context.Context, client *s3.Client, bucketName string, bytes io.Reader, size int64, objKey string) (*s3.PutObjectOutput, error) {
	putObjectOutput, err := client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:        aws.String(bucketName),
		Key:           aws.String(objKey),
		Body:          bytes,
		ContentLength: &size,
	})

	if err != nil {
		return nil, err
	}

	return putObjectOutput, nil
}
