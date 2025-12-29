package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/contrib/static"
	"github.com/gin-gonic/gin"
	"github.com/heroku/babycheck/storage"
	_ "github.com/heroku/x/hmetrics/onload"
)

func pong(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"message": "pong",
	})
}

func action(c *gin.Context) {
	action := c.Param("action")
	time := time.Now()
	tmp, _ := c.Get("storage")
	store := tmp.(*storage.Storage)
	ok := store.Update(action, time)
	c.JSON(http.StatusOK, gin.H{
		"action": action,
		"ok":     ok,
	})
}

func search(c *gin.Context) {
	// start and stop are body params
	body := struct {
		Start int64 `json:"start"`
		Stop  int64 `json:"stop"`
	}{}
	err := c.BindJSON(&body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid json",
		})
		return
	}
	tmp, _ := c.Get("storage")
	store := tmp.(*storage.Storage)
	events := store.Search(body.Start, body.Stop)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to search",
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"events": events,
	})
}

func AddAction(c *gin.Context) {
	var action struct {
		Name string `json:"action"`
		Time int64  `json:"timestamp"`
	}
	err := c.BindJSON(&action)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid json",
		})
		return
	}
	tmp, _ := c.Get("storage")
	store := tmp.(*storage.Storage)
	ok := store.Save(action.Time, action.Name)
	c.JSON(http.StatusOK, gin.H{
		"action": action,
		"ok":     ok,
	})
}

type DeleteAction struct {
	Timestamp int64 `json:"timestamp"`
}

func deleteAction(c *gin.Context) {
	payload := DeleteAction{}
	err := c.BindJSON(&payload)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid json",
		})
		return
	}
	tmp, _ := c.Get("storage")
	store := tmp.(*storage.Storage)
	ok := store.Delete(payload.Timestamp)
	c.JSON(http.StatusOK, gin.H{
		"action":  action,
		"deleted": ok,
		"ok":      ok,
	})
}

func getMode(c *gin.Context) {
	mode := os.Getenv("GIN_MODE")
	c.JSON(http.StatusOK, gin.H{
		"mode": mode,
	})
}

func register(c *gin.Context) {
	var body struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	err := c.BindJSON(&body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "JSON invalide",
		})
		return
	}

	if body.Username == "" || body.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Nom d'utilisateur et mot de passe requis",
		})
		return
	}

	userStorage := storage.NewUserStorage()
	if userStorage == nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Erreur de connexion à la base de données",
		})
		return
	}

	user, err := userStorage.CreateUser(body.Username, body.Password)
	if err != nil {
		if strings.Contains(err.Error(), "already exists") {
			c.JSON(http.StatusConflict, gin.H{
				"error": "Utilisateur déjà existant",
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Erreur lors de la création de l'utilisateur",
			})
		}
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Utilisateur créé avec succès",
		"user":    user,
	})
}

func login(c *gin.Context) {
	var body struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	err := c.BindJSON(&body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "JSON invalide",
		})
		return
	}

	userStorage := storage.NewUserStorage()
	if userStorage == nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Erreur de connexion à la base de données",
		})
		return
	}

	user, token, err := userStorage.AuthenticateUser(body.Username, body.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Identifiants invalides",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Connexion réussie",
		"user":    user,
		"token":   token,
	})
}

func authMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Token d'autorisation manquant",
			})
			c.Abort()
			return
		}

		// Extract token from "Bearer <token>"
		tokenParts := strings.Split(authHeader, " ")
		if len(tokenParts) != 2 || tokenParts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Format du token invalide",
			})
			c.Abort()
			return
		}

		userStorage := storage.NewUserStorage()
		if userStorage == nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Erreur de connexion à la base de données",
			})
			c.Abort()
			return
		}

		claims, err := userStorage.ValidateToken(tokenParts[1])
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Token invalide",
			})
			c.Abort()
			return
		}

		// Set user info in context
		c.Set("user_id", claims.UserID)
		c.Set("username", claims.Username)
		c.Set("user_role", claims.Role)
		c.Next()
	}
}

func adminMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole, exists := c.Get("user_role")
		if !exists || userRole != "admin" {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Accès administrateur requis",
			})
			c.Abort()
			return
		}
		c.Next()
	}
}

func changeTimestamp(c *gin.Context) {
	payload := struct {
		Event storage.DBBabyEvent `json:"event"`
		Ts    int64               `json:"ts"`
	}{}
	err := c.BindJSON(&payload)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid json",
		})
		return
	}
	tmp, _ := c.Get("storage")
	store := tmp.(*storage.Storage)
	ok := store.ChangeTimestamp(payload.Event, payload.Ts)
	c.JSON(http.StatusOK, gin.H{
		"action":  action,
		"changed": ok,
	})
}

func getAllData(c *gin.Context) {
	tmp, _ := c.Get("storage")
	store := tmp.(*storage.Storage)
	events := store.GetAllData()
	c.JSON(http.StatusOK, gin.H{
		"events": events,
		"count":  len(events),
	})
}

func eraseAllData(c *gin.Context) {
	tmp, _ := c.Get("storage")
	store := tmp.(*storage.Storage)
	ok := store.EraseAll()
	c.JSON(http.StatusOK, gin.H{
		"message": "all data erased",
		"ok":      ok,
	})
}

func getAllUsers(c *gin.Context) {
	userStorage := storage.NewUserStorage()
	if userStorage == nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Erreur de connexion à la base de données",
		})
		return
	}

	users, err := userStorage.GetAllUsers()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Erreur lors de la récupération des utilisateurs",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"users": users,
		"count": len(users),
	})
}

func getAllUsersData(c *gin.Context) {
	userStorage := storage.NewUserStorage()
	if userStorage == nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Erreur de connexion à la base de données",
		})
		return
	}

	users, err := userStorage.GetAllUsers()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Erreur lors de la récupération des utilisateurs",
		})
		return
	}

	allData := make(map[string]interface{})
	for _, user := range users {
		if user.Role == "admin" {
			continue // Skip admin user data
		}
		
		userStorage := storage.NewStorage(user.ID)
		if userStorage != nil {
			events := userStorage.GetAllData()
			allData[user.Username] = map[string]interface{}{
				"user":   user,
				"events": events,
				"count":  len(events),
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  allData,
		"users": len(allData),
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

	// allow cors if dev env
	fmt.Println("GIN_MODE: ", os.Getenv("GIN_MODE"))
	if os.Getenv("GIN_MODE") != "release" {
		fmt.Println("CORS enabled")
		router.Use(func(c *gin.Context) {
			fmt.Println("CORS middleware processing")
			c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
			c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
			// return 200 for options
			if c.Request.Method == "OPTIONS" {
				c.JSON(http.StatusOK, gin.H{})
				return
			}
		})
	}

	// Initialize admin user
	userStorage := storage.NewUserStorage()
	if userStorage != nil {
		err := userStorage.EnsureAdminUser()
		if err != nil {
			fmt.Printf("Warning: Failed to ensure admin user: %v\n", err)
		}
	}

	// Public endpoints (no authentication required)
	router.POST("/api/register", register)
	router.POST("/api/login", login)
	router.GET("/api/ping", pong)

	// Protected endpoints (require authentication)
	api := router.Group("/api")
	api.Use(authMiddleware())
	{
		// Middleware to create user-specific storage
		api.Use(func(c *gin.Context) {
			userID, exists := c.Get("user_id")
			if !exists {
				c.JSON(http.StatusInternalServerError, gin.H{
					"error": "Erreur d'authentification",
				})
				c.Abort()
				return
			}
			
			userStorage := storage.NewStorage(userID.(string))
			if userStorage == nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"error": "Erreur de connexion au stockage",
				})
				c.Abort()
				return
			}
			c.Set("storage", userStorage)
			c.Next()
		})
		
		api.POST("/search", search)
		api.POST("/remote/:action", action)
		api.POST("/remote/update", changeTimestamp)
		api.POST("/add", AddAction)
		api.DELETE("/remote", deleteAction)
		api.GET("/mode", getMode)
	}
	
	// Admin endpoints (require admin role)
	admin := api.Group("/admin")
	admin.Use(adminMiddleware())
	{
		admin.GET("/users", getAllUsers)
		admin.GET("/data", getAllUsersData)
		admin.GET("/my-data", getAllData) // Admin's own data
		admin.DELETE("/my-data", eraseAllData) // Admin's own data
	}

	// Development endpoints
	if os.Getenv("GIN_MODE") != "release" {
		api.GET("/reset", func(c *gin.Context) {
			tmp, _ := c.Get("storage")
			store := tmp.(*storage.Storage)
			store.Erase()
			c.JSON(http.StatusOK, gin.H{
				"message": "reset",
			})
		})
	}

	router.Run(":" + port)
}
