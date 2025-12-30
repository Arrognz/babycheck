package storage

import (
	"context"
	"crypto/tls"
	"fmt"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

var (
	redisClient     *redis.Client
	clientMutex     sync.RWMutex
	lastCreated     time.Time
	connectionTTL   = 5 * time.Minute
)

// GetRedisClient retourne une connexion Redis partagée avec TTL
func GetRedisClient() *redis.Client {
	clientMutex.RLock()
	
	// Vérifier si le client existe et n'a pas expiré
	if redisClient != nil && time.Since(lastCreated) < connectionTTL {
		defer clientMutex.RUnlock()
		return redisClient
	}
	clientMutex.RUnlock()

	// Upgrade vers write lock pour créer une nouvelle connexion
	clientMutex.Lock()
	defer clientMutex.Unlock()

	// Double-check après avoir acquis le write lock
	if redisClient != nil && time.Since(lastCreated) < connectionTTL {
		return redisClient
	}

	// Fermer l'ancienne connexion si elle existe
	if redisClient != nil {
		fmt.Println("Fermature de l'ancienne connexion Redis (TTL expiré)")
		redisClient.Close()
	}

	// Créer une nouvelle connexion
	fmt.Println("Création d'une nouvelle connexion Redis avec TTL de 5 minutes")
	
	uri := os.Getenv("SCALINGO_REDIS_URL")
	opts, err := redis.ParseURL(uri)
	if err != nil {
		fmt.Printf("Erreur de parsing Redis URL: %v\n", err)
		return nil
	}

	// Configuration TLS pour rediss://
	if strings.HasPrefix(uri, "rediss") {
		opts.TLSConfig = &tls.Config{
			InsecureSkipVerify: true,
		}
	}

	// Configuration du pool de connexions
	opts.PoolSize = 10           // Maximum 10 connexions dans le pool
	opts.MinIdleConns = 2        // Minimum 2 connexions idle
	opts.PoolTimeout = 30 * time.Second
	opts.ConnMaxIdleTime = connectionTTL

	// Créer le client Redis
	redisClient = redis.NewClient(opts)
	lastCreated = time.Now()

	// Test de connexion
	ctx := context.Background()
	pong := redisClient.Ping(ctx)
	if pong.Err() != nil {
		fmt.Printf("Erreur de connexion Redis: %v\n", pong.Err())
		redisClient.Close()
		redisClient = nil
		return nil
	}

	fmt.Printf("Redis connecté avec succès (TLS: %v)\n", strings.HasPrefix(uri, "rediss"))
	return redisClient
}

// CloseRedisClient ferme proprement la connexion Redis
func CloseRedisClient() {
	clientMutex.Lock()
	defer clientMutex.Unlock()

	if redisClient != nil {
		fmt.Println("Fermeture de la connexion Redis")
		redisClient.Close()
		redisClient = nil
	}
}

// GetRedisStats retourne les statistiques de connexion
func GetRedisStats() map[string]interface{} {
	clientMutex.RLock()
	defer clientMutex.RUnlock()

	if redisClient == nil {
		return map[string]interface{}{
			"status": "disconnected",
		}
	}

	stats := redisClient.PoolStats()
	age := time.Since(lastCreated)
	remaining := connectionTTL - age

	return map[string]interface{}{
		"status":           "connected",
		"created_at":       lastCreated,
		"age":              age,
		"ttl_remaining":    remaining,
		"hits":             stats.Hits,
		"misses":           stats.Misses,
		"timeouts":         stats.Timeouts,
		"total_conns":      stats.TotalConns,
		"idle_conns":       stats.IdleConns,
		"stale_conns":      stats.StaleConns,
	}
}