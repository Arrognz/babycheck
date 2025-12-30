import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Api from "./api/Api";
import "./App.css";
import Timeline from "./Timeline";
import {
  faBed,
  faAdd,
  faDroplet,
  faMoon,
  faPersonBreastfeeding,
  faPoo,
  faSun,
  faTimesCircle,
  faCircleNotch,
  faCheckCircle,
  faCog,
  faUser,
  faChartBar,
  faSpinner,
  faCalendarDays,
} from "@fortawesome/free-solid-svg-icons";
import Timer from "./Timer";
import { formatDate } from "./Timeline";
import DelaySelector from "./DelaySelector";

const map = {
  undefined: "État inconnu",
  sleep: "dort",
  nap: "Sieste",
  leftBoob: "tète",
  rightBoob: "tète",
  wake: "est éveillé",
  crying: "Pleure",
  pee: "Pipi",
  poop: "Caca",
};

const mapDetails = {
  leftBoob: "(G)",
  rightBoob: "(D)",
};

function BabyTracker({ user, onLogout }) {
  const [babystate, setBabystate] = useState(undefined);
  const [lastChange, setLastChange] = useState(undefined);
  const [isUpdatingState, setIsUpdatingState] = useState(false);
  const [events, setEvents] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalClosing, setModalClosing] = useState(false);

  // action form
  const [addAction, setAddAction] = useState("sleep");
  const [addActionTime, setAddActionTime] = useState(
    Date.now() - 5 * 60 * 1000
  );
  const [showDuration, setShowDuration] = useState(false);
  const [addActionDuration, setAddActionDuration] = useState(5);
  const [addOtherAction, setAddOtherAction] = useState(undefined);

  // add action loading
  const [showAddLoading, setShowAddLoading] = useState(false);
  const [showAddIcon, setShowAddIcon] = useState(faCheckCircle);
  const [showAddIconSpin, setShowAddIconSpin] = useState(false);

  useEffect(() => { 
    if (showAddModal) {
      setAddActionTime(Date.now());
      setAddActionDuration(5);
      setAddAction("sleep");
      setAddOtherAction(undefined);
      setShowDuration(false);
    }
  }, [showAddModal])


  const save = async (action, timestamp) => {
    const response = await Api.add(action, timestamp);
    if (response.ok) {
      console.log("saved");
    }
  };

  const remote = async (action) => {
    setIsUpdatingState(true);
    const response = await Api.remote(action);
    if (response.ok) {
      // Don't set state here - let refreshTimelineAndState handle it properly
      // This prevents timing conflicts and ensures immediate refresh
      await refreshTimelineAndState();
    }
    setIsUpdatingState(false);
  };

  // Function to refresh only the timeline events (fast, no delay)
  const refreshTimeline = React.useCallback(async () => {
    const response = await Api.search(
      new Date().getTime() - 24 * 60 * 60 * 1000,
      new Date().getTime()
    );
    const events = response.events || [];
    setEvents(events);
  }, []);

  // Function to update baby state based on events
  const updateBabyState = React.useCallback((events) => {
    // Find the most recent sleep-related event to determine current state
    const sleepRelatedEvents = events
      .filter(event => event.name === 'sleep' || event.name === 'wake')
      .sort((a, b) => b.timestamp - a.timestamp); // Sort by timestamp descending
    
    // Find the most recent feeding-related events
    const feedingEvents = events
      .filter(event => event.name === 'leftBoob' || event.name === 'rightBoob' || 
                       event.name === 'leftBoobStop' || event.name === 'rightBoobStop')
      .sort((a, b) => b.timestamp - a.timestamp); // Sort by timestamp descending
    
    const mostRecentSleepEvent = sleepRelatedEvents[0];
    const mostRecentFeedingEvent = feedingEvents[0];
    
    // Determine current state priority: feeding > sleeping/awake > undefined
    let newState = undefined;
    let newStateTimestamp = undefined;
    
    // Check if currently feeding (last feeding event was start, not stop)
    if (mostRecentFeedingEvent && 
        (mostRecentFeedingEvent.name === 'leftBoob' || mostRecentFeedingEvent.name === 'rightBoob')) {
      newState = mostRecentFeedingEvent.name;
      newStateTimestamp = mostRecentFeedingEvent.timestamp;
    } else if (mostRecentSleepEvent) {
      // Not feeding, check sleep state
      newState = mostRecentSleepEvent.name === 'sleep' ? 'sleep' : 'wake';
      newStateTimestamp = mostRecentSleepEvent.timestamp;
    }
    
    if (newState !== babystate || newStateTimestamp !== lastChange) {
      setBabystate(newState);
      setLastChange(newStateTimestamp);
    }
  }, [babystate, lastChange]);

  // Full refresh function (timeline + state, with delay for remote actions)
  const fetchData = React.useCallback(async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const response = await Api.search(
      new Date().getTime() - 24 * 60 * 60 * 1000,
      new Date().getTime()
    );
    const events = response.events || [];
    setEvents(events);
    updateBabyState(events);
  }, [updateBabyState]);

  // Fast refresh function for adding/editing events (timeline + state, no delay)
  const refreshTimelineAndState = React.useCallback(async () => {
    const response = await Api.search(
      new Date().getTime() - 24 * 60 * 60 * 1000,
      new Date().getTime()
    );
    const events = response.events || [];
    setEvents(events);
    updateBabyState(events);
  }, [updateBabyState]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  let gridClass = "actions-container";
  let sleepClass = "sleep-button";
  const isSleeping = babystate === "sleep";
  if (isSleeping) {
    sleepClass = "sleep-button sleeping";
  }
  const isLeftBoob = babystate === "leftBoob";
  let leftClass = "left-button";
  if (isLeftBoob) {
    leftClass = "left-button active";
  }
  const isRightBoob = babystate === "rightBoob";
  let rightClass = "right-button";
  if (isRightBoob) {
    rightClass = "right-button active";
  }

  let peeClass = "pee-button";
  let pooClass = "poo-button";

  let modalClass = "modal";
  if (modalClosing) {
    modalClass = "modal closed";
  }
  let validateLabel = `Ajouter ${map[addAction]} à ${formatDate(addActionTime)}`;
  if (addAction && addActionTime && !showDuration) {
    validateLabel = `Ajouter ${map[addAction]} à ${formatDate(addActionTime)}`;
  } else if (
    addAction &&
    addActionTime &&
    addActionTime.getTime &&
    addActionDuration
  ) {
    validateLabel = `Ajouter ${map[addAction]} de ${formatDate(
      addActionTime
    )} à ${formatDate(
      new Date(addActionTime.getTime() + addActionDuration * 60 * 1000)
    )}`;
  }


  return (
    <div className="App">
      <header className="App-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: '400px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <h1 style={{ margin: '0', fontSize: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {user?.username} {map[babystate]}
              {(babystate === 'leftBoob' || babystate === 'rightBoob') && (
                <FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: '16px', color: '#e879f9' }} />
              )}
            </h1>
            {lastChange && !isUpdatingState && (
              <div style={{ fontSize: '14px', color: '#a0a0a0', marginTop: '2px' }}>
                <Timer from={lastChange} interval={5000} label="Depuis " />
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
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
            <Link 
              to="/calendar"
              style={{ 
                padding: '4px 8px',
                backgroundColor: '#8b5a8c',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                textDecoration: 'none'
              }}
            >
              <FontAwesomeIcon icon={faCalendarDays} />
            </Link>
            <Link 
              to="/profile"
              style={{ 
                padding: '4px 8px',
                backgroundColor: '#4a5568',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                textDecoration: 'none'
              }}
            >
              <FontAwesomeIcon icon={faUser} />
            </Link>
            {user?.role === 'admin' && (
              <Link 
                to="/admin"
                style={{ 
                  padding: '4px 8px',
                  backgroundColor: '#2d3748',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  textDecoration: 'none'
                }}
              >
                <FontAwesomeIcon icon={faCog} />
              </Link>
            )}
          </div>
        </div>
        {showAddModal && (
          <div className={modalClass}>
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <h2>
                  Ajouter {map[addAction]} {mapDetails[addAction]}
                </h2>
                <FontAwesomeIcon
                  icon={faTimesCircle}
                  onClick={() => {
                    setModalClosing(true);
                    setTimeout(() => {
                      setShowAddModal(false);
                      setModalClosing(false);
                    }, 500);
                  }}
                />
              </div>
              <div
                className="addActions-container"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-evenly",
                  height: "5vh",
                }}
              >
                <div
                  className={"nap-button"}
                  style={
                    addAction === "nap"
                      ? { border: "3px solid #7dd3fc" }
                      : {}
                  }
                  onClick={() => {
                    setAddAction("nap");
                    setShowDuration(true);
                    setAddOtherAction("wake");
                  }}
                >
                  <FontAwesomeIcon icon={faBed} fontSize={20} />
                </div>
                <div
                  className={"sleep-button sleeping"}
                  style={
                    addAction === "sleep"
                      ? { border: "3px solid #7dd3fc" }
                      : {}
                  }
                  onClick={() => {
                    setAddAction("sleep");
                    setAddOtherAction(undefined);
                  }}
                >
                  <FontAwesomeIcon icon={faMoon} fontSize={20} />
                </div>
                <div
                  className={"sleep-button"}
                  style={
                    addAction === "wake"
                      ? { border: "3px solid #7dd3fc" }
                      : {}
                  }
                  onClick={() => {
                    setAddAction("wake");
                    setAddOtherAction(undefined);
                    setShowDuration(false);
                  }}
                >
                  <FontAwesomeIcon icon={faSun} fontSize={20} />
                </div>
                <div
                  className={"left-button"}
                  style={
                    addAction === "leftBoob"
                      ? { border: "3px solid #7dd3fc" }
                      : {}
                  }
                  onClick={() => {
                    setAddAction("leftBoob");
                    setAddOtherAction("leftBoobStop");
                    setShowDuration(true);
                  }}
                >
                  <span>G</span>
                  <br />
                  <FontAwesomeIcon icon={faPersonBreastfeeding} fontSize={20} />
                </div>
                <div
                  className={"right-button"}
                  style={
                    addAction === "rightBoob"
                      ? { border: "3px solid #7dd3fc" }
                      : {}
                  }
                  onClick={() => {
                    setAddAction("rightBoob");
                    setAddOtherAction("rightBoobStop");
                    setShowDuration(true);
                  }}
                >
                  <span>D</span>
                  <br />
                  <FontAwesomeIcon icon={faPersonBreastfeeding} fontSize={20} />
                </div>
                <div
                  className={"pee-button"}
                  style={
                    addAction === "pee"
                      ? { border: "3px solid #7dd3fc" }
                      : {}
                  }
                  onClick={() => {
                    setAddAction("pee");
                    setAddOtherAction(undefined);
                    setShowDuration(false);
                  }}
                >
                  <FontAwesomeIcon icon={faDroplet} fontSize={20} />
                </div>
                <div
                  className={"poo-button"}
                  style={
                    addAction === "poop"
                      ? { border: "3px solid #7dd3fc" }
                      : {}
                  }
                  onClick={() => {
                    setAddAction("poop");
                    setAddOtherAction(undefined);
                    setShowDuration(false);
                  }}
                >
                  <FontAwesomeIcon icon={faPoo} fontSize={20} />
                </div>
              </div>
            </div>
            <br />
            <DelaySelector
              default={5}
              step={5}
              before={"Il y a"}
              after={"minutes"}
              showTimeAfter
              value={addActionTime}
              onChange={(value) => {
                setAddActionTime(value);
              }}
            />
            <br />
            <br />
            {showDuration && (
              <>
                <DelaySelector
                  before={"pendant"}
                  after={"minutes"}
                  default={15}
                  step={5}
                  durationMode
                  value={addActionDuration}
                  showTimeAfter
                  start={
                    (addActionTime?.getTime && addActionTime.getTime()) ||
                    Date.now()
                  }
                  onChange={(val) => {
                    setAddActionDuration(val);
                  }}
                />
              </>
            )}
            <div
              className="button"
              onClick={async () => {
                if (addAction && addActionTime) {
                  setShowAddIcon('circle');
                  setShowAddLoading(true);
                  setShowAddIconSpin(true);
                  const a = addAction === "nap" ? "sleep" : addAction;
                  await save(a, addActionTime.getTime());
                  if (addActionDuration && addOtherAction) {
                    await save(
                      addOtherAction,
                      addActionTime.getTime() + addActionDuration * 60 * 1000
                    );
                  }
                  await refreshTimelineAndState();
                  setShowAddIcon('check');
                  setShowAddIconSpin(false);
                  setTimeout(() => {
                    setShowAddLoading(false);
                  }, 2500);
                }
              }}
            >
              {showAddLoading && <FontAwesomeIcon icon={showAddIcon === 'circle' ? faCircleNotch : faCheckCircle } spin={showAddIconSpin} style={{ marginRight: '4px', color: showAddIcon === 'circle' ? 'white' : 'springgreen' }}/>}{validateLabel}
            </div>
          </div>
        )}
        <Timeline
          events={events}
          start={new Date().getTime() - 24 * 60 * 60 * 1000}
          stop={new Date().getTime()}
        />
        {/* Responsive toolbar container */}
        <div className="toolbar-container">
          {/* Top row - Add button only */}
          <div className="top-toolbar">
            <div className={"add-button"} onClick={() => setShowAddModal(true)}>
              <FontAwesomeIcon icon={faAdd} fontSize={18} />
            </div>
          </div>
          
          {/* Bottom row - All other buttons */}
          <div className={gridClass}>
          <div
            className={sleepClass}
            onClick={() => {
              remote("sleep");
            }}
          >
            <span style={{ fontSize: '10px', fontWeight: 'bold' }}>
              {isSleeping ? "Reveil" : "Dodo"}
            </span>
            {isSleeping && (
              <FontAwesomeIcon
                icon={faMoon}
                fontSize={16}
                label={"dort depuis"}
              />
            )}
            {!isSleeping && (
              <FontAwesomeIcon
                icon={faSun}
                fontSize={16}
                label={"éveil depuis"}
              />
            )}
          </div>
          <div className="spacer" />
          <div
            className={leftClass}
            onClick={() => {
              remote("leftBoob");
            }}
          >
            <span style={{ fontSize: '10px', fontWeight: 'bold' }}>G</span>
            <FontAwesomeIcon icon={faPersonBreastfeeding} fontSize={16} />
          </div>
          <div
            className={rightClass}
            onClick={() => {
              remote("rightBoob");
            }}
          >
            <span style={{ fontSize: '10px', fontWeight: 'bold' }}>D</span>
            <FontAwesomeIcon icon={faPersonBreastfeeding} fontSize={16} />
          </div>
          <div className="spacer" />
          <div
            className={peeClass}
            onClick={() => {
              remote("pee");
            }}
          >
            <FontAwesomeIcon icon={faDroplet} fontSize={20} />
          </div>
          <div
            className={pooClass}
            onClick={() => {
              remote("poop");
            }}
          >
            <FontAwesomeIcon icon={faPoo} fontSize={20} />
          </div>
        </div>
        </div>
      </header>
    </div>
  );
}

export default BabyTracker;