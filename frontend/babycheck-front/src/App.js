import React, { useEffect, useState } from 'react';
import logo from './logo.svg';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import Api from './api/Api';
import './App.css';
import Timeline from './Timeline';
import { faBed } from '@fortawesome/free-solid-svg-icons'


const map = {
  undefined: 'Ne fais rien',
  'sleep': 'Dort',
  'leftBoobStart': 'Mange',
  'rightBoobStart': 'Mange',
  'wake': 'Est éveillé',
  'crying': 'Pleure',
}

function App() {
  const [babystate, setBabystate] = useState(undefined);
  const [lastChange, setLastChange] = useState(undefined);
  const [events, setEvents] = useState([]);

  const remote = async (action) => {
    const response = await Api.remote(action);
    if (response.ok) {
      setBabystate(action);
      // setLastChange(response.lastChange);
    }
  }

  useEffect(() => {
    // api search from now - 6 hours to now
    const fetchData = async () => {
      const response = await Api.search(new Date().getTime() - 6*60*60*1000, new Date().getTime());
      setEvents(response.events);
    };
    fetchData();
  }, [babystate]);
  let gridClass = "grid-container";

  return (
    <div className="App">
      <header className="App-header">
        <h1>Pacôme</h1>
        <Timeline 
          events={events} 
          start={new Date().getTime() - 6*60*60*1000} 
          stop={new Date().getTime()}
        />
        {/* grid for buttons, two columns max */}
        <div className={gridClass}>
          <button className="grid-item" onClick={() => {remote('sleep')}}>S'endort</button>
          <button className="grid-item" onClick={() => {remote('wake')}}>Se reveille</button>
          <button className="grid-item" onClick={() => {remote('crying')}}>Pleure fort</button>
          <button className="grid-item" onClick={() => {remote('leftBoobStart')}}>Sein gauche (début)</button>
          <button className="grid-item" onClick={() => {remote('rightBoobStart')}}>Sein droit (début)</button>
          <button className="grid-item" onClick={() => {remote('pee')}}><img src="pee.png" height={24} /></button>
          <button className="grid-item" onClick={() => {remote('leftBoobStop')}}>Sein gauche (fin)</button>
          <button className="grid-item" onClick={() => {remote('rightBoobStop')}}>Sein droit (fin)</button>
          <button className="grid-item" onClick={() => {remote('poop')}}><img src="poop.png" height={24} /></button>
        </div>
      </header>
    </div>
  );
}

export default App;
