package main

import (
	"database/sql"
	_ "embed"
	"flag"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/go-sql-driver/mysql"
	log "github.com/sirupsen/logrus"
)

// Info on the last commit. <Full Hash>__<Date in ISO8601>__<Author Name>__<Author Email>
// https://icinga.com/blog/embedding-git-commit-information-in-go-binaries/
//
//go:generate sh -c "printf %s $(git log -1 --format='%H_%cI_%aN_%aE') > dev_commit.txt"
//go:embed dev_commit.txt
var LastCommitInfo string

// The server's config
var config Config

// The database connection pool
var db *sql.DB

func main() {
	configPath := flag.String("config", "config.yaml", "Path to the configuration file")
	flag.Parse()

	if *configPath == "" {
		log.Fatal("[main] config flag missing. use --config path/to/config.yaml")
	}

	config.readFile(*configPath)

	// if a logFile was secified, set it as the output
	if config.LogFile != "" {
		// If the log file doesn't exist, create it, otherwise append to the file
		file, err := os.OpenFile(config.LogFile, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0664)
		if err != nil {
			log.WithField("Error", err).Fatal("[main] Logging file error")
		}

		log.SetOutput(file)
	} else {
		log.Warn("[main] No LogFile specified. Logging to stderr")
	}

	// Set loglevel
	if config.LogLevel != "" {
		level, err := log.ParseLevel(config.LogLevel)

		if err != nil {
			log.WithField("err", err).Error("[main] DebugLevel has an invalid value")
		} else {
			log.Info("[main] Log Level set to ", config.LogLevel)
			log.SetLevel(level)
		}
	}

	if config.ListenOn == "" {
		log.Fatal("[main] No ListenOn specified")
	}

	if config.GINRelease {
		gin.SetMode(gin.ReleaseMode)
	}

	cfg := mysql.Config{
		User:                 config.DBUser,
		Passwd:               config.DBPassword,
		Net:                  "tcp",
		Addr:                 config.DBAddress,
		DBName:               config.DBName,
		AllowNativePasswords: true,
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
		log.WithField("pingErr", pingErr).Fatal("Failed to connect to DB")
	}

	log.WithField("LastCommitInfo", LastCommitInfo).Info("Starting server")
	router := gin.Default()

	// Handle 404s
	router.NoRoute(func(c *gin.Context) {
		c.JSON(404, gin.H{"message": "Page not found"})
	})

	router.POST("login", handleLogin)
	router.POST("logout", handleLogout)
	router.POST("signup", handleSignup)
	// router.POST("changePassword", handleChangePassword)

	router.Run(config.ListenOn)
}
