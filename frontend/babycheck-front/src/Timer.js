import { faHourglass, faStopwatch } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useEffect } from 'react';

export function toHHMM(duration) {
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration - hours * 3600) / 60);
    const seconds = duration - hours * 3600 - minutes * 60;
    const pad = (n) => n < 10 ? `0${n}` : n;
    if (hours > 0) {
        return `${hours}h${pad(minutes)}m`;
    }
    if (minutes < 10) {
        return `${pad(minutes)}m${pad(seconds.toFixed(0))}s`;
    }
    return `${pad(minutes)}m`;
}

export default function Timer(props) {
    const from = props.from;
    const label = props.label;
    const [time, setTime] = React.useState(Date.now() - from);
    const [isSpinning, setIsSpinning] = React.useState(false);
    useEffect(() => { 
        const id = setInterval(() => {
            setTime(Date.now() - from);
            setIsSpinning(!isSpinning);
            setTimeout(() => {
                setIsSpinning(false);
            }, 1000);
        }, props.interval || 1000);
        return () => {
            clearInterval(id);
        }
    }, [from, isSpinning, label]);
    return <div style={{ fontSize: '12px' }}>
        {label} {toHHMM(time / 1000)} <FontAwesomeIcon icon={faHourglass} spin={isSpinning} /> 
    </div>
}