import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import axios from 'axios'; // <-- 1. IMPORT AXIOS

// --- Icon (unchanged) ---
const SaveIcon = (
  <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
    <path d="M7.5 2.5a.5.5 0 00-1 0v7.56l-1.22-1.22a.5.5 0 00-.708.708l2.5 2.5a.5.5 0 00.708 0l2.5-2.5a.5.5 0 00-.708-.708L7.5 10.06V2.5zM11.5 14.5a.5.5 0 01.5-.5h5a.5.5 0 010 1h-5a.5.5 0 01-.5-.5zM2 3a1 1 0 011-1h10a1 1 0 011 1v1h1a1 1 0 011 1v10a1 1 0 01-1 1h-1v1a1 1 0 01-1 1H3a1 1 0 01-1-1V3z" />
  </svg>
);
// --- End of Icon ---

export default function PatientFormPage() {
  const navigate = useNavigate();

  // State to hold all form data (unchanged)
  const [formData, setFormData] = useState({
    fullName: '',
    dob: '',
    gender: 'Other',
    contactNumber: '',
    emergencyContact: '',
    bloodType: '',
    allergies: '',
    medicalHistory: '',
  });

  // A single handler to update the state object (unchanged)
  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [id]: value,
    }));
  };

  // --- ⭐️ 2. UPDATED: handleSubmit function ---
  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent the browser from reloading the page

    try {
      // Send the formData to your backend API endpoint
      const response = await axios.post('http://localhost:3001/api/patients', formData);

      // If the request is successful (status code 201), show success message
      if (response.status === 201) {
        console.log('Patient successfully saved:', response.data);
        alert(`Patient "${response.data.fullName}" was successfully saved to the database!`);
        navigate('/patients'); // Redirect to the patient list
      }
    } catch (error) {
      // If there's an error, log it and show an alert
      console.error('Error saving patient:', error);
      alert('Failed to save patient. Please make sure the backend server is running and try again.');
    }
  };
  // --- End of Update ---

  // --- Styles for interactive form fields (unchanged) ---
  const baseInputStyle = "mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:outline-none transition duration-150 ease-in-out placeholder-gray-400";
  const focusRingStyle = "focus:border-purple-500 focus:ring-2 focus:ring-purple-300";
  const allergyFocusRingStyle = "focus:border-red-500 focus:ring-2 focus:ring-red-300";

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      {/* Page Header (unchanged) */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold leading-tight text-gray-900">
            Add New Patient
          </h1>
        </div>
      </header>

      {/* Main Form Area (unchanged) */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white shadow-xl rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* --- Section 1: Personal Information --- */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4 border-b-2 border-purple-200 pb-2">
                Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Full Name */}
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">Full Name</label>
                  <input type="text" id="fullName" value={formData.fullName} onChange={handleInputChange} required 
                         className={`${baseInputStyle} ${focusRingStyle}`}/>
                </div>
                {/* Date of Birth */}
                <div>
                  <label htmlFor="dob" className="block text-sm font-medium text-gray-700">Date of Birth</label>
                  <input type="date" id="dob" value={formData.dob} onChange={handleInputChange} required 
                         className={`${baseInputStyle} ${focusRingStyle}`}/>
                </div>
                {/* Gender */}
                <div>
                  <label htmlFor="gender" className="block text-sm font-medium text-gray-700">Gender</label>
                  <select id="gender" value={formData.gender} onChange={handleInputChange} 
                          className={`${baseInputStyle} ${focusRingStyle}`}>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
                {/* Blood Type */}
                <div>
                  <label htmlFor="bloodType" className="block text-sm font-medium text-gray-700">Blood Type</label>
                  <select id="bloodType" value={formData.bloodType} onChange={handleInputChange} required 
                          className={`${baseInputStyle} ${focusRingStyle}`}>
                    <option value="" disabled>Select Blood Type...</option>
                    <option>A+</option><option>A-</option>
                    <option>B+</option><option>B-</option>
                    <option>AB+</option><option>AB-</option>
                    <option>O+</option><option>O-</option>
                    <option>Unknown</option> 
                  </select>
                </div>
                {/* Contact Number */}
                <div>
                  <label htmlFor="contactNumber" className="block text-sm font-medium text-gray-700">Contact Number</label>
                  <input type="tel" id="contactNumber" value={formData.contactNumber} onChange={handleInputChange} placeholder="e.g., +91 12345 67890" 
                         className={`${baseInputStyle} ${focusRingStyle}`}/>
                </div>
                {/* Emergency Contact */}
                <div>
                  <label htmlFor="emergencyContact" className="block text-sm font-medium text-gray-700">Emergency Contact</label>
                  <input type="tel" id="emergencyContact" value={formData.emergencyContact} onChange={handleInputChange} 
                         className={`${baseInputStyle} ${focusRingStyle}`}/>
                </div>
              </div>
            </div>

            {/* --- Section 2: Medical History --- */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4 border-b-2 border-purple-200 pb-2">
                Medical History
              </h3>
              <div className="grid grid-cols-1 gap-6">
                {/* Allergies */}
                <div>
                  <label htmlFor="allergies" className="block text-sm font-medium text-gray-700">
                    Known Allergies
                    <span className="text-gray-500"> (list each on a new line)</span>
                  </label>
                  <textarea id="allergies" value={formData.allergies} onChange={handleInputChange} rows="4" 
                            className={`${baseInputStyle} ${allergyFocusRingStyle}`}
                            placeholder="e.g., Penicillin, Peanuts"></textarea>
                </div>
                {/* Medical History */}
                <div>
                  <label htmlFor="medicalHistory" className="block text-sm font-medium text-gray-700">
                    Past Conditions & Surgeries
                    <span className="text-gray-500"> (list each on a new line)</span>
                  </label>
                  <textarea id="medicalHistory" value={formData.medicalHistory} onChange={handleInputChange} rows="4" 
                            className={`${baseInputStyle} ${focusRingStyle}`} 
                            placeholder="e.g., Hypertension (2015), Appendectomy (2010)"></textarea>
                </div>
              </div>
            </div>

            {/* --- Form Actions --- */}
            <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
              <NavLink to="/patients" className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition">
                Cancel
              </NavLink>
              <button type="submit" className="inline-flex items-center px-6 py-2 border border-transparent 
                                             rounded-lg shadow-md font-medium text-white 
                                             bg-gradient-to-r from-purple-600 to-blue-600 
                                             hover:from-purple-700 hover:to-blue-700
                                             transition">
                {SaveIcon}
                Save Patient
              </button>
            </div>

          </form>
        </div>
      </main>
    </div>
  );
}
