import React, { useEffect, useState } from "react";
import logo from "./logo.svg";
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
  faTimes,
  faTimesCircle,
} from "@fortawesome/free-solid-svg-icons";
import Timer, { toHHMM } from "./Timer";
import { formatDate } from "./Timeline";
import DelaySelector from "./DelaySelector";

const map = {
  undefined: "Ne fait rien",
  sleep: "Dort",
  leftBoob: "Mange",
  rightBoob: "Mange",
  wake: "Est éveillé",
  crying: "Pleure",
  pee: "Pipi",
  poop: "Caca",
};

const mapDetails = {
  leftBoob: "(G)",
  rightBoob: "(D)",
};

function App() {
  const [babystate, setBabystate] = useState(undefined);
  const [lastChange, setLastChange] = useState(undefined);
  const [events, setEvents] = useState([]);
  const [mode, setMode] = useState("");
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

  useEffect(() => {
    Api.getMode().then((response) => {
      setMode(response.mode);
    });
  }, []);

  const save = async (action, timestamp) => {
    const response = await Api.add(action, timestamp);
    if (response.ok) {
      console.log("saved");
    }
  };

  const remote = async (action) => {
    const response = await Api.remote(action);
    if (response.ok) {
      setBabystate(action);
      setLastChange(Date.now());
      fetchData();
    }
  };
  // api search from now - 6 hours to now
  const fetchData = React.useCallback(async () => {
    // await 2s
    await new Promise((resolve) => setTimeout(resolve, 500));
    const response = await Api.search(
      new Date().getTime() - 24 * 60 * 60 * 1000,
      new Date().getTime()
    );
    setEvents(response.events || []);
    const last = response.events[response.events.length - 1];
    if (last && last.name !== babystate) {
      setBabystate(last.name);
      setLastChange(last.timestamp);
    }
  });

  useEffect(() => {
    fetchData();
  }, []);
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

  const lastSleep = events.filter((e) => e.name === "sleep").pop();
  const lastWake = events.filter((e) => e.name === "wake").pop();
  const last =
    lastSleep && lastWake && lastSleep.timestamp > lastWake.timestamp
      ? lastSleep
      : lastWake;
  let modalClass = "modal";
  if (modalClosing) {
    modalClass = "modal closed";
  }
  let validateLabel = "";
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

  // sum sleep events
  let _isSleeping = false;
  let _sleepTime = 0;
  let _lastSleepStart = 0;
  let _leftBoobCount = 0;
  let _rightBoobCount = 0;
  let _lastLeftBoob = 0;
  let _lastRightBoob = 0;
  let _leftBoobDuration = 0;
  let _rightBoobDuration = 0;
  let peeCount = 0;
  let poopCount = 0;
  for (let i = 0; i < events.length; i++) {
    if (events[i].name === "sleep") {
      _isSleeping = true;
      _lastSleepStart = events[i].timestamp;
    }
    if (
      [
        "wake",
        "pee",
        "poop",
        "leftBoob",
        "rightBoob",
        "leftBoobStop",
        "rightBoobStop",
      ].includes(events[i].name) &&
      _isSleeping
    ) {
      _isSleeping = false;
      _sleepTime += events[i].timestamp - _lastSleepStart;
    }
    if (events[i].name === "leftBoob") {
      _leftBoobCount++;
      _lastLeftBoob = events[i].timestamp;
    }
    if (events[i].name === "rightBoob") {
      _rightBoobCount++;
      _lastRightBoob = events[i].timestamp;
    }
    if (events[i].name === "leftBoobStop") {
      _leftBoobDuration += events[i].timestamp - _lastLeftBoob;
    }
    if (events[i].name === "rightBoobStop") {
      _rightBoobDuration += events[i].timestamp - _lastRightBoob;
    }
    if (events[i].name === "pee") {
      peeCount++;
    }
    if (events[i].name === "poop") {
      poopCount++;
    }
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Pacôme {map[babystate]}</h1>
        <div style={{ fontSize: "12px", padding: '2px', margin: "2px" }}>
          <div>{toHHMM(_sleepTime / 1000)} de sommeil depuis 24h</div>
          <div>
            {_leftBoobCount} fois au sein gauche (
            {toHHMM(_leftBoobDuration / 1000)} au total)
          </div>
          <div>
            {_rightBoobCount} fois au sein droit (
            {toHHMM(_rightBoobDuration / 1000)} au total)
          </div>
          <div>
            {peeCount} pipis et {poopCount} cacas
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
                  className={"sleep-button sleeping"}
                  style={
                    addAction === "sleep"
                      ? { border: "3px solid dodgerblue" }
                      : {}
                  }
                  onClick={() => {
                    setAddAction("sleep");
                  }}
                >
                  <FontAwesomeIcon icon={faMoon} fontSize={20} />
                </div>
                <div
                  className={"sleep-button"}
                  style={
                    addAction === "wake"
                      ? { border: "3px solid dodgerblue" }
                      : {}
                  }
                  onClick={() => {
                    setAddAction("wake");
                    setShowDuration(false);
                  }}
                >
                  <FontAwesomeIcon icon={faSun} fontSize={20} />
                </div>
                <div
                  className={"left-button"}
                  style={
                    addAction === "leftBoob"
                      ? { border: "3px solid dodgerblue" }
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
                      ? { border: "3px solid dodgerblue" }
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
                      ? { border: "3px solid dodgerblue" }
                      : {}
                  }
                  onClick={() => {
                    setAddAction("pee");
                    setShowDuration(false);
                  }}
                >
                  <FontAwesomeIcon icon={faDroplet} fontSize={20} />
                </div>
                <div
                  className={"poo-button"}
                  style={
                    addAction === "poop"
                      ? { border: "3px solid dodgerblue" }
                      : {}
                  }
                  onClick={() => {
                    setAddAction("poop");
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
                  await save(addAction, addActionTime.getTime());
                  if (addActionDuration && addOtherAction) {
                    await save(
                      addOtherAction,
                      addActionTime.getTime() + addActionDuration * 60 * 1000
                    );
                  }
                  fetchData();
                }
              }}
            >
              {validateLabel}
            </div>
          </div>
        )}
        <Timeline
          events={events}
          start={new Date().getTime() - 24 * 60 * 60 * 1000}
          stop={new Date().getTime()}
        />
        {/* grid for buttons, two columns max */}
        <div className={gridClass}>
          <div
            className={sleepClass}
            onClick={() => {
              remote("sleep");
            }}
          >
            <span>{isSleeping ? "Reveil" : "Dodo"}</span>
            <br />
            {isSleeping && (
              <>
                <FontAwesomeIcon
                  icon={faMoon}
                  fontSize={20}
                  label={"dort depuis"}
                />
              </>
            )}
            {!isSleeping && (
              <>
                <FontAwesomeIcon
                  icon={faSun}
                  fontSize={20}
                  label={"éveil depuis"}
                />
              </>
            )}
            {last && <Timer from={last.timestamp} interval={5000} />}
          </div>
          <div className="spacer" />
          <div
            className={leftClass}
            style={_lastLeftBoob < _lastRightBoob ? { border: "2px dashed crimson" } : {}}
            onClick={() => {
              remote("leftBoob");
            }}
          >
            <span>G</span>
            <br />
            {isLeftBoob && (
              <>
                <FontAwesomeIcon icon={faPersonBreastfeeding} fontSize={20} />
              </>
            )}
            {!isLeftBoob && (
              <>
                <FontAwesomeIcon icon={faPersonBreastfeeding} fontSize={20} />
              </>
            )}
            {isLeftBoob && (
              <Timer from={lastChange} interval={5000} label={""} />
            )}
          </div>
          <div
            className={rightClass}
            style={_lastLeftBoob >= _lastRightBoob ? { border: "2px dashed crimson" } : {}}
            onClick={() => {
              remote("rightBoob");
            }}
          >
            <span>D</span>
            <br />
            {isRightBoob && (
              <>
                <FontAwesomeIcon icon={faPersonBreastfeeding} fontSize={20} />
              </>
            )}
            {!isRightBoob && (
              <>
                <FontAwesomeIcon icon={faPersonBreastfeeding} fontSize={20} />
              </>
            )}
            {isRightBoob && (
              <Timer from={lastChange} interval={5000} label={""} />
            )}
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
          <div className="spacer" />
          <div className={"add-button"} onClick={() => setShowAddModal(true)}>
            <FontAwesomeIcon icon={faAdd} fontSize={12} />
          </div>
        </div>
      </header>
    </div>
  );
}

export default App;
