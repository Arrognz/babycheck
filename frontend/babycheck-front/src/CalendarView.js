import React, { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faArrowLeft, 
  faMoon, 
  faSun, 
  faDroplet, 
  faPoo, 
  faPersonBreastfeeding,
  faChevronLeft,
  faChevronRight,
  faChartBar,
  faTimes
} from "@fortawesome/free-solid-svg-icons";
import Api from "./api/Api";
import "./App.css";

// Event icon mapping
const eventIcons = {
  sleep: faMoon,
  wake: faSun,
  nap: faMoon,
  pee: faDroplet,
  poop: faPoo,
  leftBoob: faPersonBreastfeeding,
  rightBoob: faPersonBreastfeeding,
  leftBoobStop: null, // These are end events, not displayed directly
  rightBoobStop: null,
};

// Event colors (extracted from CSS classes)
const eventColors = {
  sleep: '#1e3a8a',
  wake: '#1e3a8a', 
  nap: '#3a4a5c',
  pee: '#2d5a2d',
  poop: '#5d4037',
  leftBoob: '#8b5a8c',
  rightBoob: '#8b5a8c',
};

function CalendarView() {
  const [events, setEvents] = useState({});
  const [currentDay, setCurrentDay] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD format
  });
  const [loading, setLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const loadTimeoutRef = useRef(null);
  
  // Touch gesture state
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  
  // Long press and icon wheel state
  const [showIconWheel, setShowIconWheel] = useState(false);
  const [wheelPosition, setWheelPosition] = useState({ x: 0, y: 0 });
  const [wheelTime, setWheelTime] = useState(null);
  const [selectedAction, setSelectedAction] = useState(null);
  const longPressTimeoutRef = useRef(null);
  const timelineRef = useRef(null);

  // Generate hour markers (00h to 23h)
  const hourMarkers = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    return `${hour}h`;
  });

  // Get current time position (0-1440 minutes from midnight)
  const getCurrentTimePosition = () => {
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    return (minutes / 1440) * 100; // percentage of day
  };

  // Convert timestamp to position (percentage from midnight)
  const timestampToPosition = (timestamp) => {
    const date = new Date(timestamp);
    const midnight = new Date(date);
    midnight.setHours(0, 0, 0, 0);
    
    const minutesFromMidnight = (timestamp - midnight.getTime()) / (1000 * 60);
    return (minutesFromMidnight / 1440) * 100; // percentage of day
  };

  // Calculate event duration in minutes
  const calculateDuration = (startTimestamp, endTimestamp) => {
    return (endTimestamp - startTimestamp) / (1000 * 60);
  };

  // Fetch events for a specific day
  const fetchDayEvents = useCallback(async (day) => {
    if (events[day] !== undefined) return; // Already loaded (including empty arrays)
    
    setLoading(true);
    try {
      const dayStart = new Date(day + 'T00:00:00.000Z').getTime();
      const dayEnd = new Date(day + 'T23:59:59.999Z').getTime();
      
      const response = await Api.search(dayStart, dayEnd);
      const dayEvents = response.events || [];
      
      setEvents(prev => ({
        ...prev,
        [day]: dayEvents
      }));
    } catch (error) {
      console.error('Error fetching day events:', error);
      setEvents(prev => ({
        ...prev,
        [day]: []
      }));
    }
    setLoading(false);
  }, [events]);

  // Debounced day loading function with sequential priority
  const debouncedLoadDay = useCallback((day) => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }
    
    loadTimeoutRef.current = setTimeout(async () => {
      const currentDate = new Date(day);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset to start of today for comparison
      
      // Previous day (yesterday)
      const prevDay = new Date(currentDate);
      prevDay.setDate(currentDate.getDate() - 1);
      const prevDayStr = prevDay.toISOString().split('T')[0];
      
      // Next day (tomorrow)
      const nextDay = new Date(currentDate);
      nextDay.setDate(currentDate.getDate() + 1);
      const nextDayStr = nextDay.toISOString().split('T')[0];
      
      try {
        // 1. First priority: Load the current day
        await fetchDayEvents(day);
        
        // 2. Second priority: Load yesterday
        await fetchDayEvents(prevDayStr);
        
        // 3. Third priority: Load tomorrow (only if it's not in the future)
        const tomorrowDate = new Date(nextDayStr + 'T00:00:00');
        if (tomorrowDate <= today) {
          await fetchDayEvents(nextDayStr);
        }
      } catch (error) {
        console.error('Error in sequential day loading:', error);
      }
    }, 500); // 500ms debounce as requested
  }, [fetchDayEvents]);

  // Navigation functions
  const goToPreviousDay = () => {
    setIsTransitioning(true);
    const currentDate = new Date(currentDay);
    currentDate.setDate(currentDate.getDate() - 1);
    const newDay = currentDate.toISOString().split('T')[0];
    setCurrentDay(newDay);
    debouncedLoadDay(newDay);
    setTimeout(() => setIsTransitioning(false), 200);
  };

  const goToNextDay = () => {
    setIsTransitioning(true);
    const currentDate = new Date(currentDay);
    currentDate.setDate(currentDate.getDate() + 1);
    const newDay = currentDate.toISOString().split('T')[0];
    setCurrentDay(newDay);
    debouncedLoadDay(newDay);
    setTimeout(() => setIsTransitioning(false), 200);
  };

  const goToToday = () => {
    setIsTransitioning(true);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    setCurrentDay(todayStr);
    debouncedLoadDay(todayStr);
    setTimeout(() => setIsTransitioning(false), 200);
  };

  // Calculate time from Y position in timeline
  const calculateTimeFromPosition = (clientY, timelineRect) => {
    const relativeY = clientY - timelineRect.top;
    const percentage = relativeY / timelineRect.height;
    const minutesFromMidnight = percentage * 1440; // 1440 minutes in a day
    
    const dayStart = new Date(currentDay + 'T00:00:00.000');
    return dayStart.getTime() + (minutesFromMidnight * 60 * 1000);
  };

  // Clamp wheel position to keep it visible on screen
  const clampWheelPosition = (x, y) => {
    const wheelRadius = 90; // Half of 180px wheel size
    const margin = Math.min(window.innerWidth, window.innerHeight) * 0.2; // 20% margin
    
    const clampedX = Math.max(wheelRadius + margin, Math.min(window.innerWidth - wheelRadius - margin, x));
    const clampedY = Math.max(wheelRadius + margin, Math.min(window.innerHeight - wheelRadius - margin, y));
    
    return { x: clampedX, y: clampedY };
  };

  // Check if current day is today
  const isToday = () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    return currentDay === todayStr;
  };

  // Mouse event handlers for long press (desktop)
  const handleMouseDown = (e) => {
    // Only show wheel on today
    if (!isToday()) return;
    
    // Store coordinates for timeout
    const clientX = e.clientX;
    const clientY = e.clientY;
    
    // Start long press timer for mouse
    longPressTimeoutRef.current = setTimeout(() => {
      if (timelineRef.current) {
        const rect = timelineRef.current.getBoundingClientRect();
        const time = calculateTimeFromPosition(clientY, rect);
        
        const clampedPosition = clampWheelPosition(clientX, clientY);
        setWheelPosition(clampedPosition);
        setWheelTime(time);
        setShowIconWheel(true);
      }
    }, 600); // 600ms long press threshold
  };

  const handleMouseUp = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };

  const handleMouseMove = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };

  // Touch event handlers for swipe navigation and long press
  const handleTouchStart = (e) => {
    setTouchEnd(null); // Reset touch end
    setTouchStart(e.targetTouches[0].clientX);
    
    // Only show wheel on today
    if (!isToday()) return;
    
    // Store coordinates for timeout
    const touch = e.targetTouches[0];
    const touchX = touch.clientX;
    const touchY = touch.clientY;
    
    // Start long press timer
    longPressTimeoutRef.current = setTimeout(() => {
      if (timelineRef.current) {
        const rect = timelineRef.current.getBoundingClientRect();
        const time = calculateTimeFromPosition(touchY, rect);
        
        const clampedPosition = clampWheelPosition(touchX, touchY);
        setWheelPosition(clampedPosition);
        setWheelTime(time);
        setShowIconWheel(true);
        
        // Prevent swipe navigation when showing wheel
        setTouchStart(null);
        setTouchEnd(null);
      }
    }, 600); // 600ms long press threshold
  };

  const handleTouchMove = (e) => {
    // Clear long press if user moves finger
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
    
    // Only track for swipe if not showing wheel
    if (!showIconWheel) {
      setTouchEnd(e.targetTouches[0].clientX);
    }
  };

  const handleTouchEnd = () => {
    // Clear long press timer
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
    
    // Only process swipe if wheel is not showing
    if (!showIconWheel && touchStart && touchEnd) {
      const distance = touchStart - touchEnd;
      const isLeftSwipe = distance > 50;
      const isRightSwipe = distance < -50;
      
      // Swipe left = next day, swipe right = previous day
      if (isLeftSwipe && !isTransitioning) {
        goToNextDay();
      }
      if (isRightSwipe && !isTransitioning) {
        goToPreviousDay();
      }
    }
  };

  // Save event API function
  const saveEvent = async (action, timestamp) => {
    try {
      const response = await Api.add(action, timestamp);
      if (response.ok) {
        // Refresh the current day's events after adding
        await refreshTimelineAndState();
      }
    } catch (error) {
      console.error('Error saving event:', error);
    }
  };

  // Get current baby state for wheel button states
  const getCurrentBabyState = () => {
    const dayEvents = events[currentDay] || [];
    
    // Check sleep state
    const sleepEvents = dayEvents
      .filter(event => event.name === 'sleep' || event.name === 'wake')
      .sort((a, b) => b.timestamp - a.timestamp);
    
    let sleepState = 'awake';
    if (sleepEvents.length > 0) {
      sleepState = sleepEvents[0].name === 'sleep' ? 'sleeping' : 'awake';
    }
    
    // Check feeding state
    const feedingEvents = dayEvents
      .filter(event => event.name === 'leftBoob' || event.name === 'rightBoob' || 
                       event.name === 'leftBoobStop' || event.name === 'rightBoobStop')
      .sort((a, b) => b.timestamp - a.timestamp);
    
    let feedingState = null;
    if (feedingEvents.length > 0) {
      const lastEvent = feedingEvents[0];
      if (lastEvent.name === 'leftBoob') {
        feedingState = 'leftBoob';
      } else if (lastEvent.name === 'rightBoob') {
        feedingState = 'rightBoob';
      }
    }
    
    return {
      sleep: sleepState,
      feeding: feedingState
    };
  };

  // Handle icon wheel selection (two-step interaction)
  const handleWheelSelection = async (action) => {
    if (!action) return;
    
    if (selectedAction === action.name) {
      // Second press - execute the action
      setShowIconWheel(false);
      setSelectedAction(null);
      
      // Determine the actual event to send based on current state
      let eventToSend = action.name;
      const currentState = getCurrentBabyState();
      
      if (action.name === 'leftBoob' && currentState.feeding === 'leftBoob') {
        eventToSend = 'leftBoobStop';
      } else if (action.name === 'rightBoob' && currentState.feeding === 'rightBoob') {
        eventToSend = 'rightBoobStop';
      }
      
      await saveEvent(eventToSend, Date.now());
    } else {
      // First press - show what this action means
      setSelectedAction(action.name);
    }
  };

  // Get wheel actions with current state-based availability
  const getWheelActions = () => {
    const currentState = getCurrentBabyState();
    
    // Dynamic labels based on current state
    const leftBoobLabel = currentState.feeding === 'leftBoob' ? 'Arrêter G' : 'Sein G';
    const rightBoobLabel = currentState.feeding === 'rightBoob' ? 'Arrêter D' : 'Sein D';
    
    return [
      { name: 'sleep', icon: faMoon, color: '#1e3a8a', label: 'Dodo', angle: -2*Math.PI/3, disabled: currentState.sleep === 'sleeping' }, // Top left (10 o'clock)
      { name: 'wake', icon: faSun, color: '#1e3a8a', label: 'Réveil', angle: -Math.PI/3, disabled: currentState.sleep === 'awake' }, // Top right (2 o'clock)
      { name: 'rightBoob', icon: faPersonBreastfeeding, color: '#8b5a8c', label: rightBoobLabel, angle: 0 }, // Right (3 o'clock) - Right breast on right side
      { name: 'pee', icon: faDroplet, color: '#2d5a2d', label: 'Pipi', angle: Math.PI/3 }, // Bottom right (4 o'clock)
      { name: 'poop', icon: faPoo, color: '#5d4037', label: 'Caca', angle: 2*Math.PI/3 }, // Bottom left (8 o'clock)
      { name: 'leftBoob', icon: faPersonBreastfeeding, color: '#8b5a8c', label: leftBoobLabel, transform: 'scaleX(-1)', angle: Math.PI } // Left (9 o'clock) - Left breast on left side
    ];
  };

  // Refresh timeline and state function
  const refreshTimelineAndState = useCallback(async () => {
    const dayStart = new Date(currentDay + 'T00:00:00.000Z').getTime();
    const dayEnd = new Date(currentDay + 'T23:59:59.999Z').getTime();
    
    const response = await Api.search(dayStart, dayEnd);
    const newEvents = response.events || [];
    setEvents(prev => ({
      ...prev,
      [currentDay]: newEvents
    }));
  }, [currentDay]);

  // Define column layout for event types
  const eventColumns = {
    sleep: { index: 0, width: '18%', name: 'Sommeil', icon: faMoon },
    pee: { index: 1, width: '18%', name: 'Pipi', icon: faDroplet },
    poop: { index: 2, width: '18%', name: 'Caca', icon: faPoo },
    leftBoob: { index: 3, width: '18%', name: 'Sein G', icon: faPersonBreastfeeding },
    rightBoob: { index: 4, width: '18%', name: 'Sein D', icon: faPersonBreastfeeding }
  };

  // Calculate column position based on event type
  const getColumnPosition = (eventName) => {
    const column = eventColumns[eventName];
    if (!column) return { left: '2%', width: '18%' };
    return {
      left: `${2 + column.index * 19}%`, // 2% margin + 19% per column (18% width + 1% gap)
      width: column.width
    };
  };

  // Process events to create duration-based events
  const processEvents = (dayEvents) => {
    if (!dayEvents) return [];
    
    const processed = [];
    const sleepSessions = {};
    const feedingSessions = {};

    dayEvents.forEach(event => {
      const { timestamp, name } = event;

      // Handle point events (pee, poop)
      if (name === 'pee' || name === 'poop') {
        const columnPos = getColumnPosition(name);
        processed.push({
          type: 'point',
          name,
          timestamp,
          position: timestampToPosition(timestamp),
          icon: eventIcons[name],
          color: eventColors[name],
          columnLeft: columnPos.left,
          columnWidth: columnPos.width
        });
      }
      // Handle sleep/wake
      else if (name === 'sleep') {
        sleepSessions.current = { start: timestamp, type: 'sleep' };
      }
      else if (name === 'wake' && sleepSessions.current) {
        const session = sleepSessions.current;
        const duration = calculateDuration(session.start, timestamp);
        const columnPos = getColumnPosition(session.type);
        processed.push({
          type: 'duration',
          name: session.type,
          startTimestamp: session.start,
          endTimestamp: timestamp,
          position: timestampToPosition(session.start),
          duration: duration,
          height: (duration / 1440) * 100, // percentage of day
          icon: eventIcons[session.type],
          color: eventColors[session.type],
          columnLeft: columnPos.left,
          columnWidth: columnPos.width
        });
        delete sleepSessions.current;
      }
      // Handle feeding
      else if (name === 'leftBoob' || name === 'rightBoob') {
        feedingSessions[name] = { start: timestamp, type: name };
      }
      else if (name === 'leftBoobStop' && feedingSessions.leftBoob) {
        const session = feedingSessions.leftBoob;
        const duration = calculateDuration(session.start, timestamp);
        const columnPos = getColumnPosition('leftBoob');
        processed.push({
          type: 'duration',
          name: 'leftBoob',
          startTimestamp: session.start,
          endTimestamp: timestamp,
          position: timestampToPosition(session.start),
          duration: duration,
          height: (duration / 1440) * 100,
          icon: eventIcons.leftBoob,
          color: eventColors.leftBoob,
          columnLeft: columnPos.left,
          columnWidth: columnPos.width
        });
        delete feedingSessions.leftBoob;
      }
      else if (name === 'rightBoobStop' && feedingSessions.rightBoob) {
        const session = feedingSessions.rightBoob;
        const duration = calculateDuration(session.start, timestamp);
        const columnPos = getColumnPosition('rightBoob');
        processed.push({
          type: 'duration',
          name: 'rightBoob',
          startTimestamp: session.start,
          endTimestamp: timestamp,
          position: timestampToPosition(session.start),
          duration: duration,
          height: (duration / 1440) * 100,
          icon: eventIcons.rightBoob,
          color: eventColors.rightBoob,
          columnLeft: columnPos.left,
          columnWidth: columnPos.width
        });
        delete feedingSessions.rightBoob;
      }
    });

    // Handle ongoing sessions (started but not ended)
    const now = Date.now();
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Only show ongoing events if we're viewing today
    if (currentDay === todayStr) {
      // Handle ongoing sleep
      if (sleepSessions.current) {
        const session = sleepSessions.current;
        const duration = calculateDuration(session.start, now);
        const columnPos = getColumnPosition(session.type);
        processed.push({
          type: 'duration',
          name: session.type,
          startTimestamp: session.start,
          endTimestamp: now,
          position: timestampToPosition(session.start),
          duration: duration,
          height: (duration / 1440) * 100,
          icon: eventIcons[session.type],
          color: eventColors[session.type],
          columnLeft: columnPos.left,
          columnWidth: columnPos.width,
          ongoing: true // Mark as ongoing
        });
      }

      // Handle ongoing feeding sessions
      Object.keys(feedingSessions).forEach(side => {
        if (feedingSessions[side]) {
          const session = feedingSessions[side];
          const duration = calculateDuration(session.start, now);
          const columnPos = getColumnPosition(session.type);
          processed.push({
            type: 'duration',
            name: session.type,
            startTimestamp: session.start,
            endTimestamp: now,
            position: timestampToPosition(session.start),
            duration: duration,
            height: (duration / 1440) * 100,
            icon: eventIcons[session.type],
            color: eventColors[session.type],
            columnLeft: columnPos.left,
            columnWidth: columnPos.width,
            ongoing: true // Mark as ongoing
          });
        }
      });
    }

    return processed.sort((a, b) => a.position - b.position);
  };

  // Load current day and adjacent days
  useEffect(() => {
    debouncedLoadDay(currentDay);
  }, [currentDay, debouncedLoadDay]);

  const currentDayEvents = processEvents(events[currentDay]);
  const currentTimePos = getCurrentTimePosition();

  return (
    <div className="App">
      <header className="App-header">
        {/* Header with back button and title */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: '400px', marginBottom: '20px' }}>
          <Link 
            to="/"
            style={{ 
              padding: '8px 12px',
              backgroundColor: '#4a5568',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FontAwesomeIcon icon={faArrowLeft} />
            Retour
          </Link>
          <h2 style={{ margin: 0, fontSize: '24px' }}>Calendrier</h2>
          <Link 
            to="/stats"
            style={{ 
              padding: '4px 8px',
              backgroundColor: '#4a90e2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              textDecoration: 'none'
            }}
          >
            <FontAwesomeIcon icon={faChartBar} />
          </Link>
        </div>

        {/* Date navigation */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          gap: '20px',
          marginBottom: '20px',
          width: '100%',
          maxWidth: '400px'
        }}>
          <button 
            onClick={goToPreviousDay}
            disabled={isTransitioning}
            style={{
              padding: '8px',
              backgroundColor: '#4a5568',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              cursor: isTransitioning ? 'not-allowed' : 'pointer',
              opacity: isTransitioning ? 0.5 : 1
            }}
          >
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>
          
          <div style={{ 
            flex: 1,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <div style={{ fontSize: '16px', color: '#e0e0e0', fontWeight: 'bold' }}>
              {new Date(currentDay + 'T12:00:00').toLocaleDateString('fr-FR', { 
                weekday: 'long', 
                day: 'numeric',
                month: 'long'
              })}
            </div>
            <button
              onClick={goToToday}
              disabled={isToday()}
              style={{
                marginTop: '4px',
                padding: '2px 8px',
                backgroundColor: 'transparent',
                color: isToday() ? '#666666' : '#7dd3fc',
                border: `1px solid ${isToday() ? '#666666' : '#7dd3fc'}`,
                borderRadius: '4px',
                fontSize: '12px',
                cursor: isToday() ? 'not-allowed' : 'pointer',
                opacity: isToday() ? 0.5 : 1
              }}
            >
              Aujourd'hui
            </button>
          </div>
          
          <button 
            onClick={goToNextDay}
            disabled={isTransitioning}
            style={{
              padding: '8px',
              backgroundColor: '#4a5568',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              cursor: isTransitioning ? 'not-allowed' : 'pointer',
              opacity: isTransitioning ? 0.5 : 1
            }}
          >
            <FontAwesomeIcon icon={faChevronRight} />
          </button>
        </div>

        {/* Column headers */}
        <div style={{
          width: '100%',
          maxWidth: '400px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#1a1a1a',
          borderRadius: '8px 8px 0 0',
          borderBottom: '1px solid #4a5568',
          marginBottom: '0'
        }}>
          {/* Hour markers space */}
          <div style={{
            width: '40px',
            height: '100%',
            backgroundColor: '#1a1a1a',
            borderRight: '1px solid #4a5568'
          }} />
          
          {/* Column headers */}
          <div style={{
            flex: 1,
            height: '100%',
            position: 'relative',
            backgroundColor: '#1a1a1a'
          }}>
            {Object.entries(eventColumns).map(([key, column]) => (
              <div key={key} style={{
                position: 'absolute',
                left: `${2 + column.index * 19}%`,
                width: column.width,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px'
              }}>
                <FontAwesomeIcon icon={column.icon} 
                  style={{ 
                    fontSize: '14px', 
                    color: eventColors[key] || '#a0a0a0',
                    transform: key === 'leftBoob' ? 'scaleX(-1)' : 'none'
                  }} 
                />
                <span style={{
                  fontSize: '10px',
                  color: '#e0e0e0',
                  fontWeight: 'bold',
                  textAlign: 'center'
                }}>
                  {column.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Calendar timeline container */}
        <div 
          style={{ 
            width: '100%', 
            maxWidth: '400px', 
            height: 'calc(100vh - 240px)', // Reduced to account for header
            minHeight: '360px', // Reduced to account for header
            position: 'relative',
            backgroundColor: '#2d3748',
            borderRadius: '0 0 8px 8px',
            overflow: 'hidden',
            opacity: isTransitioning ? 0.7 : 1,
            transition: 'opacity 0.2s ease',
            touchAction: 'pan-y' // Allow vertical scrolling but handle horizontal swipes
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          onContextMenu={(e) => e.preventDefault()} // Prevent browser context menu
        >
          {/* Hour markers */}
          <div style={{
            position: 'absolute',
            left: '0',
            top: '0',
            width: '40px',
            height: '100%',
            backgroundColor: '#1a1a1a',
            borderRight: '1px solid #4a5568'
          }}>
            {hourMarkers.map((hour, index) => (
              <div key={hour} style={{
                position: 'absolute',
                top: `${(index / 24) * 100}%`,
                left: '4px',
                fontSize: '10px',
                color: '#a0a0a0',
                lineHeight: '1'
              }}>
                {hour}
              </div>
            ))}
          </div>

          {/* Timeline area */}
          <div 
            ref={timelineRef}
            className="timeline-area"
            style={{
              marginLeft: '40px',
              height: '100%',
              position: 'relative',
              backgroundColor: '#374151'
            }}
          >
            {/* Current time indicator */}
            <div style={{
              position: 'absolute',
              top: `${currentTimePos}%`,
              left: '0',
              right: '0',
              height: '2px',
              backgroundColor: '#ef4444',
              opacity: 0.5,
              zIndex: 10
            }} />

            {/* Hour grid lines */}
            {hourMarkers.map((_, index) => (
              <div key={index} style={{
                position: 'absolute',
                top: `${(index / 24) * 100}%`,
                left: '0',
                right: '0',
                height: '1px',
                backgroundColor: '#4a5568',
                opacity: 0.3
              }} />
            ))}

            {/* Events */}
            {currentDayEvents.map((event, index) => (
              <div key={index} style={{
                position: 'absolute',
                top: `${event.position}%`,
                left: event.columnLeft,
                width: event.type === 'point' ? '24px' : event.columnWidth,
                height: event.type === 'point' ? '24px' : `${event.height}%`,
                backgroundColor: event.color,
                borderRadius: event.type === 'point' ? '50%' : '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '12px',
                zIndex: 5,
                border: event.ongoing ? '2px solid #7dd3fc' : '1px solid rgba(255,255,255,0.2)',
                opacity: event.ongoing ? 0.9 : 1,
                animation: event.ongoing ? 'pulse 2s ease-in-out infinite alternate' : 'none'
              }}>
                <FontAwesomeIcon icon={event.icon} />
              </div>
            ))}
          </div>
        </div>

        {/* Icon Wheel */}
        {showIconWheel && (
          <>
            {/* Backdrop to close wheel */}
            <div 
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.3)',
                zIndex: 1000
              }}
              onClick={() => {
                setShowIconWheel(false);
                setSelectedAction(null);
              }}
            />
            
            {/* Icon Wheel */}
            <div style={{
              position: 'fixed',
              left: wheelPosition.x - 90,
              top: wheelPosition.y - 90,
              width: '180px',
              height: '180px',
              zIndex: 1001,
              pointerEvents: 'auto'
            }}>
              {/* Center circle with action feedback */}
              <div style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: '60px',
                height: '60px',
                backgroundColor: '#1a1a1a',
                border: '2px solid #4a5568',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1003
              }}>
                {selectedAction && (
                  <span style={{
                    fontSize: '10px',
                    color: '#7dd3fc',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    lineHeight: 1
                  }}>
                    {getWheelActions().find(a => a.name === selectedAction)?.label}
                  </span>
                )}
              </div>

              {/* Action icons in circle */}
              {getWheelActions().map((action, index) => {
                const angle = action.angle; // Use predefined angle for specific positioning
                const radius = 65; // Increased radius for larger wheel
                const x = 90 + radius * Math.cos(angle);
                const y = 90 + radius * Math.sin(angle);

                return (
                  <div
                    key={action.name}
                    style={{
                      position: 'absolute',
                      left: x - 25,
                      top: y - 25,
                      width: '50px',
                      height: '50px',
                      backgroundColor: action.disabled ? '#666666' : action.color,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: action.disabled ? 'not-allowed' : 'pointer',
                      border: selectedAction === action.name ? '3px solid #7dd3fc' : '3px solid #1a1a1a',
                      animation: `fadeIn 0.3s ease ${index * 0.05}s both`,
                      zIndex: 1002,
                      opacity: action.disabled ? 0.5 : 1,
                      transform: selectedAction === action.name ? 'scale(1.1)' : 'scale(1)',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => !action.disabled && handleWheelSelection(action)}
                  >
                    <FontAwesomeIcon 
                      icon={action.icon} 
                      style={{ 
                        fontSize: '20px', 
                        color: 'white',
                        transform: action.transform || 'none'
                      }} 
                    />
                  </div>
                );
              })}
            </div>
          </>
        )}
      </header>
    </div>
  );
}

export default CalendarView;