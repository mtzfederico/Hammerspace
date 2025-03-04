package main

type SignupRequest struct {
	Email    string `json:"email"`
	UserID   string `json:"userID"`
	Password string `json:"password"`
}

type LoginRequest struct {
	UserID   string `json:"userID"`
	Password string `json:"password"`
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

type GetFileRequest struct {
	UserID    string `json:"userID"`
	AuthToken string `json:"authToken"`
	// The fileID in the DB, NOT the S3 objKey
	FileID string `json:"fileID"`
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
