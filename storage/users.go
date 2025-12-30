package storage

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"math/big"
	"os"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
)

type User struct {
	ID            string `json:"id"`
	Username      string `json:"username"`
	Password      string `json:"password"`       // hashed
	Role          string `json:"role"`           // "user" or "admin"
	Email         string `json:"email,omitempty"` 
	EmailVerified bool   `json:"email_verified"`
	Created       int64  `json:"created"`
}

type UserClaims struct {
	UserID   string `json:"user_id"`
	Username string `json:"username"`
	Role     string `json:"role"`
	jwt.RegisteredClaims
}

type UserStorage struct {
	ctx   context.Context
	redis *redis.Client
	jwtSecret string
}

func NewUserStorage() *UserStorage {
	rdb := GetRedisClient()
	if rdb == nil {
		fmt.Println("Erreur: impossible d'obtenir une connexion Redis pour UserStorage")
		return nil
	}
	
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "your-secret-key" // Default for dev, should be env var in prod
	}

	fmt.Println("UserStorage créé avec connexion Redis partagée")
	return &UserStorage{
		ctx:       context.Background(),
		redis:     rdb,
		jwtSecret: jwtSecret,
	}
}

func (us *UserStorage) CreateUser(username, password string) (*User, error) {
	return us.CreateUserWithRole(username, password, "user")
}

func (us *UserStorage) CreateUserWithRole(username, password, role string) (*User, error) {
	// Check if user already exists
	exists := us.redis.HExists(us.ctx, "users", username)
	if exists.Val() {
		return nil, fmt.Errorf("user already exists")
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := &User{
		ID:       uuid.New().String(),
		Username: username,
		Password: string(hashedPassword),
		Role:     role,
		Created:  time.Now().Unix(),
	}

	// Store user in Redis
	userData, err := json.Marshal(user)
	if err != nil {
		return nil, err
	}

	err = us.redis.HSet(us.ctx, "users", username, string(userData)).Err()
	if err != nil {
		return nil, err
	}

	// Don't return password hash
	user.Password = ""
	return user, nil
}

func (us *UserStorage) AuthenticateUser(usernameOrEmail, password string) (*User, string, error) {
	var user *User
	var err error

	// Try to find user by username first
	userData := us.redis.HGet(us.ctx, "users", usernameOrEmail)
	if userData.Err() == nil {
		// Found by username
		var foundUser User
		err = json.Unmarshal([]byte(userData.Val()), &foundUser)
		if err == nil {
			user = &foundUser
		}
	} else if userData.Err() == redis.Nil {
		// Not found by username, try to find by email
		if strings.Contains(usernameOrEmail, "@") {
			user, err = us.GetUserByEmail(usernameOrEmail)
			if err != nil {
				return nil, "", fmt.Errorf("user not found")
			}
			// Need to get the full user with password for authentication
			fullUserData := us.redis.HGet(us.ctx, "users", user.Username)
			if fullUserData.Err() != nil {
				return nil, "", fmt.Errorf("user not found")
			}
			var fullUser User
			err = json.Unmarshal([]byte(fullUserData.Val()), &fullUser)
			if err != nil {
				return nil, "", err
			}
			user = &fullUser
		} else {
			return nil, "", fmt.Errorf("user not found")
		}
	} else {
		return nil, "", userData.Err()
	}

	// Check password
	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password))
	if err != nil {
		return nil, "", fmt.Errorf("invalid credentials")
	}

	// Generate JWT token
	claims := UserClaims{
		UserID:   user.ID,
		Username: user.Username,
		Role:     user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   user.ID,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(us.jwtSecret))
	if err != nil {
		return nil, "", err
	}

	// Don't return password hash
	user.Password = ""
	return user, tokenString, nil
}

func (us *UserStorage) ValidateToken(tokenString string) (*UserClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &UserClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(us.jwtSecret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*UserClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, fmt.Errorf("invalid token")
}

func (us *UserStorage) GetUser(username string) (*User, error) {
	userData := us.redis.HGet(us.ctx, "users", username)
	if userData.Err() != nil {
		if userData.Err() == redis.Nil {
			return nil, fmt.Errorf("user not found")
		}
		return nil, userData.Err()
	}

	var user User
	err := json.Unmarshal([]byte(userData.Val()), &user)
	if err != nil {
		return nil, err
	}

	// Don't return password hash
	user.Password = ""
	return &user, nil
}

func (us *UserStorage) EnsureAdminUser() error {
	adminUsername := os.Getenv("ADMIN_USERNAME")
	adminPassword := os.Getenv("ADMIN_PASSWORD")
	
	if adminUsername == "" || adminPassword == "" {
		return fmt.Errorf("admin credentials not configured")
	}

	// Check if admin already exists
	exists := us.redis.HExists(us.ctx, "users", adminUsername)
	if exists.Val() {
		return nil // Admin already exists
	}

	// Create admin user
	_, err := us.CreateUserWithRole(adminUsername, adminPassword, "admin")
	if err != nil {
		return fmt.Errorf("failed to create admin user: %w", err)
	}

	fmt.Printf("Admin user created: %s\n", adminUsername)
	return nil
}

func (us *UserStorage) GetAllUsers() ([]*User, error) {
	userMap := us.redis.HGetAll(us.ctx, "users")
	if userMap.Err() != nil {
		return nil, userMap.Err()
	}

	users := make([]*User, 0, len(userMap.Val()))
	for _, userData := range userMap.Val() {
		var user User
		err := json.Unmarshal([]byte(userData), &user)
		if err != nil {
			continue // Skip invalid user data
		}
		// Don't return password hash
		user.Password = ""
		users = append(users, &user)
	}

	return users, nil
}

// Email verification functions

func (us *UserStorage) GenerateVerificationCode() string {
	// Generate 6-digit code
	code := ""
	for i := 0; i < 6; i++ {
		digit, _ := rand.Int(rand.Reader, big.NewInt(10))
		code += digit.String()
	}
	return code
}

func (us *UserStorage) StoreVerificationCode(email, code string) error {
	key := fmt.Sprintf("email_verification:%s", email)
	err := us.redis.Set(us.ctx, key, code, 5*time.Minute).Err()
	if err != nil {
		return fmt.Errorf("failed to store verification code: %w", err)
	}
	fmt.Printf("Verification code stored for email %s\n", email)
	return nil
}

func (us *UserStorage) VerifyCode(email, inputCode string) (bool, error) {
	key := fmt.Sprintf("email_verification:%s", email)
	storedCode, err := us.redis.Get(us.ctx, key).Result()
	if err != nil {
		if err == redis.Nil {
			return false, fmt.Errorf("verification code expired or not found")
		}
		return false, err
	}

	if storedCode != inputCode {
		return false, fmt.Errorf("invalid verification code")
	}

	// Delete the code after successful verification
	us.redis.Del(us.ctx, key)
	return true, nil
}

func (us *UserStorage) UpdateUserEmail(userID, email string) error {
	// Get current user
	users, err := us.GetAllUsers()
	if err != nil {
		return err
	}

	var targetUser *User
	for _, user := range users {
		if user.ID == userID {
			targetUser = user
			break
		}
	}

	if targetUser == nil {
		return fmt.Errorf("user not found")
	}

	// Update email and mark as verified
	targetUser.Email = email
	targetUser.EmailVerified = true

	// Store updated user
	userData, err := json.Marshal(targetUser)
	if err != nil {
		return err
	}

	err = us.redis.HSet(us.ctx, "users", targetUser.Username, string(userData)).Err()
	if err != nil {
		return err
	}

	fmt.Printf("Email %s verified and updated for user %s\n", email, targetUser.Username)
	return nil
}

func (us *UserStorage) SetUserEmailUnverified(userID, email string) error {
	// Get current user
	users, err := us.GetAllUsers()
	if err != nil {
		return err
	}

	var targetUser *User
	for _, user := range users {
		if user.ID == userID {
			targetUser = user
			break
		}
	}

	if targetUser == nil {
		return fmt.Errorf("user not found")
	}

	// Update email but keep as unverified
	targetUser.Email = email
	targetUser.EmailVerified = false

	// Store updated user
	userData, err := json.Marshal(targetUser)
	if err != nil {
		return err
	}

	err = us.redis.HSet(us.ctx, "users", targetUser.Username, string(userData)).Err()
	if err != nil {
		return err
	}

	fmt.Printf("Email %s set (unverified) for user %s\n", email, targetUser.Username)
	return nil
}

func (us *UserStorage) SendVerificationEmail(email string) (string, error) {
	emailService := NewEmailService()
	if emailService == nil {
		return "", fmt.Errorf("email service not configured")
	}

	// Generate and store verification code
	code := us.GenerateVerificationCode()
	err := us.StoreVerificationCode(email, code)
	if err != nil {
		return "", err
	}

	// Send email
	err = emailService.SendVerificationCode(email, code)
	if err != nil {
		return "", fmt.Errorf("failed to send verification email: %w", err)
	}

	return code, nil
}

func (us *UserStorage) IsEmailTaken(email, currentUserID string) (bool, error) {
	users, err := us.GetAllUsers()
	if err != nil {
		return false, err
	}

	for _, user := range users {
		// Skip current user (they can update their own email)
		if user.ID == currentUserID {
			continue
		}
		// Check if email is already verified by another user
		if user.Email == email && user.EmailVerified {
			return true, nil
		}
	}

	return false, nil
}

func (us *UserStorage) GetUserByEmail(email string) (*User, error) {
	users, err := us.GetAllUsers()
	if err != nil {
		return nil, err
	}

	for _, user := range users {
		if user.Email == email && user.EmailVerified {
			// Don't return password hash
			user.Password = ""
			return user, nil
		}
	}

	return nil, fmt.Errorf("user not found")
}

func (us *UserStorage) GetUserByEmailIncludeUnverified(email string) (*User, error) {
	users, err := us.GetAllUsers()
	if err != nil {
		return nil, err
	}

	email = strings.TrimSpace(strings.ToLower(email))

	for _, user := range users {
		userEmail := strings.TrimSpace(strings.ToLower(user.Email))
		if userEmail == email {
			// Don't return password hash
			user.Password = ""
			return user, nil
		}
	}

	return nil, fmt.Errorf("user not found")
}

func (us *UserStorage) DeleteUserAccount(userID string) error {
	// Get user info first
	users, err := us.GetAllUsers()
	if err != nil {
		return err
	}

	var targetUser *User
	for _, user := range users {
		if user.ID == userID {
			targetUser = user
			break
		}
	}

	if targetUser == nil {
		return fmt.Errorf("user not found")
	}

	// Delete user from users hash
	err = us.redis.HDel(us.ctx, "users", targetUser.Username).Err()
	if err != nil {
		return fmt.Errorf("failed to delete user: %w", err)
	}

	// Delete user's event data
	userDataKeys := []string{
		fmt.Sprintf("user:%s:ts_events", userID),
		fmt.Sprintf("user:%s:ts_debug", userID),
	}

	for _, key := range userDataKeys {
		err = us.redis.Del(us.ctx, key).Err()
		if err != nil {
			fmt.Printf("Warning: failed to delete user data key %s: %v\n", key, err)
		}
	}

	// Clean up any pending verification codes for this user's email
	if targetUser.Email != "" {
		verificationKey := fmt.Sprintf("email_verification:%s", targetUser.Email)
		us.redis.Del(us.ctx, verificationKey)
	}

	fmt.Printf("User account deleted: %s (ID: %s)\n", targetUser.Username, userID)
	return nil
}

// Password reset functions

func (us *UserStorage) GeneratePasswordResetToken() string {
	// Generate secure random token
	token := ""
	for i := 0; i < 32; i++ {
		digit, _ := rand.Int(rand.Reader, big.NewInt(16))
		token += fmt.Sprintf("%x", digit)
	}
	return token
}

func (us *UserStorage) SendPasswordResetEmail(email string) error {
	emailService := NewEmailService()
	if emailService == nil {
		return fmt.Errorf("email service not configured")
	}

	// Generate and store reset token
	token := us.GeneratePasswordResetToken()
	err := us.StorePasswordResetToken(email, token)
	if err != nil {
		return err
	}

	// Send email with reset link
	err = emailService.SendPasswordResetLink(email, token)
	if err != nil {
		return fmt.Errorf("failed to send password reset email: %w", err)
	}

	return nil
}

func (us *UserStorage) StorePasswordResetToken(email, token string) error {
	key := fmt.Sprintf("password_reset:%s", token)
	err := us.redis.Set(us.ctx, key, email, 5*time.Minute).Err()
	if err != nil {
		return fmt.Errorf("failed to store password reset token: %w", err)
	}
	fmt.Printf("Password reset token stored for email %s\n", email)
	return nil
}

func (us *UserStorage) ResetPassword(token, newPassword string) error {
	// Get email from token
	key := fmt.Sprintf("password_reset:%s", token)
	email, err := us.redis.Get(us.ctx, key).Result()
	if err != nil {
		if err == redis.Nil {
			return fmt.Errorf("token expired or not found")
		}
		return err
	}

	// Check if user exists by email (including unverified)
	_, err = us.GetUserByEmailIncludeUnverified(email)
	if err != nil {
		return fmt.Errorf("user not found")
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	// Update user password
	users, err := us.GetAllUsers()
	if err != nil {
		return err
	}

	var targetUser *User
	for _, u := range users {
		if u.Email == email {
			targetUser = u
			break
		}
	}

	if targetUser == nil {
		return fmt.Errorf("user not found")
	}

	// Update password and mark email as verified (since they received the email)
	targetUser.Password = string(hashedPassword)
	targetUser.EmailVerified = true

	// Store updated user
	userData, err := json.Marshal(targetUser)
	if err != nil {
		return err
	}

	err = us.redis.HSet(us.ctx, "users", targetUser.Username, string(userData)).Err()
	if err != nil {
		return err
	}

	// Delete the reset token so it can't be used again
	us.redis.Del(us.ctx, key)

	fmt.Printf("Password reset successful for user %s (email %s now verified)\n", targetUser.Username, email)
	return nil
}