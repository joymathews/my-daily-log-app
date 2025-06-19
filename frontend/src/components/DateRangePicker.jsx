import React from 'react';

function DateRangePicker({ startDate, endDate, onChange }) {
  return (
    <div className="date-range-picker-container">
      <label htmlFor="start-date" className="visually-hidden">Start Date</label>
      <input
        id="start-date"
        type="date"
        value={startDate}
        max={endDate}
        onChange={e => onChange({ startDate: e.target.value, endDate })}
      />
      <span>to</span>
      <label htmlFor="end-date" className="visually-hidden">End Date</label>
      <input
        id="end-date"
        type="date"
        value={endDate}
        min={startDate}
        onChange={e => onChange({ startDate, endDate: e.target.value })}
      />
    </div>
  );
}

export default DateRangePicker;
