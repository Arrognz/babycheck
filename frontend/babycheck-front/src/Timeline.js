import React from 'react';

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

function toHHMM(duration) {
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration - hours * 3600) / 60);
    const pad = (n) => n < 10 ? `0${n}` : n;
    if (hours > 0) {
        return `${hours}h${pad(minutes)}m`;
    }
    return `${minutes}m`;
}

const labelMap = {
    'poop': 'Caca',
    'pee': 'Pipi',
    'sleep': 'Dort',
    'leftBoobStart': 'Tête sein gauche',
    'rightBoobStart': 'Tête sein droit',
    'leftBoobStop': 'Lâche sein gauche',
    'rightBoobStop': 'Lâche sein droit',
    'crying': 'Pleure',
    'wake': 'Est éveillé',
}

export default function Timeline(props) {
    const events = props.events;
    const { start, stop } = props;
    if (events.length === 0) {
        return <div></div>
    }
    const sorted = events.sort((a, b) => b.timestamp - a.timestamp);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    return <div className="timeline-container">
        <div className="timeline">
            {
                sorted.map((event, index) => {
                    const left = (event.timestamp * 1000 - start) / (stop - start) * 100;
                    // if is last event, display duration
                    const isLast = event.id === last.id;
                    return <div key={index} className="timeline-event" style={{ left: `${left}%` }}>
                        <div>{labelMap[event.name]}</div>
                        {<div>{formatDate(event.timestamp * 1000)}</div>}
                    </div>
                })
            }
        </div>
    </div>
}