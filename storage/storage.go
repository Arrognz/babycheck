package storage

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

type Storage struct {
	ctx    context.Context
	redis  *redis.Client
	userID string
	keys   map[string]string
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

func NewStorage(userID string) *Storage {
	rdb := GetRedisClient()
	if rdb == nil {
		fmt.Printf("Erreur: impossible d'obtenir une connexion Redis pour l'utilisateur %s\n", userID)
		return nil
	}

	fmt.Printf("Storage créé pour l'utilisateur: %s\n", userID)
	st := &Storage{
		ctx:    context.Background(),
		redis:  rdb,
		userID: userID,
	}
	st.keys = map[string]string{
		"babyevents": fmt.Sprintf("user:%s:ts_events", userID),
		"debug":      fmt.Sprintf("user:%s:ts_debug", userID),
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

func (s *Storage) UpdateEvent(timestamp int64, newAction string) bool {
	// if GIN_MODE is not release, use debug bucket
	bucket := s.keys["babyevents"]
	if os.Getenv("GIN_MODE") != "release" {
		bucket = s.keys["debug"]
	}
	
	// Get the existing event
	events := s.redis.ZRangeByScore(s.ctx, bucket, &redis.ZRangeBy{
		Min: fmt.Sprintf("%d", timestamp-100),
		Max: fmt.Sprintf("%d", timestamp+100),
	})
	
	if events.Err() != nil || len(events.Val()) == 0 {
		fmt.Printf("No event found at timestamp %d\n", timestamp)
		return false
	}
	
	// Parse the existing event
	var existingEvent DBBabyEvent
	err := json.Unmarshal([]byte(events.Val()[0]), &existingEvent)
	if err != nil {
		fmt.Printf("Error unmarshaling event: %v\n", err)
		return false
	}
	
	// Create updated event
	updatedEvent := DBBabyEvent{
		ID:        existingEvent.ID,
		Timestamp: existingEvent.Timestamp,
		Name:      newAction,
		Author:    existingEvent.Author,
	}
	
	// Remove old event
	s.redis.ZRemRangeByScore(s.ctx, bucket, fmt.Sprintf("%d", timestamp-100), fmt.Sprintf("%d", timestamp+100))
	
	// Add updated event
	updatedJSON, err := updatedEvent.Json()
	if err != nil {
		fmt.Printf("Error marshaling updated event: %v\n", err)
		return false
	}
	
	res := s.redis.ZAdd(s.ctx, bucket, redis.Z{
		Score:  float64(updatedEvent.Timestamp),
		Member: updatedJSON,
	})
	
	fmt.Printf("Updated event at timestamp %d from %s to %s\n", timestamp, existingEvent.Name, newAction)
	return res.Err() == nil
}

func (s *Storage) GetAllData() []DBBabyEvent {
	bucket := s.keys["babyevents"]
	if os.Getenv("GIN_MODE") != "release" {
		bucket = s.keys["debug"]
	}
	zs := s.redis.ZRangeByScore(s.ctx, bucket, &redis.ZRangeBy{
		Min: "-inf",
		Max: "+inf",
	})
	events := make([]DBBabyEvent, len(zs.Val()))
	for i, z := range zs.Val() {
		var e DBBabyEvent
		json.Unmarshal([]byte(z), &e)
		events[i] = e
	}
	return events
}

func (s *Storage) EraseAll() bool {
	bucket := s.keys["babyevents"]
	if os.Getenv("GIN_MODE") != "release" {
		bucket = s.keys["debug"]
	}
	res := s.redis.Del(s.ctx, bucket)
	return res.Err() == nil
}

// BabyStats represents computed statistics for baby events
type BabyStats struct {
	SleepTime           int64   `json:"sleep_time"`           // Total sleep time in milliseconds
	SleepCount          int     `json:"sleep_count"`          // Number of sleep sessions (naps)
	AverageSleepTime    int64   `json:"average_sleep_time"`   // Average sleep session duration in milliseconds
	LeftBoobCount       int     `json:"left_boob_count"`      // Number of left breast feeds
	RightBoobCount      int     `json:"right_boob_count"`     // Number of right breast feeds
	LeftBoobDuration    int64   `json:"left_boob_duration"`   // Total left breast feed duration in milliseconds
	RightBoobDuration   int64   `json:"right_boob_duration"`  // Total right breast feed duration in milliseconds
	PeeCount           int     `json:"pee_count"`            // Number of pee events
	PoopCount          int     `json:"poop_count"`           // Number of poop events
	PeriodStart        int64   `json:"period_start"`         // Start timestamp of period
	PeriodEnd          int64   `json:"period_end"`           // End timestamp of period
}

// CalculateStats computes statistics for baby events within a time range
func (s *Storage) CalculateStats(start, end int64) *BabyStats {
	events := s.Search(start, end)
	
	// Check if we need to look back for incomplete sleep periods
	// If the first sleep-related event is "wake", baby was sleeping before the period
	var sleepStartBeforePeriod int64
	sleepRelatedEvents := make([]DBBabyEvent, 0)
	
	for _, event := range events {
		if event.Name == "sleep" || event.Name == "wake" {
			sleepRelatedEvents = append(sleepRelatedEvents, event)
		}
	}
	
	// If first sleep event is "wake", look for the corresponding "sleep" before the period
	if len(sleepRelatedEvents) > 0 && sleepRelatedEvents[0].Name == "wake" {
		// Search for events before the period start to find the sleep event
		olderEvents := s.Search(start-7*24*60*60*1000, start) // Look back up to 7 days
		
		// Find the most recent sleep event before the period
		for i := len(olderEvents) - 1; i >= 0; i-- {
			if olderEvents[i].Name == "sleep" {
				sleepStartBeforePeriod = olderEvents[i].Timestamp
				break
			}
		}
	}
	
	stats := &BabyStats{
		PeriodStart: start,
		PeriodEnd:   end,
	}
	
	var isSleeping bool
	var lastSleepStart int64
	var leftBoobStart, rightBoobStart int64
	var isEatingLeft, isEatingRight bool
	var sleepSessions []int64 // Track individual sleep session durations
	
	// If baby was sleeping before the period, initialize accordingly
	if sleepStartBeforePeriod > 0 {
		isSleeping = true
		lastSleepStart = sleepStartBeforePeriod
	}
	
	// Helper function to handle sleep interruption
	handleSleepInterruption := func(eventTimestamp int64) {
		if isSleeping {
			sleepDuration := eventTimestamp - lastSleepStart
			
			// If sleep started before period, only count time within the period
			if lastSleepStart < start {
				sleepDuration = eventTimestamp - start
				// Don't count as a completed session if it started before period
			} else {
				// Complete session within period
				stats.SleepCount++
				sleepSessions = append(sleepSessions, sleepDuration)
			}
			
			stats.SleepTime += sleepDuration
			isSleeping = false
		}
	}
	
	// Process events chronologically
	for _, event := range events {
		switch event.Name {
		case "sleep":
			if !isSleeping {
				isSleeping = true
				lastSleepStart = event.Timestamp
			}
			
		case "wake":
			handleSleepInterruption(event.Timestamp)
			
		case "leftBoob":
			if !isEatingLeft {
				stats.LeftBoobCount++
				leftBoobStart = event.Timestamp
				isEatingLeft = true
			}
			// If was sleeping, add sleep time and stop sleeping
			handleSleepInterruption(event.Timestamp)
			
		case "leftBoobStop":
			if isEatingLeft {
				stats.LeftBoobDuration += event.Timestamp - leftBoobStart
				isEatingLeft = false
			}
			
		case "rightBoob":
			if !isEatingRight {
				stats.RightBoobCount++
				rightBoobStart = event.Timestamp
				isEatingRight = true
			}
			// If was sleeping, add sleep time and stop sleeping
			handleSleepInterruption(event.Timestamp)
			
		case "rightBoobStop":
			if isEatingRight {
				stats.RightBoobDuration += event.Timestamp - rightBoobStart
				isEatingRight = false
			}
			
		case "pee":
			stats.PeeCount++
			// If was sleeping, add sleep time and stop sleeping
			handleSleepInterruption(event.Timestamp)
			
		case "poop":
			stats.PoopCount++
			// If was sleeping, add sleep time and stop sleeping
			handleSleepInterruption(event.Timestamp)
		}
	}
	
	// Handle ongoing states at the end of the period
	currentTime := end
	if isSleeping {
		ongoingSleepTime := currentTime - lastSleepStart
		
		// If sleep started before period, only count time within the period
		if lastSleepStart < start {
			ongoingSleepTime = currentTime - start
		}
		
		stats.SleepTime += ongoingSleepTime
		// Don't count ongoing sleep as a completed session for average calculation
	}
	if isEatingLeft {
		stats.LeftBoobDuration += currentTime - leftBoobStart
	}
	if isEatingRight {
		stats.RightBoobDuration += currentTime - rightBoobStart
	}
	
	// Calculate average sleep time from completed sessions only
	if stats.SleepCount > 0 {
		totalCompletedSleepTime := int64(0)
		for _, duration := range sleepSessions {
			totalCompletedSleepTime += duration
		}
		stats.AverageSleepTime = totalCompletedSleepTime / int64(stats.SleepCount)
	}
	
	return stats
}
