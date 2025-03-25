package main

import "time"

type SignupRequest struct {
	Email    string `json:"email"`
	UserID   string `json:"userID"`
	Password string `json:"password"`
}

type LoginRequest struct {
	UserID   string `json:"userID"`
	Password string `json:"password"`
}

type ChangePassRequest struct {
	UserID          string `json:"userID"`
	AuthToken       string `json:"authToken"`
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword"`
}

type LogoutRequest struct {
	UserID    string `json:"userID"`
	AuthToken string `json:"authToken"`
}

type BasicRequest struct {
	UserID    string `json:"userID"`
	AuthToken string `json:"authToken"`
}

type CreateFolderRequest struct {
	UserID    string `json:"userID"`
	AuthToken string `json:"authToken"`
	// The name that the user sees
	DirName string `json:"dirName"`
	// For the root/home it is 'root', otherwise it is the parentDir's ID
	ParentDir string `json:"parentDir"`
}

type GetDirectoryRequest struct {
	UserID    string `json:"userID"`
	AuthToken string `json:"authToken"`
	// For the root/home it is 'root', otherwise it is the parentDir's ID
	DirID string `json:"dirID"`
}

type ShareDirectoryRequest struct {
	UserID    string `json:"userID"`
	AuthToken string `json:"authToken"`
	// For the root/home it is 'root', otherwise it is the parentDir's ID
	DirID      string `json:"dirID"`
	WithUserID string `json:"withUserID"`
	ReadOnly   bool   `json:"isReadOnly"`
}

type GetFileRequest struct {
	UserID    string `json:"userID"`
	AuthToken string `json:"authToken"`
	// The fileID in the DB, NOT the S3 objKey
	FileID string `json:"fileID"`
}

type ShareFileRequest struct {
	UserID    string `json:"userID"`
	AuthToken string `json:"authToken"`
	// The fileID in the DB, NOT the S3 objKey
	FileID     string `json:"fileID"`
	WithUserID string `json:"withUserID"`
	ReadOnly   bool   `json:"isReadOnly"`
}

type GetDirectoryResponse struct {
	Success bool   `json:"success"`
	DirID   string `json:"dirID"`
	// For the root/home it is 'root', otherwise it is the parentDir's ID.
	// When getting the root directory, parentDir is optional. If it is there, it should be an empty string
	ParentDir string                      `json:"ParentDir" binding:"omitempty"`
	Items     []GetDirectoryResponseItems `json:"items"`
}

type GetDirectoryResponseItems struct {
	Name     string `json:"name"`
	ID       string `json:"id"`
	FileType string `json:"type"`
	Size     int    `json:"size" binding:"omitempty"`
}

// Used to form a list with users that have access to a file and the permission that they have
type UserFilePermission struct {
	UserID string `json:"userID"`
	// The file access permission. "read" or "write"
	Permission string `json:"permission"`
}

type CreateDirectoryResponse struct {
	Success bool   `json:"success"`
	DirID   string `json:"dirID"`
}

type Folder struct {
	ID           string    `json:"id"`
	ParentDir    string    `json:"parentDir"`
	Name         string    `json:"name"`
	Type         string    `json:"type"`
	URI          string    `json:"uri"`
	FileSize     int       `json:"fileSize"`
	UserID       string    `json:"userID"`
	LastModified time.Time `json:"lastModified"`
}

type Alert struct {
	ID          string    `json:"id"`
	Description string    `json:"description"`
	FileID      string    `json:"name" binding:"omitempty"`
	FileOwner   string    `json:"fileOwner"  binding:"omitempty"`
	CreatedDate time.Time `json:"createdDate"`
}
