package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"slices"

	log "github.com/sirupsen/logrus"

	"github.com/h2non/filetype"
)

var (
	errUnknownFileType error = errors.New("unknown file type")
	// Error for a file that is not an image
	errFileIsNotAnImg error = errors.New("the file is not an image")
	// Error for unsuported image file type
	errUnsuportedImgType error = errors.New("the image file format is not supported")
	// A list of the suported image types for a profile picture
	supportedImageTypes = []string{"jpeg", "jp2", "png", "gif"}
	// A list of the file types that the filetype library can't recognize that are ok to be assumed to be safe.
	excemptedFileTypes = []string{"text/plain", "application/xml", "text/xml"}
)

func processFile(ctx context.Context, filePath, fileID, expectedMIMEType string, parentDir, userID string) error {
	buf, err := os.ReadFile(filePath)
	if err != nil {
		return fmt.Errorf("failed to open the file: %w", err)
	}

	// Inspect the file
	// TODO: Make sure this works
	kind, err := filetype.Match(buf)
	if err != nil {
		return fmt.Errorf("failed to get the fileType: %w", err)
	}
	if kind != filetype.Unknown {
		fmt.Printf("File type: %s. MIME: %s\n", kind.Extension, kind.MIME.Value)

		if kind.MIME.Value != expectedMIMEType {
			// image/heic and image/heif are the same thing, different file extension
			if !(expectedMIMEType == "image/heic" && kind.MIME.Value == "image/heif") {
				log.WithFields(log.Fields{"expectedMIMEType": expectedMIMEType, "actualMIME": kind.MIME.Value}).Warning("[processFile] Mismatched MIME Types")
				body := fmt.Sprintf("expected type '%s' got '%s'", expectedMIMEType, kind.MIME.Value)
				addAlert(ctx, userID, "fileTypeMismatched", body, fileID)
				// return errUnexpectedFileType
			}
		}

		// TODO: process the mime type

	} else {
		log.WithFields(log.Fields{"fileID": fileID, "expectedMIMEType": expectedMIMEType}).Info("[processFile] File Type not recognized")
		if !slices.Contains(excemptedFileTypes, expectedMIMEType) {
			// return errUnknownFileType
			// TODO: decide how to handle unknown files
			// Set the mime to application/octet-stream??
		}
	}

	objKey, err := getNewID()
	if err != nil {
		return fmt.Errorf("getNewFileID failed: %w", err)
	}

	// encrypt and upload
	res, err := encryptAndUploadFile(ctx, filePath, objKey.String(), parentDir, userID)
	if err != nil {
		return fmt.Errorf("encryptAndUploadFile failed: %w", err)
	}

	fmt.Printf("[processFile] Result: ")
	fmt.Println(res)

	// set objKey
	_, err = db.ExecContext(ctx, "update files set objKey=?, processed=true, lastModified=now() where id=?;", objKey, fileID)
	if err != nil {
		return fmt.Errorf("failed to update DB: %w", err)
	}

	// delete the tmp file
	err = os.Remove(filePath)
	if err != nil {
		return fmt.Errorf("failed to remove the file from tmp storage: %w", err)
	}
	return nil
}

func processProfilePicture(ctx context.Context, filePath, profilePictureID, userID string) error {
	// Inspect the file
	// TODO: Make sure this works
	kind, err := filetype.MatchFile(filePath)
	if err != nil {
		return fmt.Errorf("failed to get the fileType: %w", err)
	}

	if kind == filetype.Unknown {
		return errUnknownFileType
	}

	// 'image/png' gets split at the '/'. MIME.Type is 'image' and MIME.Subtype is 'png'

	if kind.MIME.Type != "image" {
		// file is not an image
		// return ValueError{"", errFileIsNotAnImg}
		return errFileIsNotAnImg
	}

	if !slices.Contains(supportedImageTypes, kind.MIME.Subtype) {
		// file is an unsuported image format
		return errUnsuportedImgType
	}

	fmt.Printf("File type: %s. MIME: %s\n", kind.Extension, kind.MIME.Value)

	// TODO: remove exif data

	// the fileID is the objKey that is going to be used in S3.
	// It is <the ID from the db>.<mime subtype>.
	fileID := fmt.Sprintf("%s.%s", profilePictureID, kind.MIME.Subtype)

	// open the file to upload it
	file, err := os.Open(filePath)
	if err != nil {
		return err
	}
	defer file.Close()

	info, err := file.Stat()
	if err != nil {
		return err
	}

	fileSize := info.Size()
	if fileSize == 0 {
		return errFileIsEmpty
	}

	res, err := uploadBytes(ctx, s3Client, serverConfig.S3BucketName, file, fileSize, fileID)
	if err != nil {
		return fmt.Errorf("failed to upload the file to S3: %w. Res: %v", err, res)
	}

	// update user to add profilePictureID
	_, err = db.ExecContext(ctx, "UPDATE users SET profilePictureID=? WHERE userID=?", fileID, userID)
	if err != nil {
		return fmt.Errorf("error updating users table. %w", err)
	}

	return nil
}
