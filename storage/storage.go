package storage

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

type Storage struct {
	ctx   context.Context
	redis *redis.Client

	keys map[string]string
}

type DBBabyEvent struct {
	ID        string `json:"id"`
	Timestamp int64  `json:"timestamp"`
	Name      string `json:"name"`
	Author    string `json:"author"` // Felix ou Mathilde
}

func (e *DBBabyEvent) Json() (string, error) {
	marshalled, err := json.Marshal(e)
	if err != nil {
		return "", err
	}
	return string(marshalled), nil
}

func NewStorage() *Storage {
	uri := os.Getenv("REDIS_URL")
	opts, err := redis.ParseURL(uri)
	fmt.Println("uri: ", uri)
	if err != nil {
		// Handle error
		fmt.Println("error: ", err)
		return nil
	}
	if strings.HasPrefix(uri, "rediss") {
		opts.TLSConfig = &tls.Config{
			InsecureSkipVerify: true,
		}
	}
	rdb := redis.NewClient(opts)
	fmt.Println("Redis connected")
	st := &Storage{
		ctx:   context.Background(),
		redis: rdb,
	}
	st.keys = map[string]string{
		"babyevents": "ts_events",
	}
	return st
}

func (s *Storage) Update(action string, time time.Time) bool {
	uuid := uuid.New().String()
	dbEvent := &DBBabyEvent{
		ID:        uuid,
		Timestamp: time.Unix(),
		Name:      action,
		Author:    "None",
	}
	jsonEvent, err := dbEvent.Json()
	if err != nil {
		fmt.Printf("Failed to marshal event: %+v\n", err)
		return false
	}
	zData := redis.Z{
		Score:  float64(time.UnixMilli()),
		Member: jsonEvent,
	}
	s.redis.ZAdd(s.ctx, s.keys["babyevents"], zData)
	return true
}

func (s *Storage) Search(start, end int64) []DBBabyEvent {
	zs := s.redis.ZRangeByScore(s.ctx, s.keys["babyevents"], &redis.ZRangeBy{
		Min: fmt.Sprintf("%d", start),
		Max: fmt.Sprintf("%d", end),
	})
	events := make([]DBBabyEvent, len(zs.Val()))
	for i, z := range zs.Val() {
		var e DBBabyEvent
		json.Unmarshal([]byte(z), &e)
		events[i] = e
	}

	return events
}

func (s *Storage) Erase() {
	s.redis.FlushDB(s.ctx)
}
