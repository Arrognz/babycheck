import React, { useState } from 'react';
import logo from './logo.svg';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import Api from './api/Api';
import './App.css';
import { faBed } from '@fortawesome/free-solid-svg-icons'


const map = {
  undefined: 'Ne fais rien',
  1: 'Dort',
  2: 'Mange',
  3: 'Est éveillé',
}

// enrich strings
function toHHMMSS(duration) {
  var sec_num = parseInt(this, 10); // don't forget the second param
  var hours   = Math.floor(sec_num / 3600);
  var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
  var seconds = sec_num - (hours * 3600) - (minutes * 60);

  if (hours   < 10) {hours   = "0"+hours;}
  if (minutes < 10) {minutes = "0"+minutes;}
  if (seconds < 10) {seconds = "0"+seconds;}
  return (hours||'00')+':'+(minutes||'00')+':'+(seconds||'00');
}

function App() {
  const [babystate, setBabystate] = useState(undefined);
  const [lastChange, setLastChange] = useState(undefined);
  const stateduration = Date.now() - lastChange;
  return (
    <div className="App">
      <header className="App-header">
        <h1>Baby Check</h1>
        <p>{map[babystate]} depuis {toHHMMSS(stateduration)}</p>
        {/* grid for buttons, two columns max */}
        <div className="grid-container">
          <button className="grid-item">S'endort <FontAwesomeIcon icon={faBed} /></button>
          <button className="grid-item">Se reveille</button>
          <button className="grid-item">Sein gauche (début)</button>
          <button className="grid-item">Sein gauche (fin)</button>
          <button className="grid-item">Sein droit (début)</button>
          <button className="grid-item">Sein gauche (fin)</button>
          <button className="grid-item">Couche pipi</button>
          <button className="grid-item">Couche caca</button>
          <button className="grid-item">Couche mixte</button>
          <button className="grid-item">Pleure fort</button>
        </div>
      </header>
    </div>
  );
}

export default App;
