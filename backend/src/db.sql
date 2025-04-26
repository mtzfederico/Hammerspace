-- Create the DB
DROP DATABASE IF EXISTS hammerspace;
CREATE DATABASE hammerspace;

-- select the database
USE hammerspace;

-- Create the tables
CREATE TABLE IF NOT EXISTS roles (
  roleID                VARCHAR(50)   PRIMARY KEY,
  canModifyOtherUser    BOOL          NOT NULL  DEFAULT false,
  createdDate           DATETIME      NOT NULL
);

INSERT INTO roles (roleID, canModifyOtherUser, createdDate) VALUES
("user", false, now()),
("admin", true, now());

-- profilePicture is the S3 objKey for the user's profile picture
CREATE TABLE IF NOT EXISTS users (
  userID            VARCHAR(50)     PRIMARY KEY,
  email             VARCHAR(50)     NOT NULL,
  password          BINARY(60)      NOT NULL,
  roleID            VARCHAR(50)     NOT NULL,
  profilePictureID  VARCHAR(50)     DEFAULT NULL,
  createdDate       DATETIME        NOT NULL,
  lastModified      DATETIME        DEFAULT NULL,
  CONSTRAINT users_roleID_fk FOREIGN KEY (roleID) REFERENCES roles(roleID) ON DELETE RESTRICT
);

-- Session authentication tokens
CREATE TABLE IF NOT EXISTS authTokens (
  tokenID    VARCHAR(50)     PRIMARY KEY,
  userID     VARCHAR(50)     NOT NULL,
  loginDate  DATETIME,
  CONSTRAINT authTokens_userID_fk FOREIGN KEY (userID) REFERENCES users(userID) ON DELETE CASCADE
);

------------ test data starts ------------
-- Test User. Password is "testPassword123"
INSERT INTO users (userID, email, password, roleID, createdDate) VALUES ("testUser", "test@example.com", "$2a$14$w3kWUlkLWc2wkM0FQLwiWu0.Cy05LyjaXl8xE7mIl5sB9IRDFs3Ie", "user", now()), ("anotherTestUser", "test@example.com", "$2a$14$w3kWUlkLWc2wkM0FQLwiWu0.Cy05LyjaXl8xE7mIl5sB9IRDFs3Ie", "user", now());

INSERT INTO authTokens (tokenID, userID, loginDate) VALUES ('K1xS9ehuxeC5tw==', 'testUser', '2025-02-26 12:57:08');
------------- test data ends -------------

-- Files/items table
-- id is a UUIDv7 which is 36 char long.
-- parentDir is the ID of the folder that this item is in. 'root' is the root/home directory of the user. Otherwise it is the ID of the parent dir
-- Type is the type that the file is. We could use the MIME Types https://developer.mozilla.org/en-US/docs/Web/HTTP/MIME_types
-- If it is a folder, then type is 'folder' and size is 0
-- Processed is to indicate whether the file has been checked/inspected or not. true means that it is ready to be accessed.
-- objKey is the S3 object key. it is null on folders
CREATE TABLE IF NOT EXISTS files (
  id            VARCHAR(36)   PRIMARY KEY,
  objKey        VARCHAR(36)   NOT NULL   DEFAULT "",
  parentDir     VARCHAR(50)   NOT NULL,
  name          VARCHAR(265)  NOT NULL,
  type          VARCHAR(50)   NOT NULL,
  size          INT           NOT NULL,
  userID        VARCHAR(50)   NOT NULL,
  processed     BOOL          NOT NULL  DEFAULT false,
  createdDate   DATETIME      NOT NULL,
  lastModified  DATETIME      DEFAULT NULL,
  CONSTRAINT files_userID_fk FOREIGN KEY (userID) REFERENCES users(userID) ON DELETE CASCADE
);

-- The user's age public keys. The description is some sort of text to identify the key if the user has multiple public keys
-- folderID is optional and only there if the public key is for a folder. When it is for a folder then the userID is the folders owner.
CREATE TABLE IF NOT EXISTS encryptionKeys (
  publicKey    VARCHAR(65)     PRIMARY KEY,
  userID       VARCHAR(50)     NOT NULL,
  description  VARCHAR(50)     NOT NULL,
  createdDate  DATETIME        NOT NULL,
  folderID     VARCHAR(36)     DEFAULT null,
  CONSTRAINT encryptionKeys_userID_fk FOREIGN KEY (userID) REFERENCES users(userID) ON DELETE CASCADE,
  CONSTRAINT encryptionKeys_folder_fk FOREIGN KEY (folderid) REFERENCES files(id) ON DELETE CASCADE
);
-- Test public key for "AGE-SECRET-KEY-13ZV95MTF4J8K75DR5J884E9G2FRSZNJKMRHK9TV4TF7V6TTUGETQ9MZTQ7"
INSERT INTO encryptionKeys (publicKey, userID, description, createdDate) VALUES ("age1pkl3nxgdqlfe35g6x96spkvqf0ru8me2nhp5vcqeg5p5wthmuerqss6agj", "testUser", "main key", now());
--
-- items shared table
-- processed is for files that have been marked as shared, but the new file that is encrypted with this user's pubkey has not been uploaded yet.
-- true means that it is ready to be accessed by the user that it is shared with.
CREATE TABLE IF NOT EXISTS sharedFiles (
  id            VARCHAR(36)   PRIMARY KEY,
  fileID        VARCHAR(36)   NOT NULL,
  userID        VARCHAR(50)   NOT NULL,
  fileOwner     VARCHAR(50)   NOT NULL,
  isReadOnly    BOOL          NOT NULL  DEFAULT true,
  processed     BOOL          NOT NULL  DEFAULT false,
  createdDate   DATETIME      NOT NULL,
  lastModified  DATETIME      DEFAULT NULL,
  CONSTRAINT sharedFiles_fileID_fk FOREIGN KEY (fileID) REFERENCES files(id) ON DELETE CASCADE,
  CONSTRAINT sharedFiles_userID_fk FOREIGN KEY (userID) REFERENCES users(userID) ON DELETE CASCADE,
  CONSTRAINT sharedFiles_fileOwner_fk FOREIGN KEY (fileOwner) REFERENCES users(userID) ON DELETE CASCADE,
  UNIQUE KEY unique_ids (fileID, userID, fileOwner)
);

-- A table with all the alerts/notifications that are active
-- fileID and fileOwner are optinal and only used if the alert involves a file and or another user
-- processed is used to know if it has been sent. Once the user dismisses it, we could delete it.
CREATE TABLE IF NOT EXISTS activeAlerts (
  id             VARCHAR(36)   PRIMARY KEY,
  userID         VARCHAR(50)   NOT NULL,
  alertType      VARCHAR(50)   NOT NULL,
  dataPrimary    VARCHAR(80)   NOT NULL,
  dataSecondary  VARCHAR(80),
  createdDate    DATETIME      NOT NULL,
  CONSTRAINT activeAlerts_userID_fk FOREIGN KEY (userID) REFERENCES users(userID) ON DELETE CASCADE
);

-- This is the user_friends table to track friendships
CREATE TABLE IF NOT EXISTS user_friends (
  friendshipID     VARCHAR(36)  PRIMARY KEY,
  userID1          VARCHAR(50)  NOT NULL,
  userID2          VARCHAR(50)  NOT NULL,
  request_status            ENUM('pending', 'accepted', 'declined') DEFAULT 'pending',
  createdDate      DATETIME     NOT NULL,
  CONSTRAINT user_friends_userID1_fk FOREIGN KEY (userID1) REFERENCES users(userID) ON DELETE CASCADE,
  CONSTRAINT user_friends_userID2_fk FOREIGN KEY (userID2) REFERENCES users(userID) ON DELETE CASCADE,
  CONSTRAINT chk_user_friends_diff_users CHECK (userID1 != userID2)
);


