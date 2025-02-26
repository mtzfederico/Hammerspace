package main

import (
	"os"

	log "github.com/sirupsen/logrus"
	"gopkg.in/yaml.v3"
)

type Config struct {
	// IP and Port combination to listen on. A good default is "[::1]:9090" for localhost on port 9090
	ListenOn string `yaml:"ListenOn" binding:"required"`
	// The path to the log file
	LogFile string `yaml:"LogFile"`
	// The DB address and port such as "127.0.0.1:3306"
	DBAddress string `yaml:"DBAddress" binding:"required"`
	// The DB user
	DBUser string `yaml:"DBUser" binding:"required"`
	// The password for the DB user
	DBPassword string `yaml:"DBPassword" binding:"required"`
	// The name of the DB to use
	DBName string `yaml:"DBName" binding:"required"`
	// The name of the bucket used
	S3BucketName string `yaml:"S3BucketName" binding:"required"`
	// The S3 URL endpoint. Cloudflare's R2 uses the format: "https://<accountID>.r2.cloudflarestorage.com"
	S3Endpoint string `yaml:"S3Endpoint" binding:"required"`
	// The S3 Access Key ID
	S3AccessKeyID string `yaml:"S3AccessKeyID" binding:"required"`
	// The S3 Access Key Secret
	S3AccessKeySecret string `yaml:"S3AccessKeySecret" binding:"required"`
	// The temporary directory used to store files uploaded to the server. Make sure it ends with a '/'
	TMPStorageDir string `yaml:"TMPStorageDir" binding:"required"`
	// The log level. Options: "panic", "fatal", "error", "warn", "info", "debug", "trace".
	// https://github.com/sirupsen/logrus/blob/dd1b4c2e81afc5c255f216a722b012ed26be57df/logrus.go#L25
	LogLevel string `yaml:"LogLevel" binding:"required"`
	// Set the mode for the http library Gin to "release" or "debug".
	// More info in https://github.com/gin-gonic/gin/issues/2984
	GINRelease bool `yaml:"GINMode" binding:"required"`
}

// Reads the yaml file specified in the path
func (c *Config) readFile(configPath string) *Config {
	yamlFile, err := os.ReadFile(configPath)
	if err != nil {
		log.WithField("err", err).Error("[Config.readFile] Error reading file")
	}
	err = yaml.Unmarshal(yamlFile, c)
	if err != nil {
		log.WithField("err", err).Fatal("[Config.readFile] Error parsing yaml")
	}

	return c
}
