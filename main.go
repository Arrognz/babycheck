package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/contrib/static"
	"github.com/gin-gonic/gin"
	_ "github.com/heroku/x/hmetrics/onload"
)

func pong(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"message": "pong",
	})
}

func main() {
	port := os.Getenv("PORT")

	if port == "" {
		log.Fatal("$PORT must be set")
	}

	router := gin.New()
	logger := gin.Logger()
	router.Use(logger)
	// router.LoadHTMLGlob("templates/*.tmpl.html")
	router.Use(static.Serve("/", static.LocalFile("./static", true)))

	// api group
	// allow cors if dev env
	fmt.Println("GIN_MODE: ", os.Getenv("GIN_MODE"))
	if os.Getenv("GIN_MODE") != "release" {
		fmt.Println("CORS enabled")
		router.Use(func(c *gin.Context) {
			c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
			c.Writer.Header().Set("Access-Control-Allow-Methods", "*")
			c.Writer.Header().Set("Access-Control-Allow-Headers", "*")
			c.Next()
		})
	}
	api := router.Group("/api")
	{
		api.GET("/ping", pong)
	}

	router.Run(":" + port)
}
