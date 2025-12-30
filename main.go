package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
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
		Email    string `json:"email,omitempty"`
	}
	err := c.BindJSON(&body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "JSON invalide",
		})
		return
	}

	if body.Username == "" || body.Password == "" || body.Email == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Nom du bébé, email et mot de passe requis",
		})
		return
	}

	if len(body.Password) < 6 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Le mot de passe doit contenir au moins 6 caractères",
		})
		return
	}

	// Validate email format
	if !strings.Contains(body.Email, "@") {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Format d'email invalide",
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

	// Check if email is already taken
	emailTaken, err := userStorage.IsEmailTaken(body.Email, "")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to check email availability",
		})
		return
	}
	if emailTaken {
		c.JSON(http.StatusConflict, gin.H{
			"error": "Cette adresse email est déjà utilisée",
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

	// Set email as unverified - user will need to verify
	err = userStorage.SetUserEmailUnverified(user.ID, body.Email)
	if err != nil {
		fmt.Printf("Warning: Failed to set email for new user: %v\n", err)
	} else {
		// Get updated user with email
		updatedUser, err := userStorage.GetUser(body.Username)
		if err == nil {
			user = updatedUser
		}
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Compte créé avec succès",
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

func updateEvent(c *gin.Context) {
	payload := struct {
		Timestamp   int64  `json:"timestamp"`
		NewAction   string `json:"new_action"`
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
	ok := store.UpdateEvent(payload.Timestamp, payload.NewAction)
	c.JSON(http.StatusOK, gin.H{
		"updated": ok,
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

func getStats(c *gin.Context) {
	body := struct {
		Period string `json:"period"`
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
	
	// Calculate time range based on period
	now := time.Now().UnixMilli()
	var start int64
	
	switch body.Period {
	case "hour":
		start = now - (60 * 60 * 1000) // 1 hour ago
	case "day":
		start = now - (24 * 60 * 60 * 1000) // 24 hours ago
	case "days2":
		start = now - (2 * 24 * 60 * 60 * 1000) // 2 days ago
	case "week":
		start = now - (7 * 24 * 60 * 60 * 1000) // 7 days ago
	case "thisweek":
		// Start of current week (Sunday)
		currentTime := time.Now()
		startOfWeek := currentTime.AddDate(0, 0, -int(currentTime.Weekday()))
		startOfWeek = time.Date(startOfWeek.Year(), startOfWeek.Month(), startOfWeek.Day(), 0, 0, 0, 0, startOfWeek.Location())
		start = startOfWeek.UnixMilli()
	default:
		start = now - (24 * 60 * 60 * 1000) // default to 24 hours
	}

	stats := store.CalculateStats(start, now)
	c.JSON(http.StatusOK, stats)
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

func getRedisStats(c *gin.Context) {
	stats := storage.GetRedisStats()
	c.JSON(http.StatusOK, gin.H{
		"redis": stats,
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

func testEmail(c *gin.Context) {
	var body struct {
		Email string `json:"email"`
	}
	err := c.BindJSON(&body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Email required",
		})
		return
	}

	emailService := storage.NewEmailService()
	if emailService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Email service not configured",
		})
		return
	}

	err = emailService.SendTestEmail(body.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Email send error: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Test email sent successfully",
		"email":   body.Email,
	})
}

func getCurrentUser(c *gin.Context) {
	_, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User authentication required",
		})
		return
	}

	username, exists := c.Get("username")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Username not found in token",
		})
		return
	}

	userStorage := storage.NewUserStorage()
	if userStorage == nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Database connection error",
		})
		return
	}

	user, err := userStorage.GetUser(username.(string))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "User not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user": user,
	})
}

func sendVerificationEmail(c *gin.Context) {
	var body struct {
		Email string `json:"email"`
	}
	err := c.BindJSON(&body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Email required",
		})
		return
	}

	if body.Email == "" || !strings.Contains(body.Email, "@") {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Valid email address required",
		})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User authentication required",
		})
		return
	}

	userStorage := storage.NewUserStorage()
	if userStorage == nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Database connection error",
		})
		return
	}

	// Check if email is already taken by another user
	emailTaken, err := userStorage.IsEmailTaken(body.Email, userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to check email availability",
		})
		return
	}

	if emailTaken {
		c.JSON(http.StatusConflict, gin.H{
			"error": "Cette adresse email est déjà utilisée par un autre utilisateur",
		})
		return
	}

	_, err = userStorage.SendVerificationEmail(body.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to send verification email: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Code de vérification envoyé",
		"email":   body.Email,
	})
}

func verifyEmail(c *gin.Context) {
	var body struct {
		Email string `json:"email"`
		Code  string `json:"code"`
	}
	err := c.BindJSON(&body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Email and code required",
		})
		return
	}

	if body.Email == "" || body.Code == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Email and verification code required",
		})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User authentication required",
		})
		return
	}

	userStorage := storage.NewUserStorage()
	if userStorage == nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Database connection error",
		})
		return
	}

	// Verify the code
	valid, err := userStorage.VerifyCode(body.Email, body.Code)
	if err != nil || !valid {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Code de vérification invalide ou expiré",
		})
		return
	}

	// Update user email
	err = userStorage.UpdateUserEmail(userID.(string), body.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to update user email",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Email vérifié et mis à jour avec succès",
		"email":   body.Email,
	})
}

func deleteAccount(c *gin.Context) {
	var body struct {
		BabyName string `json:"baby_name"`
	}
	err := c.BindJSON(&body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Baby name confirmation required",
		})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User authentication required",
		})
		return
	}

	username, exists := c.Get("username")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Username not found in token",
		})
		return
	}

	// Verify baby name matches username
	if body.BabyName != username.(string) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Le nom du bébé ne correspond pas",
		})
		return
	}

	userStorage := storage.NewUserStorage()
	if userStorage == nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Database connection error",
		})
		return
	}

	err = userStorage.DeleteUserAccount(userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to delete account",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Compte supprimé avec succès",
	})
}

func requestPasswordReset(c *gin.Context) {
	var body struct {
		Email string `json:"email"`
	}
	err := c.BindJSON(&body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Email required",
		})
		return
	}

	if body.Email == "" || !strings.Contains(body.Email, "@") {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Adresse email valide requise",
		})
		return
	}

	userStorage := storage.NewUserStorage()
	if userStorage == nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Database connection error",
		})
		return
	}

	// Check if user exists with this email (including unverified)
	_, err = userStorage.GetUserByEmailIncludeUnverified(body.Email)
	if err != nil {
		// Don't reveal if email exists or not for security
		c.JSON(http.StatusOK, gin.H{
			"message": "Si cette adresse email existe, un lien de réinitialisation a été envoyé",
		})
		return
	}

	// Send password reset email
	err = userStorage.SendPasswordResetEmail(body.Email)
	if err != nil {
		fmt.Printf("Failed to send password reset email: %v\n", err)
		c.JSON(http.StatusOK, gin.H{
			"message": "Si cette adresse email existe, un lien de réinitialisation a été envoyé",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Si cette adresse email existe, un lien de réinitialisation a été envoyé",
	})
}

func resetPassword(c *gin.Context) {
	var body struct {
		Token    string `json:"token"`
		Password string `json:"password"`
	}
	err := c.BindJSON(&body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Token and password required",
		})
		return
	}

	if body.Token == "" || body.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Token et nouveau mot de passe requis",
		})
		return
	}

	if len(body.Password) < 6 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Le mot de passe doit contenir au moins 6 caractères",
		})
		return
	}

	userStorage := storage.NewUserStorage()
	if userStorage == nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Database connection error",
		})
		return
	}

	// Verify token and update password
	err = userStorage.ResetPassword(body.Token, body.Password)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Token invalide ou expiré",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Mot de passe réinitialisé avec succès",
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
	router.POST("/api/request-password-reset", requestPasswordReset)
	router.POST("/api/reset-password", resetPassword)
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
		api.POST("/stats", getStats)
		api.POST("/remote/:action", action)
		api.POST("/remote/update", changeTimestamp)
		api.PUT("/event/update", updateEvent)
		api.POST("/add", AddAction)
		api.DELETE("/remote", deleteAction)
		api.GET("/mode", getMode)
		api.GET("/redis-stats", getRedisStats)
		api.GET("/me", getCurrentUser)
		
		// Email verification endpoints
		api.POST("/send-verification-email", sendVerificationEmail)
		api.POST("/verify-email", verifyEmail)
		
		// Account management
		api.DELETE("/delete-account", deleteAccount)
	}
	
	// Admin endpoints (require admin role)
	admin := api.Group("/admin")
	admin.Use(adminMiddleware())
	{
		admin.GET("/users", getAllUsers)
		admin.GET("/data", getAllUsersData)
		admin.GET("/my-data", getAllData) // Admin's own data
		admin.DELETE("/my-data", eraseAllData) // Admin's own data
		admin.POST("/test-email", testEmail) // Test email endpoint
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

	// SPA fallback: serve React app for all non-API routes
	router.NoRoute(func(c *gin.Context) {
		// Don't serve index.html for API routes
		if strings.HasPrefix(c.Request.URL.Path, "/api/") {
			c.JSON(http.StatusNotFound, gin.H{"error": "API endpoint not found"})
			return
		}
		// Serve the React app's index.html for all other routes
		c.File("./static/index.html")
	})

	// Configuration du serveur HTTP
	srv := &http.Server{
		Addr:    ":" + port,
		Handler: router,
	}

	// Démarrage du serveur en arrière-plan
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Erreur de démarrage du serveur: %s\n", err)
		}
	}()

	fmt.Printf("Serveur démarré sur le port %s\n", port)

	// Canal pour capturer les signaux d'arrêt
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	fmt.Println("Arrêt du serveur...")

	// Fermeture propre des connexions Redis
	storage.CloseRedisClient()

	// Arrêt graceful du serveur HTTP (5 secondes max)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("Timeout d'arrêt du serveur:", err)
	}

	fmt.Println("Serveur arrêté proprement")
}
