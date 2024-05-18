import React from 'react';
import Api from './api/Api';

// An event is like this:
// {
    // timestamp
    // name
// }

// enrich strings
function formatDate(date) {
    // transforms a timestamp into the format:
    // DD/MM HH:MM if the timestamp is from yesterday or before
    // Otherwise, if today, HH:MM

    const d = new Date(date);
    const now = new Date();
    const pad = (n) => n < 10 ? `0${n}` : n;
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const labelMap = {
    'poop': 'Caca',
    'pee': 'Pipi',
    'sleep': 'Dort',
    'leftBoob': 'Tête sein gauche',
    'rightBoob': 'Tête sein droit',
    'leftBoobStop': 'Lâche sein gauche',
    'rightBoobStop': 'Lâche sein droit',
    'crying': 'Pleure',
    'wake': 'Est éveillé',
}

export default function Timeline(props) {
    const [showModal, setShowModal] = React.useState(false);
    const [modalEvent, setModalEvent] = React.useState(null); // event to display in modal
    const events = props.events;
    const { start, stop } = props;
    if (events.length === 0) {
        return <div></div>
    }
    const sorted = events.sort((a, b) => b.timestamp - a.timestamp);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    
    return <div className="timeline-container">
        {showModal && <div>
            <div className="modal">
                <div className="modal-content">
                    <span className="close" onClick={() => setShowModal(false)}>&times;</span>
                    <h2>{labelMap[modalEvent.name]}</h2>
                    <p>{formatDate(modalEvent.timestamp)}</p>
                    <button onClick={async () => { 
                        // delete event
                        Api.delete(modalEvent.timestamp);
                        setShowModal(false);
                        setModalEvent(null);
                    }}>Supprimer</button>
                </div>
            </div>
            </div>
        }
        <div className="timeline">
            {
                sorted.map((event, index) => {
                    const left = (event.timestamp - start) / (stop - start) * 100;
                    // if is last event, display duration
                    const isLast = event.id === last.id;
                    return <div
                        key={index}
                        className="timeline-event"
                        style={{ left: `${left}%` }}
                        onContextMenu={(e) => {
                            setModalEvent(event)
                            setShowModal(true)
                        }}
                        >
                        <div>{labelMap[event.name]}</div>
                        {<div>{formatDate(event.timestamp)}</div>}
                    </div>
                })
            }
        </div>
    </div>
}