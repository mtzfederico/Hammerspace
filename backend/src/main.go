package main

import (
	"database/sql"
	_ "embed"
	"flag"
	"os"

	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/gin-gonic/gin"
	"github.com/go-sql-driver/mysql"
	log "github.com/sirupsen/logrus"
)

// Info on the last commit. <Full Hash>__<Date in ISO8601>__<Author Name>__<Author Email>
// https://icinga.com/blog/embedding-git-commit-information-in-go-binaries/
//
//go:generate sh -c "printf %s $(git log -1 --format='%H__%cI__%aN__%aE') > dev_commit.txt"
//go:embed dev_commit.txt
var LastCommitInfo string

// The server's config
var serverConfig Config

// The database connection pool
var db *sql.DB

// The s3 client
var s3Client *s3.Client

func main() {
	configPath := flag.String("config", "config.yaml", "Path to the configuration file")
	flag.Parse()

	if *configPath == "" {
		log.Fatal("[main] config flag missing. use --config path/to/config.yaml")
	}

	serverConfig.readFile(*configPath)

	// if a logFile was secified, set it as the output
	if serverConfig.LogFile != "" {
		// If the log file doesn't exist, create it, otherwise append to the file
		file, err := os.OpenFile(serverConfig.LogFile, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0664)
		if err != nil {
			log.WithField("Error", err).Fatal("[main] Logging file error")
		}

		log.SetOutput(file)
	} else {
		log.Warn("[main] No LogFile specified. Logging to stderr")
	}

	// Set loglevel
	if serverConfig.LogLevel != "" {
		level, err := log.ParseLevel(serverConfig.LogLevel)

		if err != nil {
			log.WithField("err", err).Error("[main] DebugLevel has an invalid value")
		} else {
			log.Info("[main] Log Level set to ", serverConfig.LogLevel)
			log.SetLevel(level)
		}
	}

	if serverConfig.ListenOn == "" {
		log.Fatal("[main] No ListenOn specified")
	}

	log.WithField("LastCommitInfo", LastCommitInfo).Info("Starting server")

	if serverConfig.GINRelease {
		gin.SetMode(gin.ReleaseMode)
	}

	cfg := mysql.Config{
		User:                 serverConfig.DBUser,
		Passwd:               serverConfig.DBPassword,
		Net:                  "tcp",
		Addr:                 serverConfig.DBAddress,
		DBName:               serverConfig.DBName,
		AllowNativePasswords: true,
		ParseTime:            true,
	}

	dbDSN := cfg.FormatDSN()
	log.WithField("DSN", dbDSN).Trace("[main] DB Config in DSN Format")
	var err error
	db, err = sql.Open("mysql", dbDSN)
	if err != nil {
		log.Fatal(err)
	}

	// Verify that connection to DB is working
	pingErr := db.Ping()
	if pingErr != nil {
		log.WithField("pingErr", pingErr).Fatal("[main] Failed to connect to DB")
	}

	if s3Client == nil {
		s3Client, err = getS3Client()

		if err != nil {
			// should probabl be fatal
			log.WithField("err", err).Error("[main] Failed to setup S3 client")
		}
	}
	router := gin.Default()

	// Handle 404s
	router.NoRoute(func(c *gin.Context) {
		c.JSON(404, gin.H{"message": "Page not found"})
	})

	router.POST("login", handleLogin)
	router.POST("logout", handleLogout)
	router.POST("signup", handleSignup)
	router.POST("changePassword", handleChangePassword)

	router.POST("uploadFile", handleFileUpload)
	router.POST("getFile", handleGetFile)
	router.POST("shareFile", handleShareFile)
	router.POST("removeFile", handleRemoveFile)
	router.POST("getSharedWith", handleGetSharedWith)

	router.POST("createDir", handleCreateDirectory)
	router.POST("getDir", handleGetDirectory)
	router.POST("shareDir", handleShareDirectory)
	router.POST("removeDir", handleRemoveDirectory)

	router.POST("sync", handleSync)
	router.POST("getAlerts", handleGetAlerts)
	router.POST("removeAlert", handleRemoveAlert)

	router.POST("getProfilePicture", handleGetProfilePicture)
	router.POST("updateProfilePicture", handleUpdateProfilePicture)

	router.Run(serverConfig.ListenOn)
}
