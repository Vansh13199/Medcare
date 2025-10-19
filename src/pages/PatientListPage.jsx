import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import Navbar from '../components/Navbar';
import axios from 'axios'; // Make sure axios is imported

// --- Icons (unchanged) ---
const SearchIcon = (
  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
  </svg>
);
const UserAddIcon = (
  <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
    <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 11a1 1 0 100-2h-1v-1a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1z" />
  </svg>
);
// --- End of Icons ---

export default function PatientListPage() {
  // --- State for search, all patients (master list), and filtered patients (display list) ---
  const [searchQuery, setSearchQuery] = useState('');
  const [allPatients, setAllPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // Loading state

  // --- ⭐️ 1. Fetch data from the backend when the page loads ---
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await axios.get('http://localhost:3001/api/patients');
        setAllPatients(response.data); // Store the master list
        setFilteredPatients(response.data); // Set the initial display list
      } catch (error) {
        console.error('Failed to fetch patients:', error);
        alert('Could not fetch patient data. Is the backend server running?');
      } finally {
        setIsLoading(false); // Stop loading, whether success or error
      }
    };

    fetchPatients();
  }, []); // The empty array [] means this effect runs only once

  // --- ⭐️ 2. Update search logic to use state instead of mock data ---
  useEffect(() => {
    if (searchQuery === '') {
      setFilteredPatients(allPatients); // If search is empty, show all patients from master list
    } else {
      const lowerCaseQuery = searchQuery.toLowerCase();
      
      const filtered = allPatients.filter(patient => {
        const nameMatch = patient.fullName.toLowerCase().includes(lowerCaseQuery);
        const idMatch = patient.id.toLowerCase().includes(lowerCaseQuery);
        return nameMatch || idMatch;
      });
      
      setFilteredPatients(filtered);
    }
  }, [searchQuery, allPatients]); // Re-run whenever search query or the master list changes

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      {/* Page Header (unchanged) */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold leading-tight text-gray-900">
            Patient Records
          </h1>
          <NavLink
            to="/patients/new"
            className="inline-flex items-center px-4 py-2 border border-transparent 
                       rounded-lg shadow-md text-sm font-medium text-white 
                       bg-blue-600 hover:bg-blue-700
                       transition"
          >
            {UserAddIcon}
            Add New Patient
          </NavLink>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        
        {/* Search Bar (unchanged) */}
        <div className="mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {SearchIcon}
            </div>
            <input
              type="text"
              name="search"
              id="search"
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg 
                         leading-5 bg-white placeholder-gray-500 
                         focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm shadow-md"
              placeholder="Search by patient name or ID"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* --- Patient Table (Updated) --- */}
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-purple-600 to-blue-600">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                  Patient ID
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                  Date of Birth
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                  Contact
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">View</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    Loading patient data...
                  </td>
                </tr>
              ) : filteredPatients.length > 0 ? (
                filteredPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-500">{patient.id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{patient.fullName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700">{patient.dob}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700">{patient.contactNumber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <NavLink to={`/patients/${patient.id}`} className="text-blue-600 hover:text-blue-900 font-bold">
                        View Record
                      </NavLink>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    No patients found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
