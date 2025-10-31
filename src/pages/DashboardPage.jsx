import React, { useEffect, useState, useMemo } from 'react';
import { useUser, UserButton } from '@clerk/clerk-react';
import axios from 'axios';
import { NavLink } from 'react-router-dom';
import { 
  Users, Pill, AlertTriangle, UserPlus, Search, Star, X, ChevronLeft, ChevronRight, MessageSquarePlus,
  AlertCircle, CheckCircle, ListChecks // Import all needed icons
} from 'lucide-react'; 
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';

// --- PIE CHART DATA ---
const PIE_DATA = [
  { name: 'AI Only', value: 15 },
  { name: 'Doctor Only', value: 35 },
  { name: 'AI + Doctor', value: 50 },
];
const PIE_COLORS = ['#4A90E2', '#7E57C2', '#00796B'];

// --- BAR CHART DATA ---
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
 * Animated Element
 */
const AnimatedElement = ({ children, delay = 0 }) => {
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const timeout = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timeout);
  }, [delay]);
  return (
    <div className={`transition-all duration-700 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      {children}
    </div>
  );
};

/**
 * Top Navigation Bar
 */
const Navbar = ({ user }) => (
  <header
    className="sticky top-0 z-20 w-full shadow-lg p-4 transition-all duration-300 backdrop-blur-sm"
    style={{ background: 'linear-gradient(90deg, #4A90E2aa 0%, #7E57C2aa 100%)' }}
  >
    <div className="flex justify-between items-center max-w-7xl mx-auto">
      <AnimatedElement>
        <NavLink to="/" className="text-2xl font-bold text-white tracking-wider">
          MedCare
        </NavLink>
      </AnimatedElement>
      <div className="flex items-center space-x-4">
        <span className="text-white hidden sm:block">
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
 * Stat Card
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
        style={{ background: `rgba(255, 255, 255, 0.9)`, backdropFilter: 'blur(5px)', border: `1px solid ${isHovered ? '#00796B' : 'rgba(255, 255, 255, 0.6)'}` }}
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
 * Quick Actions Card
 */
const QuickActionsCard = ({ delay }) => (
  <AnimatedElement delay={delay}>
    <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col h-full">
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
 * Chart Card
 */
const SuccessRateChart = ({ delay }) => (
  <AnimatedElement delay={delay}>
    <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col h-full">
      <h2 className="text-xl font-semibold mb-6 text-gray-800 border-b pb-2">Analysis Method Overview</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-grow">
        <div>
          <h3 className="text-lg font-medium mb-4 text-center">Prescription Source %</h3>
          <div className="transition-transform duration-300 ease-out hover:scale-125">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={PIE_DATA} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={5} fill="#8884d8" animationBegin={300} animationDuration={800} labelLine={false}>
                  {PIE_DATA.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} style={{ outline: 'none' }} />)}
                </Pie>
                <Tooltip formatter={(value, name) => `${value}% (${name})`} />
                <Legend layout="horizontal" align="center" verticalAlign="bottom" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-4 text-center">Monthly Improvement Score</h3>
          <div className="transition-transform duration-300 ease-out hover:scale-125">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={BAR_DATA} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#333" />
                <YAxis hide />
                <Tooltip formatter={(value) => value.toLocaleString()} />
                <Bar dataKey="improvement" fill="#7E57C2" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  </AnimatedElement>
);

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

// --- Star Rating Component ---
const StarRating = ({ rating, setRating }) => (
  <div className="flex space-x-1 justify-center">
    {[...Array(5)].map((_, index) => {
      const starValue = index + 1;
      return (
        <Star
          key={starValue}
          className={`w-10 h-10 cursor-pointer transition-colors ${starValue <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
          fill={starValue <= rating ? "currentColor" : "none"}
          onClick={() => setRating(starValue)}
        />
      );
    })}
  </div>
);

// --- Review Submit Modal Component ---
const SubmitReviewModal = ({ isOpen, onClose, user, apiBaseUrl, onReviewSubmitted }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const authorName = user ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Anonymous';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) return setError('Please select a star rating.');
    setError('');
    setIsSubmitting(true);
    try {
      await axios.post(`${apiBaseUrl}/api/reviews`, { authorName, rating, comment });
      setIsSubmitting(false);
      onReviewSubmitted();
      onClose();
    } catch (err) {
      setError('Failed to submit review. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-lg relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Leave a Review</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 text-center mb-2">How was your experience?</label>
            <StarRating rating={rating} setRating={setRating} />
          </div>
          <div>
            <label htmlFor="comment" className="block text-sm font-medium text-gray-700">Comment (Optional)</label>
            <textarea id="comment" rows="4" value={comment} onChange={(e) => setComment(e.target.value)} className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500" placeholder="Tell us what you think..."/>
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-teal-600 text-white font-bold rounded-xl shadow-md transition duration-300 hover:bg-teal-700 disabled:opacity-50">
            {isSubmitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </form>
      </div>
    </div>
  );
};

// --- Review Slider Component ---
const ReviewSlider = ({ delay, apiBaseUrl, user, onModalOpen, refetchTrigger }) => {
  const [reviews, setReviews] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReviews = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${apiBaseUrl}/api/reviews`);
      setReviews(response.data);
    } catch (err) {
      console.error("Failed to fetch reviews:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [apiBaseUrl, refetchTrigger]);

  const handleNext = () => (reviews.length > 0) && setCurrentSlide((prev) => (prev === reviews.length - 1 ? 0 : prev + 1));
  const handlePrev = () => (reviews.length > 0) && setCurrentSlide((prev) => (prev === 0 ? reviews.length - 1 : prev - 1));
  
  const ReadOnlyStars = ({ rating }) => (
    <div className="flex space-x-0.5 justify-center">
      {[...Array(5)].map((_, index) => <Star key={index} className={`w-5 h-5 ${index < rating ? 'text-yellow-400' : 'text-gray-300'}`} fill="currentColor" />)}
    </div>
  );

  return (
    <AnimatedElement delay={delay}>
      <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col h-full">
        <div className="flex justify-between items-center border-b pb-2 mb-6">
          <h2 className="text-xl font-semibold text-gray-800">What Doctors Are Saying</h2>
          <button onClick={onModalOpen} className="flex items-center space-x-2 text-sm font-medium text-teal-600 hover:text-teal-800">
            <MessageSquarePlus className="w-5 h-5" />
            <span>Leave a Review</span>
          </button>
        </div>
        <div className="flex-grow flex flex-col justify-center items-center">
          {isLoading ? <p>Loading reviews...</p> : reviews.length > 0 ? (
            <div className="relative w-full h-full min-h-[150px] flex items-center justify-center">
              <div className="text-center px-10">
                <ReadOnlyStars rating={reviews[currentSlide].rating} />
                <p className="text-gray-600 italic mt-4 text-lg">"{reviews[currentSlide].comment}"</p>
                <p className="text-gray-900 font-semibold mt-2">- {reviews[currentSlide].authorName}</p>
              </div>
              <button onClick={handlePrev} className="absolute left-0 top-1/2 -translate-y-1/2 p-2 rounded-full bg-gray-100 hover:bg-gray-200"><ChevronLeft className="w-5 h-5" /></button>
              <button onClick={handleNext} className="absolute right-0 top-1/2 -translate-y-1/2 p-2 rounded-full bg-gray-100 hover:bg-gray-200"><ChevronRight className="w-5 h-5" /></button>
            </div>
          ) : <p>No reviews yet.</p>}
        </div>
      </div>
    </AnimatedElement>
  );
};


// --- High-Risk Alerts Card Component ---
const HighRiskAlertsCard = ({ delay, apiBaseUrl }) => {
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get(`${apiBaseUrl}/api/prescriptions/alerts`);
        setAlerts(response.data);
      } catch (err) {
        console.error("Failed to fetch alerts:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAlerts();
  }, [apiBaseUrl]);

  return (
    <AnimatedElement delay={delay}>
      <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col h-full">
        <h2 className="text-xl font-semibold mb-6 text-gray-800 border-b pb-2 flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2 text-red-500" />
          High-Risk Alerts
        </h2>
        <div className="space-y-4 flex-grow">
          {isLoading ? (
            <p className="text-gray-500">Loading alerts...</p>
          ) : alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <CheckCircle className="w-16 h-16 text-green-500" />
              <p className="mt-4 font-semibold text-gray-700">All Clear!</p>
              <p className="text-gray-500">No high-risk alerts found.</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <NavLink
                to={`/patients/${alert.patientId}`}
                key={alert.id}
                className="block p-4 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 transition"
              >
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-red-700">{alert.patientName}</span>
                  <span className="text-xs text-red-500">
                    {new Date(alert.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-red-600">High-risk prescription detected.</p>
              </NavLink>
            ))
          )}
        </div>
      </div>
    </AnimatedElement>
  );
};

// --- ⭐️ NEW: Recent Prescriptions Card Component ---
const RecentPrescriptionsCard = ({ delay, apiBaseUrl }) => {
  const [recent, setRecent] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecent = async () => {
      try {
        setIsLoading(true);
        // Using the same endpoint as alerts, but you could create a new one
        const response = await axios.get(`${apiBaseUrl}/api/prescriptions/recent`);
        setRecent(response.data);
      } catch (err) {
        console.error("Failed to fetch recent prescriptions:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRecent();
  }, [apiBaseUrl]);

  const RiskBadge = ({ level }) => {
    const styles = {
        Low: 'bg-green-100 text-green-800',
        Moderate: 'bg-yellow-100 text-yellow-800',
        High: 'bg-red-100 text-red-800'
    };
    const style = styles[level] || 'bg-gray-100 text-gray-800';
    return <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${style}`}>{level}</span>;
  };

  return (
    <AnimatedElement delay={delay}>
      <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col h-full">
        <h2 className="text-xl font-semibold mb-6 text-gray-800 border-b pb-2 flex items-center">
          <ListChecks className="w-5 h-5 mr-2 text-gray-500" />
          Recent Analyses
        </h2>
        <div className="space-y-4 flex-grow">
          {isLoading ? (
            <p className="text-gray-500">Loading recent activity...</p>
          ) : recent.length === 0 ? (
            <p className="text-gray-500">No recent prescriptions found.</p>
          ) : (
            recent.map((rx) => (
              <NavLink
                to={`/patients/${rx.patientId}`}
                key={rx.id}
                className="block p-4 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 transition"
              >
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-700">{rx.patientName}</span>
                  <RiskBadge level={rx.riskLevel} />
                </div>
                <p className="text-sm text-gray-500">
                  {new Date(rx.createdAt).toLocaleDateString()}
                </p>
              </NavLink>
            ))
          )}
        </div>
      </div>
    </AnimatedElement>
  );
};


// --- MAIN DASHBOARD PAGE COMPONENT ---

const DashboardPage = () => {
  const { user } = useUser();
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

  const [stats, setStats] = useState({ totalPatients: '...', prescriptionsToday: '...', highRiskAlerts: '...' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refetchReviews, setRefetchReviews] = useState(0);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${apiBaseUrl}/api/stats`);
      setStats(response.data);
    } catch (err) {
      console.error("Failed to fetch dashboard stats:", err);
      setStats({ totalPatients: '!', prescriptionsToday: '!', highRiskAlerts: '!' });
    }
  };

  useEffect(() => {
    document.title = 'MedCare | Healthcare Dashboard';
    fetchStats();
  }, [apiBaseUrl]);

  const dynamicStats = useMemo(() => [
    { label: 'Total Patients', value: stats.totalPatients, icon: Users, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { label: 'Prescriptions Today', value: stats.prescriptionsToday, icon: Pill, color: 'text-teal-600', bgColor: 'bg-teal-50' },
    { label: 'High-Risk Alerts', value: stats.highRiskAlerts, icon: AlertTriangle, color: 'text-red-600', bgColor: 'bg-red-50' },
  ], [stats]);

  const handleReviewSubmitted = () => {
    setIsModalOpen(false);
    setRefetchReviews(c => c + 1);
  };

  return (
    <div
      className="flex flex-col min-h-screen font-sans"
      style={{
        backgroundImage: 'radial-gradient(rgba(0, 121, 107, 0.05) 1px, transparent 1px), linear-gradient(to bottom right, #eff6ff, #ecfdf5)',
        backgroundSize: '15px 15px, 100% 100%',
      }}
    >
      <Navbar user={user} />

      <main className="flex-grow max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 w-full">
        
        <AnimatedElement delay={0.2}>
          <div className="mb-8 text-center py-6 px-4 rounded-xl bg-white shadow-md">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-800">
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

        {/* --- ⭐️ UPDATED: Main Content Grid (now 3 columns) --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 grid-auto-rows-fr">
          <div className="lg:col-span-1">
            <QuickActionsCard delay={1.2} />
          </div>
          <div className="lg:col-span-1">
            <HighRiskAlertsCard delay={1.4} apiBaseUrl={apiBaseUrl} />
          </div>
           <div className="lg:col-span-1">
            <RecentPrescriptionsCard delay={1.6} apiBaseUrl={apiBaseUrl} />
          </div>
        </div>

        {/* --- ⭐️ UPDATED: Charts and Reviews Grid (2 columns) --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 grid-auto-rows-fr mt-8">
          <SuccessRateChart delay={1.8} />
          <ReviewSlider 
            delay={2.0} 
            apiBaseUrl={apiBaseUrl} 
            user={user} 
            onModalOpen={() => setIsModalOpen(true)}
            refetchTrigger={refetchReviews}
          />
        </div>

      </main>

      <Footer />

      <SubmitReviewModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        user={user} 
        apiBaseUrl={apiBaseUrl}
        onReviewSubmitted={handleReviewSubmitted}
      />
    </div>
  );
};

export default DashboardPage;

