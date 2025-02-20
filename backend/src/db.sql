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

