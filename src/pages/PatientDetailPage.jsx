import React, { useState, useEffect } from 'react';
import { useParams, NavLink } from 'react-router-dom';
import Navbar from '../components/Navbar';
import axios from 'axios'; // Import axios for API calls

// --- Icon ---
const PrescriptionIcon = (
  <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
  </svg>
);
// --- End of Icon ---

export default function PatientDetailPage() {
  const { id } = useParams(); // Gets the patient's ID from the URL
  
  // --- State Management ---
  const [patient, setPatient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // --- Fetch Patient Data on Page Load ---
  useEffect(() => {
    const fetchPatient = async () => {
      setIsLoading(true);
      try {
        // UPDATED: Added headers to prevent browser caching
        const response = await axios.get(`http://localhost:3001/api/patients/${id}`, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        });
        setPatient(response.data);
      } catch (error) {
        console.error("Failed to fetch patient:", error);
        setPatient(null); // Set patient to null if not found (triggers the "Not Found" message)
      } finally {
        setIsLoading(false);
      }
    };
    fetchPatient();
  }, [id]); // Rerun this effect if the ID in the URL changes

  // --- 1. Loading State ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <div className="text-center py-10 font-semibold text-gray-600">Loading Patient Record...</div>
      </div>
    );
  }

  // --- 2. Not Found State ---
  if (!patient) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold leading-tight text-red-600">Patient Not Found</h1>
          </div>
        </header>
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="bg-white shadow-xl rounded-2xl p-8 text-center">
            <p className="text-gray-600">No patient record was found for the ID "#{id}".</p>
            <NavLink to="/patients" className="mt-4 inline-block text-blue-600 hover:text-blue-800 font-bold">
              &larr; Back to Patient List
            </NavLink>
          </div>
        </main>
      </div>
    );
  }

  // --- 3. Success State ---
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      {/* Page Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold leading-tight text-gray-900">
              {patient.fullName}
            </h1>
            <p className="text-sm text-gray-500">Patient ID: #{patient.id}</p>
          </div>
          <NavLink
            to={`/patients/${id}/new-prescription`}
            className="inline-flex items-center px-4 py-2 border border-transparent 
                       rounded-lg shadow-md text-sm font-medium text-white 
                       bg-purple-600 hover:bg-purple-700
                       transition"
          >
            {PrescriptionIcon}
            New Prescription
          </NavLink>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Column 1: Patient Details */}
          <div className="md:col-span-1">
            <div className="bg-white shadow-xl rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Patient Details</h3>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Full Name</dt>
                  <dd className="text-sm font-semibold text-gray-900">{patient.fullName}</dd>
                </div>
                 <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Date of Birth</dt>
                  <dd className="text-sm font-semibold text-gray-900">{patient.dob}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Gender</dt>
                  <dd className="text-sm font-semibold text-gray-900">{patient.gender}</dd>
                </div>
              </dl>
              <hr className="my-4" />
              <div>
                <h4 className="text-md font-medium text-gray-500 mb-1">Allergies</h4>
                <p className="text-sm font-semibold text-red-600">{patient.allergies || 'None listed'}</p>
              </div>
              <hr className="my-4" />
              <div>
                <h4 className="text-md font-medium text-gray-500 mb-1">Medical History</h4>
                <p className="text-sm font-semibold text-gray-900">{patient.medicalHistory || 'None listed'}</p>
              </div>
            </div>
          </div>

          {/* Column 2: Prescription History (Placeholder) */}
          <div className="md:col-span-2">
            <div className="bg-white shadow-xl rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Prescription History</h3>
              <p className="text-center text-gray-500 py-8">Prescription history will be loaded here.</p>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

