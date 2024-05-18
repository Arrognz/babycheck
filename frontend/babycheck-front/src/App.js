import React, { useEffect, useState } from 'react';
import logo from './logo.svg';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import Api from './api/Api';
import './App.css';
import Timeline from './Timeline';
import { faBed, faDroplet, faMoon, faPersonBreastfeeding, faPoo, faSun } from '@fortawesome/free-solid-svg-icons'
import Timer from './Timer';


const map = {
  undefined: 'Ne fais rien',
  'sleep': 'Dort',
  'leftBoob': 'Mange',
  'rightBoob': 'Mange',
  'wake': 'Est éveillé',
  'crying': 'Pleure',
}

function App() {
  const [babystate, setBabystate] = useState(undefined);
  const [lastChange, setLastChange] = useState(undefined);
  const [events, setEvents] = useState([]);
  const [mode, setMode] = useState('');

  useEffect(() => { 
    Api.getMode().then((response) => { 
      setMode(response.mode);
    })
  }, []);

  const remote = async (action) => {
    const response = await Api.remote(action);
    if (response.ok) {
      setBabystate(action);
      setLastChange(Date.now());
      fetchData();
    }
  }
  // api search from now - 6 hours to now
  const fetchData = React.useCallback(async () => {
    // await 2s
    await new Promise(resolve => setTimeout(resolve, 500));
    const response = await Api.search(new Date().getTime() - 24*60*60*1000, new Date().getTime());
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
  const isSleeping = babystate === 'sleep';
  if (isSleeping) {
    sleepClass = "sleep-button sleeping";
  }
  const isLeftBoob = babystate === 'leftBoob';
  let leftClass = "left-button";
  if (isLeftBoob) {
    leftClass = "left-button active";
  }
  const isRightBoob = babystate === 'rightBoob';
  let rightClass = "right-button";
  if (isRightBoob) {
    rightClass = "right-button active";
  }

  let peeClass = "pee-button";
  let pooClass = "poo-button";

  const lastSleep = events.filter(e => e.name === 'sleep').pop();
  const lastWake = events.filter(e => e.name === 'wake').pop();
  const last = lastSleep && lastWake && lastSleep.timestamp > lastWake.timestamp ? lastSleep : lastWake;
  
  return (
    <div className="App">
      <header className="App-header">
        <div style={{ position: 'absolute', fontSize: '8px', top: 3, right: 3, color: 'grey' }}>
          {mode}
        </div>
        <h1>Pacôme {map[babystate]}</h1>
        <Timeline
          events={events} 
          start={new Date().getTime() - 24*60*60*1000} 
          stop={new Date().getTime()}
        />
        {/* grid for buttons, two columns max */}
        <div className={gridClass}>
          <div className={sleepClass} onClick={() => {remote('sleep')}}>
            <span>{isSleeping?'Sommeil':'Eveil'}</span><br/>
            {isSleeping && <><FontAwesomeIcon icon={faMoon} fontSize={20} /></>}
            {!isSleeping && <><FontAwesomeIcon icon={faSun} fontSize={20} /></>}
            {last && <Timer from={last.timestamp} interval={5000}/>}
          </div>
          <div className="spacer" />
          <div className={leftClass} onClick={() => {remote('leftBoob')}}>
          <span>G</span><br/>
            {isLeftBoob && <><FontAwesomeIcon icon={faPersonBreastfeeding} fontSize={20} /></>}
            {!isLeftBoob && <><FontAwesomeIcon icon={faPersonBreastfeeding} fontSize={20} /></>}
            {isLeftBoob && <Timer from={lastChange} interval={5000} label={''}/>}
          </div>
          <div className={rightClass} onClick={() => {remote('rightBoob')}}>
            <span>D</span><br/>
            {isRightBoob && <><FontAwesomeIcon icon={faPersonBreastfeeding} fontSize={20} /></>}
            {!isRightBoob && <><FontAwesomeIcon icon={faPersonBreastfeeding} fontSize={20} /></>}
            {isRightBoob && <Timer from={lastChange} interval={5000} label={''}/>}
          </div>
          <div className="spacer" />
          <div className={peeClass} onClick={() => {remote('pee')}}>
            <FontAwesomeIcon icon={faDroplet} fontSize={20} />
          </div>
          <div className={pooClass} onClick={() => {remote('poop')}}>
            <FontAwesomeIcon icon={faPoo} fontSize={20} />
          </div>
        </div>
      </header>
    </div>
  );
}

export default App;
