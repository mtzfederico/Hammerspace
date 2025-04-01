package main

import (
	"context"
	"errors"
	"fmt"
	"os"

	log "github.com/sirupsen/logrus"

	"github.com/h2non/filetype"
)

var (
	errUnknownFileType error = errors.New("unknown file type")
)

func processFile(ctx context.Context, filePath, fileID string) error {
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
	if kind == filetype.Unknown {
		// TODO: decide how to handle unknown files
		// Set the mime to application/octet-stream??
		log.Info("[processFile] errUnknownFileType")
		return errUnknownFileType
	}

	fmt.Printf("File type: %s. MIME: %s\n", kind.Extension, kind.MIME.Value)

	// TODO: process the mime type

	objKey, err := getNewID()
	if err != nil {
		return fmt.Errorf("getNewFileID failed: %w", err)
	}

	// encrypt and upload
	res, err := encryptAndUploadFile(ctx, filePath, objKey.String())
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
