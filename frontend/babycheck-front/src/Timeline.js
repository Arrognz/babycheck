import React from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faExchangeAlt } from "@fortawesome/free-solid-svg-icons";
import Api from './api/Api';

// An event is like this:
// {
    // timestamp
    // name
// }

export function roundDate(date, multipleOf = 5) {
    // rounds a date to the nearest 5 minutes
    const d = new Date(date);
    const minutes = d.getMinutes();
    const rounded = Math.round(minutes / multipleOf) * multipleOf;
    d.setMinutes(rounded);
    return d;

}

// enrich strings
export function formatDate(date) {
    // transforms a timestamp into the format:
    // DD/MM HH:MM if the timestamp is from yesterday or before
    // Otherwise, if today, HH:MM

    
    const d = new Date(date);
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

// Helper functions for switching event types
const canSwitchEvent = (eventName) => {
    return ['pee', 'poop', 'leftBoob', 'rightBoob'].includes(eventName);
};

const getSwitchTarget = (eventName) => {
    const switchMap = {
        'pee': 'poop',
        'poop': 'pee',
        'leftBoob': 'rightBoob',
        'rightBoob': 'leftBoob'
    };
    return switchMap[eventName];
};

const getSwitchLabel = (eventName) => {
    const target = getSwitchTarget(eventName);
    return target ? `Changer en ${labelMap[target]}` : '';
};

export default function Timeline(props) {
    const [showModal, setShowModal] = React.useState(false);
    const [modalEvent, setModalEvent] = React.useState(null); // event to display in modal
    const [touchTimer, setTouchTimer] = React.useState(null);
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
            <div style={{
                position: 'fixed',
                bottom: '0',
                left: '0',
                right: '0',
                background: '#2d3748',
                padding: '20px',
                borderTopLeftRadius: '12px',
                borderTopRightRadius: '12px',
                border: 'none',
                borderTop: '3px solid #7dd3fc',
                width: '100%',
                height: 'auto',
                zIndex: 100000,
                boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.5)',
                animation: 'slideUpFromBottom 0.2s ease-out'
            }}>
                <div className="modal-content" style={{ position: 'relative' }}>
                    <button 
                        className="close-button"
                        onClick={() => setShowModal(false)}
                        style={{
                            position: 'absolute',
                            top: '15px',
                            right: '15px',
                            background: '#f56565',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '30px',
                            height: '30px',
                            fontSize: '14px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
                        }}
                    >
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                    
                    <div style={{ textAlign: 'center', paddingRight: '50px' }}>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>
                            {labelMap[modalEvent.name]}
                        </h3>
                        <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#a0a0a0' }}>
                            à {formatDate(modalEvent.timestamp)}
                        </p>
                        
                        <div style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '12px', 
                            alignItems: 'center'
                        }}>
                            {canSwitchEvent(modalEvent.name) && (
                                <button 
                                    style={{ 
                                        padding: '10px 16px',
                                        backgroundColor: '#7dd3fc',
                                        color: '#1a202c',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        fontWeight: 'bold',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        whiteSpace: 'nowrap',
                                        width: '280px',
                                        justifyContent: 'center',
                                        textOverflow: 'ellipsis',
                                        overflow: 'hidden'
                                    }}
                                    onClick={async () => {
                                        const newAction = getSwitchTarget(modalEvent.name);
                                        await Api.updateEvent(modalEvent.timestamp, newAction);
                                        setShowModal(false);
                                        setModalEvent(null);
                                        // Refresh data
                                        window.location.reload();
                                    }}
                                >
                                    <FontAwesomeIcon icon={faExchangeAlt} />
                                    {getSwitchLabel(modalEvent.name)}
                                </button>
                            )}
                            
                            <button 
                                className="delete-button"
                                style={{ 
                                    padding: '10px 16px',
                                    backgroundColor: '#f56565',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    transition: 'background-color 0.2s',
                                    whiteSpace: 'nowrap',
                                    width: '280px',
                                    justifyContent: 'center',
                                    display: 'flex',
                                    alignItems: 'center'
                                }}
                                onClick={async () => { 
                                    // delete event
                                    Api.delete(modalEvent.timestamp);
                                    setShowModal(false);
                                    setModalEvent(null);
                                    // Refresh data
                                    window.location.reload();
                                }}
                                onMouseOver={(e) => e.target.style.backgroundColor = '#e53e3e'}
                                onMouseOut={(e) => e.target.style.backgroundColor = '#f56565'}
                            >
                                Supprimer
                            </button>
                        </div>
                    </div>
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
                            e.preventDefault();
                            setModalEvent(event)
                            setShowModal(true)
                        }}
                        onTouchStart={(e) => {
                            const timer = setTimeout(() => {
                                setModalEvent(event);
                                setShowModal(true);
                            }, 300); // 300ms long press
                            setTouchTimer(timer);
                        }}
                        onTouchEnd={() => {
                            if (touchTimer) {
                                clearTimeout(touchTimer);
                                setTouchTimer(null);
                            }
                        }}
                        onTouchMove={() => {
                            if (touchTimer) {
                                clearTimeout(touchTimer);
                                setTouchTimer(null);
                            }
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