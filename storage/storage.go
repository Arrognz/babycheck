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
		"debug":      "ts_debug",
	}
	return st
}

func (s *Storage) Update(action string, ts time.Time) bool {
	uuid := uuid.New().String()
	bucket := s.keys["babyevents"]
	if os.Getenv("GIN_MODE") != "release" {
		bucket = s.keys["debug"]
	}
	lastEventRes := s.redis.ZRevRangeByScore(s.ctx, bucket, &redis.ZRangeBy{
		Min:    "-inf",
		Max:    "+inf",
		Offset: 0,
		Count:  1,
	})
	lastEvent := DBBabyEvent{}
	if len(lastEventRes.Val()) > 0 {
		json.Unmarshal([]byte(lastEventRes.Val()[0]), &lastEvent)
	}

	// if sleeping and receive sleep event, transform to wake
	if action == "sleep" && lastEvent.Name == "sleep" {
		action = "wake"
	}
	// if eating (leftBoob or rightBoob) and last event was eating, add stop
	if (action == "leftBoob" || action == "rightBoob") && (lastEvent.Name == "leftBoob" || lastEvent.Name == "rightBoob") {
		action += "Stop"
	}

	dbEvent := &DBBabyEvent{
		ID:        uuid,
		Timestamp: ts.UnixMilli(),
		Name:      action,
		Author:    "None",
	}
	jsonEvent, err := dbEvent.Json()
	if err != nil {
		fmt.Printf("Failed to marshal event: %+v\n", err)
		return false
	}
	zData := redis.Z{
		Score:  float64(ts.UnixMilli()),
		Member: jsonEvent,
	}
	// if GIN_MODE is not release, use debug bucket
	if os.Getenv("GIN_MODE") != "release" {
		s.redis.ZAdd(s.ctx, s.keys["debug"], zData)
	} else {
		s.redis.ZAdd(s.ctx, s.keys["babyevents"], zData)
	}
	return true
}

func (s *Storage) Search(start, end int64) []DBBabyEvent {
	bucket := s.keys["babyevents"]
	if os.Getenv("GIN_MODE") != "release" {
		bucket = s.keys["debug"]
	}
	zs := s.redis.ZRangeByScore(s.ctx, bucket, &redis.ZRangeBy{
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
	s.redis.Del(s.ctx, s.keys["debug"])
}

func (s *Storage) Delete(event int64) bool {
	// if GIN_MODE is not release, use debug bucket
	if os.Getenv("GIN_MODE") != "release" {
		s.redis.ZRemRangeByScore(s.ctx, s.keys["debug"], fmt.Sprintf("%d", event-1000), fmt.Sprintf("%d", event+1000))
	} else {
		s.redis.ZRemRangeByScore(s.ctx, s.keys["babycheck"], fmt.Sprintf("%d", event-1000), fmt.Sprintf("%d", event+1000))
	}
	return true
}
