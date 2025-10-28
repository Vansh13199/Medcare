import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import Navbar from '../components/Navbar';
import StatCard from '../components/Statcard';
import axios from 'axios';

// --- Icons (unchanged) ---
const UsersIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);
const ClipboardIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
);
const AlertIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

export default function DashboardPage() {
  const { user } = useUser();
  
  // --- State to hold dynamic stats ---
  const [stats, setStats] = useState({
    totalPatients: 0,
    prescriptionsToday: 0,
    highRiskAlerts: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // --- Fetch stats from the backend when the page loads ---
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get('http://localhost:3001/api/stats');
        setStats(response.data);
      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
        // Keep default 0 values if fetch fails
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStats();
  }, []); // Empty array ensures this runs only once on mount


  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      {/* Page Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold leading-tight text-gray-900">
            Welcome, Dr. {user ? user.firstName : 'Doctor'}!
          </h1>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        
        {/* --- 1. Dynamic Stat Cards Section --- */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-6">
          <StatCard 
            icon={UsersIcon}
            title="Total Patients"
            value={isLoading ? '...' : stats.totalPatients}
            colorTheme="blue"
          />
          <StatCard 
            icon={ClipboardIcon}
            title="Prescriptions Today"
            value={isLoading ? '...' : stats.prescriptionsToday}
            colorTheme="green"
          />
          <StatCard 
            icon={AlertIcon}
            title="High-Risk Alerts"
            value={isLoading ? '...' : stats.highRiskAlerts}
            colorTheme="red"
          />
        </div>

        {/* --- 2. Quick Actions & Activity Feed Section --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Quick Actions Card */}
          <div className="bg-white shadow-lg rounded-xl p-6 lg:col-span-1">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="flex flex-col space-y-4">
              <NavLink 
                to="/patients/new" 
                className="w-full text-center px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-md transition"
              >
                Add New Patient
              </NavLink>
              <NavLink 
                to="/patients" 
                className="w-full text-center px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium shadow-md transition"
              >
                Find a Patient
              </NavLink>
            </div>
          </div>

          {/* Recent Activity Card (Placeholder) */}
          <div className="bg-white shadow-lg rounded-xl p-6 lg:col-span-2">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <p className="text-center text-gray-500 py-4">Activity feed coming soon...</p>
          </div>

        </div>
      </main>
    </div>
  );
}
