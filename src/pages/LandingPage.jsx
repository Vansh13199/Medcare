import React from 'react';
import { useNavigate } from 'react-router-dom';

// Simple medical icon
const StethoscopeIcon = () => (
  <svg className="h-16 w-16 text-purple-400" xmlns="/logo.svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h12M3.75 3.75h.008v.008H3.75V3.75Zm.375 0a2.25 2.25 0 0 1 2.25-2.25h15a2.25 2.25 0 0 1 2.25 2.25v15a2.25 2.25 0 0 1-2.25 2.25h-3.375m-12.75 0v-3.375A2.25 2.25 0 0 1 6 13.125h1.5" />
  </svg>
);

export default function LandingPage() {
  const navigate = useNavigate();

  const handleLoginClick = () => {
    navigate('/sign-in');
  };

  return (
    <div className="min-h-screen flex items-center justify-center 
                    bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-4">
      <div className="relative text-center bg-white shadow-2xl rounded-2xl p-8 max-w-lg w-full overflow-hidden">
        {/* Decorative background shape */}
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-48 h-48 bg-purple-200 rounded-full opacity-30"></div>
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-40 h-40 bg-blue-200 rounded-full opacity-30"></div>

        <div className="relative z-10">
          <div className="flex justify-center mb-4">
            <StethoscopeIcon />
          </div>
          
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Welcome to <span className="text-purple-600">MedCare</span>
          </h1>
          
          <p className="text-lg text-gray-600 mb-8">
            AI-Powered Prescription Analysis for Healthcare Professionals.
          </p>
          
          <button
            onClick={handleLoginClick}
            className="w-full inline-flex items-center justify-center px-8 py-3 border border-transparent 
                       rounded-lg shadow-md text-lg font-medium text-white 
                       bg-gradient-to-r from-purple-600 to-blue-600 
                       hover:from-purple-700 hover:to-blue-700
                       transition transform hover:scale-105"
          >
            Doctor Login
          </button>
        </div>
      </div>
    </div>
  );
}
