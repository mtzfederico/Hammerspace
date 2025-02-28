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


CREATE TABLE IF NOT EXISTS users (
  userID        VARCHAR(50)     PRIMARY KEY,
  email         VARCHAR(50)     NOT NULL,
  password      BINARY(60)      NOT NULL,
  roleID        VARCHAR(50)     NOT NULL,
  createdDate   DATETIME        NOT NULL,
  lastModified  DATETIME        DEFAULT NULL,
  CONSTRAINT users_roleID_fk FOREIGN KEY (roleID) REFERENCES roles(roleID) ON DELETE RESTRICT
);

-- Session authentication tokens
CREATE TABLE IF NOT EXISTS authTokens (
  tokenID    VARCHAR(50)     PRIMARY KEY,
  userID     VARCHAR(50)     NOT NULL,
  loginDate  DATETIME,
  CONSTRAINT authTokens_userID_fk FOREIGN KEY (userID) REFERENCES users(userID) ON DELETE CASCADE
);

-- The user's age public keys. The description is some sort of text to identify the key if the user has multiple public keys
CREATE TABLE IF NOT EXISTS encryptionKeys (
  publicKey    VARCHAR(65)     PRIMARY KEY,
  userID       VARCHAR(50)     NOT NULL,
  description  VARCHAR(50)     NOT NULL,
  createdDate  DATETIME        NOT NULL,
  CONSTRAINT encryptionKeys_userID_fk FOREIGN KEY (userID) REFERENCES users(userID) ON DELETE CASCADE
);

-- Test User. Password is "testPassword123"
-- INSERT INTO users (userID, email, password, roleID, createdDate) VALUES ("testUser", "test@example.com", "$2a$14$w3kWUlkLWc2wkM0FQLwiWu0.Cy05LyjaXl8xE7mIl5sB9IRDFs3Ie", "user", now());

-- Test public key for "AGE-SECRET-KEY-13ZV95MTF4J8K75DR5J884E9G2FRSZNJKMRHK9TV4TF7V6TTUGETQ9MZTQ7"
-- INSERT INTO encryptionKeys (publicKey, userID, description, createdDate) VALUES ("age1pkl3nxgdqlfe35g6x96spkvqf0ru8me2nhp5vcqeg5p5wthmuerqss6agj", "testUser", "main key", now());

-- UUIDv7 is 36 char long
CREATE TABLE IF NOT EXISTS files (
  id            VARCHAR(36)   PRIMARY KEY,
  parentDir     VARCHAR(50)   NOT NULL,
  name          VARCHAR(50)   NOT NULL,
  type          VARCHAR(50)   NOT NULL,
  size          INT           NOT NULL,
  userID        VARCHAR(50)   NOT NULL,
  createdDate   DATETIME      NOT NULL,
  lastModified  DATETIME      DEFAULT NULL,
  CONSTRAINT files_userID_fk FOREIGN KEY (userID) REFERENCES users(userID) ON DELETE CASCADE
);