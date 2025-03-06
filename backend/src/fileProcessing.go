package main

import (
	"context"
	"fmt"
	"os"
)

func processFile(ctx context.Context, filePath, fileID string) error {
	// Get file

	// Inspect the file

	objKey, err := getNewFileID()
	if err != nil {
		return err
	}

	// encrypt and upload
	res, err := encryptAndUploadFile(filePath, objKey.String())
	if err != nil {
		return err
	}
	fmt.Printf("[processFile] Result: ")
	fmt.Println(res)

	// set objKey
	_, err = db.ExecContext(ctx, "update files set objKey=?, processed=true, lastModified=now() where id=?;", objKey, fileID)
	if err != nil {
		return err
	}

	// delete the tmp file
	err = os.Remove(filePath)
	if err != nil {
		return err
	}
	return nil
}
