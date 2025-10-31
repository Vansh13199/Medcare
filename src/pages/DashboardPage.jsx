import React, { useEffect, useState, useMemo } from 'react';
import { useUser, UserButton } from '@clerk/clerk-react';
import axios from 'axios';
import { NavLink } from 'react-router-dom';
import { Users, Pill, AlertTriangle, UserPlus, Search } from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend // ⭐️ 1. Removed Sector
} from 'recharts';

// --- UPDATED: New Pie Chart Data ---
const PIE_DATA = [
  { name: 'AI Only', value: 15 },
  { name: 'Doctor Only', value: 35 },
  { name: 'AI + Doctor', value: 50 },
];
const PIE_COLORS = ['#00ff0dff', '#ffa600ff', '#00ccffff']; // Blue, Purple, Teal

// --- Mock Bar Chart Data ---
const BAR_DATA = [
  { month: 'Jan', improvement: 4000 },
  { month: 'Feb', improvement: 3000 },
  { month: 'Mar', improvement: 5000 },
  { month: 'Apr', improvement: 4500 },
  { month: 'May', improvement: 6000 },
];
// --- END MOCK DATA ---


// --- HELPER COMPONENTS ---

/**
 * Animated Element for staggered fade-in
 */
const AnimatedElement = ({ children, delay = 0 }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsVisible(true);
    }, delay);
    return () => clearTimeout(timeout);
  }, [delay]);

  return (
    <div
      className={`transition-all duration-700 ease-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      {children}
    </div>
  );
};

/**
 * Top Navigation Bar (Now dynamic with user prop)
 */
const Navbar = ({ user }) => (
  <header
    className="sticky top-0 z-20 w-full shadow-lg p-4 transition-all duration-300 backdrop-blur-sm"
    style={{ background: 'linear-gradient(90deg, #4A90E2aa 0%, #7E57C2aa 100%)' }}
  >
    <div className="flex justify-between items-center max-w-7xl mx-auto">
      <AnimatedElement>
        {/* Updated: Logo links to home */}
        <NavLink to="/" className="text-2xl font-bold text-white tracking-wider">
          MedCare
        </NavLink>
      </AnimatedElement>
      <div className="flex items-center space-x-4">
        <span className="text-white hidden sm:block">
          {/* Use dynamic user name from Clerk */}
          Welcome, Dr. {user ? user.firstName : '...'}!
        </span>
        
        <div className="w-10 h-10">
          <UserButton afterSignOutUrl="/" />
        </div>

      </div>
    </div>
  </header>
);

/**
 * Card for displaying a key statistic
 */
const StatCard = ({ label, value, Icon, color, bgColor, delay }) => {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <AnimatedElement delay={delay}>
      <div
        className={`p-8 rounded-2xl shadow-xl transition-all duration-300 cursor-pointer w-full h-full
          ${bgColor} ${isHovered ? 'scale-[1.02] shadow-2xl ring-2 ring-teal-400' : ''}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          background: `rgba(255, 255, 255, 0.9)`, // Slightly transparent white for cards
          backdropFilter: 'blur(5px)',
          border: `1px solid ${isHovered ? '#00796B' : 'rgba(255, 255, 255, 0.6)'}`
        }}
      >
        <div className="flex items-center justify-between">
          <Icon className={`w-8 h-8 ${color}`} />
          <p className="text-sm font-medium text-gray-500">{label}</p>
        </div>
        <div className="mt-4">
          <p className="text-4xl font-extrabold text-gray-900">{value.toLocaleString()}</p>
        </div>
      </div>
    </AnimatedElement>
  );
};

/**
 * Card for Quick Action Buttons (Updated with NavLink)
 */
const QuickActionsCard = ({ delay }) => (
  <AnimatedElement delay={delay}>
    <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col">
      <h2 className="text-xl font-semibold mb-6 text-gray-800 border-b pb-2">Quick Actions</h2>
      <div className="space-y-4 flex-grow">
        <NavLink 
          to="/patients/new"
          className="w-full py-4 bg-[#4A90E2] text-white font-bold rounded-xl shadow-md transition duration-300 hover:bg-blue-600 hover:shadow-lg transform hover:scale-[1.01] flex items-center justify-center space-x-2"
        >
          <UserPlus className="w-5 h-5" />
          <span>Add New Patient</span>
        </NavLink>
        <NavLink 
          to="/patients"
          className="w-full py-4 border border-gray-300 text-gray-700 font-bold rounded-xl shadow-sm transition duration-300 hover:bg-gray-50 hover:border-teal-500 hover:text-teal-600 flex items-center justify-center space-x-2"
        >
          <Search className="w-5 h-5" />
          <span>Find a Patient</span>
        </NavLink>
      </div>
    </div>
  </AnimatedElement>
);

/**
 * Card containing the Success Rate Charts (Recharts)
 */
const SuccessRateChart = ({ delay }) => {
  // --- ⭐️ Removed activeIndex state and renderActiveShape function ---
  
  return (
    <AnimatedElement delay={delay}>
      <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col">
        <h2 className="text-xl font-semibold mb-6 text-gray-800 border-b pb-2">Analysis Method Overview</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h3 className="text-lg font-medium mb-4 text-center">Prescription Source %</h3>
            {/* ⭐️ UPDATED: Changed hover:scale-110 to hover:scale-125 */}
            <div className="transition-transform duration-300 ease-out hover:scale-125">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  {/* ⭐️ Removed interaction props */}
                  <Pie
                    data={PIE_DATA}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    fill="#8884d8"
                    animationBegin={300}
                    animationDuration={800}
                    labelLine={false}
                  >
                    {PIE_DATA.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                        style={{ outline: 'none' }}
                      />
                    ))}
                  </Pie>
                  {/* ⭐️ Added Tooltip back */}
                  <Tooltip formatter={(value, name) => `${value}% (${name})`} />
                  <Legend layout="horizontal" align="center" verticalAlign="bottom" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4 text-center">Monthly Improvement Score</h3>
            {/* ⭐️ UPDATED: Changed hover:scale-110 to hover:scale-125 */}
            <div className="transition-transform duration-300 ease-out hover:scale-125">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={BAR_DATA} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" stroke="#333" />
                  <YAxis hide />
                  <Tooltip formatter={(value) => value.toLocaleString()} />
                  <Bar dataKey="improvement" fill="#00ccffff" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </AnimatedElement>
  );
};

/**
 * Footer
 */
const Footer = () => (
  <footer className="w-full p-4 border-t border-gray-200 bg-gray-50">
    <div className="max-w-7xl mx-auto text-center">
      <p className="text-sm text-gray-500">
        &copy; 2025 MedCare. Empowering Health Through Technology.
      </p>
    </div>
  </footer>
);


// --- MAIN DASHBOARD PAGE COMPONENT ---

const DashboardPage = () => {
  // Get the logged-in user from Clerk
  const { user } = useUser();
  
  // Get API base URL from environment variables
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

  // State to hold dynamic stats from the backend
  const [stats, setStats] = useState({
    totalPatients: '...',
    prescriptionsToday: '...',
    highRiskAlerts: '...',
  });
  
  // Fetch stats when the component mounts
  useEffect(() => {
    document.title = 'MedCare | Healthcare Dashboard';
    
    const fetchStats = async () => {
      try {
        const response = await axios.get(`${apiBaseUrl}/api/stats`);
        setStats(response.data);
      } catch (err) {
        console.error("Failed to fetch dashboard stats:", err);
        setStats({ totalPatients: '!', prescriptionsToday: '!', highRiskAlerts: '!' });
      }
    };
    
    fetchStats();
  }, [apiBaseUrl]); // Re-fetch if apiBaseUrl changes

  // useMemo to create the stats array for rendering.
  // This updates automatically when the 'stats' state changes.
  const dynamicStats = useMemo(() => [
    {
      label: 'Total Patients',
      value: stats.totalPatients,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Prescriptions Today',
      value: stats.prescriptionsToday,
      icon: Pill,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
    },
    {
      label: 'High-Risk Alerts',
      value: stats.highRiskAlerts,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
  ], [stats]);

  return (
    <div
      className="flex flex-col min-h-screen font-sans"
      style={{
        backgroundImage:
          'radial-gradient(rgba(0, 121, 107, 0.05) 1px, transparent 1px), linear-gradient(to bottom right, #eff6ff, #ecfdf5)',
        backgroundSize: '15px 15px, 100% 100%',
      }}
    >
      {/* Pass the dynamic user object to the Navbar */}
      <Navbar user={user} />

      <main className="flex-grow max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 w-full">
        
        <AnimatedElement delay={0.2}>
          <div className="mb-8 text-center py-6 px-4 rounded-xl bg-white shadow-md">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-800">
              {/* Use dynamic user name */}
              Welcome, <span className="text-teal-600">Dr. {user ? user.firstName : '...'}!</span>
            </h2>
          </div>
        </AnimatedElement>

        {/* --- STATS SECTION (Now dynamic) --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {dynamicStats.map((stat, index) => (
            <StatCard
              key={stat.label}
              label={stat.label}
              value={stat.value}
              Icon={stat.icon}
              color={stat.color}
              bgColor={stat.bgColor}
              delay={0.4 + index * 0.2}
            />
          ))}
        </div>

        {/* --- grid-auto-rows-fr makes grid items equal height --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 grid-auto-rows-fr">
          <QuickActionsCard delay={1.2} />
          <SuccessRateChart delay={1.4} />
        </div>

      </main>

      <Footer />
    </div>
  );
};

export default DashboardPage;

