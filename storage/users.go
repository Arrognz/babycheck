package storage

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
)

type User struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Password string `json:"password"` // hashed
	Role     string `json:"role"`     // "user" or "admin"
	Created  int64  `json:"created"`
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
	uri := os.Getenv("SCALINGO_REDIS_URL")
	opts, err := redis.ParseURL(uri)
	if err != nil {
		fmt.Println("error parsing redis URL: ", err)
		return nil
	}
	if strings.HasPrefix(uri, "rediss") {
		opts.TLSConfig = &tls.Config{
			InsecureSkipVerify: true,
		}
	}
	rdb := redis.NewClient(opts)
	
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "your-secret-key" // Default for dev, should be env var in prod
	}

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

func (us *UserStorage) AuthenticateUser(username, password string) (*User, string, error) {
	// Get user from Redis
	userData := us.redis.HGet(us.ctx, "users", username)
	if userData.Err() != nil {
		if userData.Err() == redis.Nil {
			return nil, "", fmt.Errorf("user not found")
		}
		return nil, "", userData.Err()
	}

	var user User
	err := json.Unmarshal([]byte(userData.Val()), &user)
	if err != nil {
		return nil, "", err
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
	return &user, tokenString, nil
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