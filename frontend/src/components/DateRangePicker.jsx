import React from 'react';

function DateRangePicker({ startDate, endDate, onChange }) {
  return (
    <div className="date-range-picker-container">
      <div className="date-input-group">
        <label htmlFor="start-date">From:</label>
        <input
          id="start-date"
          type="date"
          value={startDate}
          max={endDate}
          onChange={e => onChange({ startDate: e.target.value, endDate })}
          aria-label="Start date"
        />
      </div>
      
      <span>to</span>
      
      <div className="date-input-group">
        <label htmlFor="end-date">To:</label>
        <input
          id="end-date"
          type="date"
          value={endDate}
          min={startDate}
          onChange={e => onChange({ startDate, endDate: e.target.value })}
          aria-label="End date"
        />
      </div>
    </div>
  );
}

export default DateRangePicker;
