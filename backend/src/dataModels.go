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
	DirName   string `json:"dirName"`
}

type GetDirectoryRequest struct {
	UserID    string `json:"userID"`
	AuthToken string `json:"authToken"`
	DirName   string `json:"dirName"`
}
