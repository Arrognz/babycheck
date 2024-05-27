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

func (s *Storage) Save(timestamp int64, name string) bool {
	id := uuid.New().String()
	dbEvent := &DBBabyEvent{
		ID:        id,
		Timestamp: timestamp,
		Name:      name,
	}
	jsonEvent, err := dbEvent.Json()
	if err != nil {
		fmt.Printf("Failed to marshal event: %+v\n", err)
		return false
	}
	bucket := s.keys["babyevents"]
	if os.Getenv("GIN_MODE") != "release" {
		bucket = s.keys["debug"]
	}
	zData := redis.Z{
		Score:  float64(timestamp),
		Member: jsonEvent,
	}
	res := s.redis.ZAdd(s.ctx, bucket, zData)
	fmt.Println("Added: ", res.String())
	return res.Val() != 0
}

func (s *Storage) Update(action string, ts time.Time) bool {
	id := uuid.New().String()
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
	if (action == "leftBoob") && (lastEvent.Name == "leftBoob") {
		action += "Stop"
	}
	if (action == "rightBoob") && (lastEvent.Name == "rightBoob") {
		action += "Stop"
	}
	addWakeAction := false
	if (action == "pee" || action == "poo") && (lastEvent.Name == "sleep") {
		// Add a wake action
		addWakeAction = true
	}
	// if eating (leftBoob or rightBoob) and last event was sleeping, wake up
	if (action == "leftBoob" || action == "rightBoob") && (lastEvent.Name == "sleep") {
		addWakeAction = true
	}

	if addWakeAction {
		// Add a wake action
		wakeEvent := &DBBabyEvent{
			ID: uuid.New().String(),
			// Add 1ms to avoid conflicts
			Timestamp: time.Now().UnixMilli() - 1000,
			Name:      "wake",
			Author:    "None",
		}
		jsonWakeEvent, err := wakeEvent.Json()
		if err != nil {
			fmt.Printf("Failed to marshal event: %+v\n", err)
			return false
		}
		zWakeData := redis.Z{
			Score:  float64(wakeEvent.Timestamp),
			Member: jsonWakeEvent,
		}
		s.redis.ZAdd(s.ctx, bucket, zWakeData)
	}

	dbEvent := &DBBabyEvent{
		ID:        id,
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
	res := s.redis.ZAdd(s.ctx, bucket, zData)
	fmt.Println("Deleted: ", res.String())
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

func (s *Storage) ChangeTimestamp(event DBBabyEvent, newTimestamp int64) bool {
	// need to create a copy and remote the old one
	newEvent := event
	newEvent.Timestamp = newTimestamp
	jsonEvent, err := newEvent.Json()
	if err != nil {
		fmt.Printf("Failed to marshal event: %+v\n", err)
		return false
	}
	bucket := s.keys["babyevents"]
	// if GIN_MODE is not release, use debug bucket
	if os.Getenv("GIN_MODE") != "release" {
		bucket = s.keys["debug"]
	}

	// remove the old event
	s.Delete(event.Timestamp)
	zData := redis.Z{
		Score:  float64(newTimestamp),
		Member: jsonEvent,
	}
	s.redis.ZAdd(s.ctx, bucket, zData)
	return true
}

func (s *Storage) Delete(event int64) bool {
	// if GIN_MODE is not release, use debug bucket
	bucket := s.keys["babyevents"]
	if os.Getenv("GIN_MODE") != "release" {
		bucket = s.keys["debug"]
	}
	res := s.redis.ZRemRangeByScore(s.ctx, bucket, fmt.Sprintf("%d", event-100), fmt.Sprintf("%d", event+100))
	fmt.Println("Deleted: ", res.String())
	return res.Val() == 0
}
