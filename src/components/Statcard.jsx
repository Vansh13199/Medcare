import React from 'react';

// This component takes an icon, title, value, and color theme as props
export default function StatCard({ icon, title, value, colorTheme }) {
  
  // Define color classes based on the theme prop
  const colors = {
    blue: {
      bg: 'bg-blue-100',
      text: 'text-blue-700',
    },
    green: {
      bg: 'bg-green-100',
      text: 'text-green-700',
    },
    red: {
      bg: 'bg-red-100',
      text: 'text-red-700',
    },
  };
  
  const theme = colors[colorTheme] || colors.blue; // Default to blue

  return (
    <div className="bg-white shadow-lg rounded-xl p-6 flex items-center space-x-4">
      <div className={`rounded-full p-3 ${theme.bg}`}>
        <span className={theme.text}>{icon}</span>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">{title}</p>
        <p className="text-3xl font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}