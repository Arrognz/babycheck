import React from "react";
import { formatDate, roundDate } from "./Timeline";

const buttonStyle = {
    padding: "8px",
    background: "lightgray",
    borderRadius: "5px",
    color: "black",
}

export default function DelaySelector(props) {
  const { step, before, after, showTimeAfter, onChange, value, durationMode, start } = props;
  const [delay, setDelay] = React.useState(5);
  return (
    <div style={{
        display: 'inline-flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '8px'
    }}>
        {before}
      <div
        style={buttonStyle}
        onClick={() => {
            let next = delay - step;
            // if next is negative, set to 0
            if (next < 0) {
                next = 0;
            }
            setDelay(next);
            if (durationMode) {
                return onChange(next);
            }
            onChange(roundDate(Date.now() - next * 1000 * 60))
        }}
      >
        -
      </div>
      <div>{durationMode ? value : delay}</div>
      <div
        style={buttonStyle}
        onClick={() => {
            let next = delay + step;
            setDelay(next);
            if (durationMode) {
                return onChange(next);
            }
            onChange(roundDate(Date.now() - next * 1000 * 60))
        }}
      >
        +
      </div>
      {after}
      {showTimeAfter && <div>({formatDate(durationMode ? new Date(start + value * 1000 * 60): value)})</div>}
    </div>
  );
}
