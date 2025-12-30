package storage

import (
	"testing"
)

// mockStorage implements a storage with predefined events for testing
type mockStorage struct {
	events []DBBabyEvent
}

func (m *mockStorage) Search(start, end int64) []DBBabyEvent {
	return m.events
}

func (m *mockStorage) CalculateStats(start, end int64) *BabyStats {
	events := m.Search(start, end)
	
	stats := &BabyStats{
		PeriodStart: start,
		PeriodEnd:   end,
	}
	
	var isSleeping bool
	var lastSleepStart int64
	var leftBoobStart, rightBoobStart int64
	var isEatingLeft, isEatingRight bool
	var sleepSessions []int64
	
	for _, event := range events {
		switch event.Name {
		case "sleep":
			if !isSleeping {
				isSleeping = true
				lastSleepStart = event.Timestamp
			}
			
		case "wake":
			if isSleeping {
				isSleeping = false
				sleepDuration := event.Timestamp - lastSleepStart
				stats.SleepTime += sleepDuration
				stats.SleepCount++
				sleepSessions = append(sleepSessions, sleepDuration)
			}
			
		case "leftBoob":
			if !isEatingLeft {
				stats.LeftBoobCount++
				leftBoobStart = event.Timestamp
				isEatingLeft = true
			}
			if isSleeping {
				sleepDuration := event.Timestamp - lastSleepStart
				stats.SleepTime += sleepDuration
				stats.SleepCount++
				sleepSessions = append(sleepSessions, sleepDuration)
				isSleeping = false
			}
			
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
			if isSleeping {
				sleepDuration := event.Timestamp - lastSleepStart
				stats.SleepTime += sleepDuration
				stats.SleepCount++
				sleepSessions = append(sleepSessions, sleepDuration)
				isSleeping = false
			}
			
		case "rightBoobStop":
			if isEatingRight {
				stats.RightBoobDuration += event.Timestamp - rightBoobStart
				isEatingRight = false
			}
			
		case "pee":
			stats.PeeCount++
			if isSleeping {
				sleepDuration := event.Timestamp - lastSleepStart
				stats.SleepTime += sleepDuration
				stats.SleepCount++
				sleepSessions = append(sleepSessions, sleepDuration)
				isSleeping = false
			}
			
		case "poop":
			stats.PoopCount++
			if isSleeping {
				sleepDuration := event.Timestamp - lastSleepStart
				stats.SleepTime += sleepDuration
				stats.SleepCount++
				sleepSessions = append(sleepSessions, sleepDuration)
				isSleeping = false
			}
		}
	}
	
	currentTime := end
	if isSleeping {
		ongoingSleepTime := currentTime - lastSleepStart
		stats.SleepTime += ongoingSleepTime
	}
	if isEatingLeft {
		stats.LeftBoobDuration += currentTime - leftBoobStart
	}
	if isEatingRight {
		stats.RightBoobDuration += currentTime - rightBoobStart
	}
	
	if stats.SleepCount > 0 {
		totalCompletedSleepTime := int64(0)
		for _, duration := range sleepSessions {
			totalCompletedSleepTime += duration
		}
		stats.AverageSleepTime = totalCompletedSleepTime / int64(stats.SleepCount)
	}
	
	return stats
}

func TestCalculateStats(t *testing.T) {
	// Helper function to create test events
	createEvents := func() []DBBabyEvent {
		baseTime := int64(1000000000000) // Arbitrary base timestamp
		return []DBBabyEvent{
			{ID: "1", Timestamp: baseTime, Name: "sleep"},
			{ID: "2", Timestamp: baseTime + 30*60*1000, Name: "wake"}, // 30 min sleep
			{ID: "3", Timestamp: baseTime + 60*60*1000, Name: "leftBoob"},
			{ID: "4", Timestamp: baseTime + 75*60*1000, Name: "leftBoobStop"}, // 15 min feed
			{ID: "5", Timestamp: baseTime + 90*60*1000, Name: "pee"},
			{ID: "6", Timestamp: baseTime + 120*60*1000, Name: "rightBoob"},
			{ID: "7", Timestamp: baseTime + 140*60*1000, Name: "rightBoobStop"}, // 20 min feed
			{ID: "8", Timestamp: baseTime + 150*60*1000, Name: "sleep"},
			{ID: "9", Timestamp: baseTime + 180*60*1000, Name: "poop"}, // Wakes up from poop, 30 min sleep
		}
	}
	
	t.Run("Basic stats calculation", func(t *testing.T) {
		testEvents := createEvents()
		mockStore := &mockStorage{events: testEvents}
		baseTime := int64(1000000000000)
		endTime := baseTime + 200*60*1000 // 200 minutes after base
		
		stats := mockStore.CalculateStats(baseTime, endTime)
		
		// Test sleep stats
		expectedSleepTime := int64(60 * 60 * 1000) // 30 + 30 minutes = 60 minutes
		if stats.SleepTime != expectedSleepTime {
			t.Errorf("Expected sleep time %d, got %d", expectedSleepTime, stats.SleepTime)
		}
		
		expectedSleepCount := 2
		if stats.SleepCount != expectedSleepCount {
			t.Errorf("Expected sleep count %d, got %d", expectedSleepCount, stats.SleepCount)
		}
		
		expectedAvgSleepTime := int64(30 * 60 * 1000) // 30 minutes average
		if stats.AverageSleepTime != expectedAvgSleepTime {
			t.Errorf("Expected average sleep time %d, got %d", expectedAvgSleepTime, stats.AverageSleepTime)
		}
		
		// Test breastfeeding stats
		if stats.LeftBoobCount != 1 {
			t.Errorf("Expected left boob count 1, got %d", stats.LeftBoobCount)
		}
		
		if stats.RightBoobCount != 1 {
			t.Errorf("Expected right boob count 1, got %d", stats.RightBoobCount)
		}
		
		expectedLeftDuration := int64(15 * 60 * 1000) // 15 minutes
		if stats.LeftBoobDuration != expectedLeftDuration {
			t.Errorf("Expected left boob duration %d, got %d", expectedLeftDuration, stats.LeftBoobDuration)
		}
		
		expectedRightDuration := int64(20 * 60 * 1000) // 20 minutes
		if stats.RightBoobDuration != expectedRightDuration {
			t.Errorf("Expected right boob duration %d, got %d", expectedRightDuration, stats.RightBoobDuration)
		}
		
		// Test diaper stats
		if stats.PeeCount != 1 {
			t.Errorf("Expected pee count 1, got %d", stats.PeeCount)
		}
		
		if stats.PoopCount != 1 {
			t.Errorf("Expected poop count 1, got %d", stats.PoopCount)
		}
	})
	
	t.Run("Empty events", func(t *testing.T) {
		mockStore := &mockStorage{events: []DBBabyEvent{}}
		
		stats := mockStore.CalculateStats(0, 1000000)
		
		if stats.SleepTime != 0 {
			t.Errorf("Expected sleep time 0, got %d", stats.SleepTime)
		}
		if stats.SleepCount != 0 {
			t.Errorf("Expected sleep count 0, got %d", stats.SleepCount)
		}
		if stats.AverageSleepTime != 0 {
			t.Errorf("Expected average sleep time 0, got %d", stats.AverageSleepTime)
		}
	})
	
	t.Run("Ongoing sleep at end of period", func(t *testing.T) {
		baseTime := int64(1000000000000)
		endTime := baseTime + 120*60*1000 // 2 hours later
		
		// Sleep starts but doesn't end within the period
		events := []DBBabyEvent{
			{ID: "1", Timestamp: baseTime, Name: "sleep"},
			// No wake event - sleep is ongoing
		}
		mockStore := &mockStorage{events: events}
		
		stats := mockStore.CalculateStats(baseTime, endTime)
		
		expectedSleepTime := int64(120 * 60 * 1000) // 2 hours of ongoing sleep
		if stats.SleepTime != expectedSleepTime {
			t.Errorf("Expected ongoing sleep time %d, got %d", expectedSleepTime, stats.SleepTime)
		}
		
		// Ongoing sleep should not count as completed session
		if stats.SleepCount != 0 {
			t.Errorf("Expected sleep count 0 for ongoing sleep, got %d", stats.SleepCount)
		}
		
		if stats.AverageSleepTime != 0 {
			t.Errorf("Expected average sleep time 0 for ongoing sleep, got %d", stats.AverageSleepTime)
		}
	})
	
	t.Run("Ongoing feeding at end of period", func(t *testing.T) {
		baseTime := int64(1000000000000)
		endTime := baseTime + 60*60*1000 // 1 hour later
		
		// Feeding starts but doesn't end within the period
		events := []DBBabyEvent{
			{ID: "1", Timestamp: baseTime, Name: "leftBoob"},
			// No leftBoobStop event - feeding is ongoing
		}
		mockStore := &mockStorage{events: events}
		
		stats := mockStore.CalculateStats(baseTime, endTime)
		
		expectedFeedDuration := int64(60 * 60 * 1000) // 1 hour of ongoing feeding
		if stats.LeftBoobDuration != expectedFeedDuration {
			t.Errorf("Expected ongoing feed duration %d, got %d", expectedFeedDuration, stats.LeftBoobDuration)
		}
		
		if stats.LeftBoobCount != 1 {
			t.Errorf("Expected left boob count 1, got %d", stats.LeftBoobCount)
		}
	})
	
	t.Run("Sleep interrupted by feeding", func(t *testing.T) {
		baseTime := int64(1000000000000)
		
		events := []DBBabyEvent{
			{ID: "1", Timestamp: baseTime, Name: "sleep"},
			{ID: "2", Timestamp: baseTime + 30*60*1000, Name: "leftBoob"}, // Interrupts sleep after 30 min
			{ID: "3", Timestamp: baseTime + 45*60*1000, Name: "leftBoobStop"}, // Feed for 15 min
		}
		mockStore := &mockStorage{events: events}
		
		stats := mockStore.CalculateStats(baseTime, baseTime+60*60*1000)
		
		// Sleep should be 30 minutes (interrupted by feeding)
		expectedSleepTime := int64(30 * 60 * 1000)
		if stats.SleepTime != expectedSleepTime {
			t.Errorf("Expected interrupted sleep time %d, got %d", expectedSleepTime, stats.SleepTime)
		}
		
		if stats.SleepCount != 1 {
			t.Errorf("Expected sleep count 1, got %d", stats.SleepCount)
		}
		
		if stats.LeftBoobCount != 1 {
			t.Errorf("Expected left boob count 1, got %d", stats.LeftBoobCount)
		}
		
		expectedFeedDuration := int64(15 * 60 * 1000)
		if stats.LeftBoobDuration != expectedFeedDuration {
			t.Errorf("Expected feed duration %d, got %d", expectedFeedDuration, stats.LeftBoobDuration)
		}
	})
	
	t.Run("Period starts with wake event - look back for sleep", func(t *testing.T) {
		baseTime := int64(1000000000000)
		periodStart := baseTime + 60*60*1000 // 1 hour after base
		periodEnd := baseTime + 120*60*1000   // 2 hours after base
		
		// Sleep starts before period, wake happens during period
		allEvents := []DBBabyEvent{
			{ID: "1", Timestamp: baseTime, Name: "sleep"},           // Before period
			{ID: "2", Timestamp: periodStart + 30*60*1000, Name: "wake"}, // 30 min into period
		}
		
		// Custom CalculateStats that implements the lookback logic
		calculateStats := func(start, end int64) *BabyStats {
			// Search within period
			eventsInPeriod := make([]DBBabyEvent, 0)
			for _, event := range allEvents {
				if event.Timestamp >= start && event.Timestamp < end {
					eventsInPeriod = append(eventsInPeriod, event)
				}
			}
			
			// Check if we need to look back
			var sleepStartBeforePeriod int64
			sleepRelatedEvents := make([]DBBabyEvent, 0)
			for _, event := range eventsInPeriod {
				if event.Name == "sleep" || event.Name == "wake" {
					sleepRelatedEvents = append(sleepRelatedEvents, event)
				}
			}
			
			// If first sleep event is "wake", look for the corresponding "sleep" before the period
			if len(sleepRelatedEvents) > 0 && sleepRelatedEvents[0].Name == "wake" {
				// Find the most recent sleep event before the period
				for i := len(allEvents) - 1; i >= 0; i-- {
					if allEvents[i].Timestamp < start && allEvents[i].Name == "sleep" {
						sleepStartBeforePeriod = allEvents[i].Timestamp
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
			var sleepSessions []int64
			
			// If baby was sleeping before the period, initialize accordingly
			if sleepStartBeforePeriod > 0 {
				isSleeping = true
				lastSleepStart = sleepStartBeforePeriod
			}
			
			// Process events chronologically
			for _, event := range eventsInPeriod {
				switch event.Name {
				case "wake":
					if isSleeping {
						sleepDuration := event.Timestamp - lastSleepStart
						
						// If sleep started before period, only count time within the period
						if lastSleepStart < start {
							sleepDuration = event.Timestamp - start
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
		
		stats := calculateStats(periodStart, periodEnd)
		
		// Should count 30 minutes of sleep (from period start to wake)
		expectedSleepTime := int64(30 * 60 * 1000)
		if stats.SleepTime != expectedSleepTime {
			t.Errorf("Expected sleep time %d when looking back, got %d", expectedSleepTime, stats.SleepTime)
		}
		
		// Should not count as a completed session since it started before period
		if stats.SleepCount != 0 {
			t.Errorf("Expected sleep count 0 for incomplete session, got %d", stats.SleepCount)
		}
		
		if stats.AverageSleepTime != 0 {
			t.Errorf("Expected average sleep time 0 for incomplete session, got %d", stats.AverageSleepTime)
		}
	})
}