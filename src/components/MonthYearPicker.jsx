// MonthYearPicker.jsx
import React from 'react';

function MonthYearPicker({ month, year, onChange }) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear - 2 + i);

  const handleMonthChange = (e) => {
    onChange(Number(e.target.value), year);
  };

  const handleYearChange = (e) => {
    onChange(month, Number(e.target.value));
  };

  return (
    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
      <select value={month} onChange={handleMonthChange}>
        {Array.from({ length: 12 }, (_, i) => (
          <option key={i + 1} value={i + 1}>
            {new Date(0, i).toLocaleString('default', { month: 'long' })}
          </option>
        ))}
      </select>
      <select value={year} onChange={handleYearChange}>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}

export default MonthYearPicker;
