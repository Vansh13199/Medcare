import React, { useState, useEffect } from 'react';
import { useParams, NavLink, useNavigate } from 'react-router-dom'; // Import useNavigate
import Navbar from '../components/Navbar';
import axios from 'axios';

// --- Icons ---
const PrescriptionIcon = ({ className = "h-5 w-5 mr-2" }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
  </svg>
);

const TrashIcon = ({ className = "h-5 w-5" }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
  </svg>
);
// --- End of Icons ---


// --- UI Helper for Risk Badge ---
const RiskBadge = ({ level }) => {
    const styles = {
        Low: 'bg-green-100 text-green-800',
        Moderate: 'bg-yellow-100 text-yellow-800',
        High: 'bg-red-100 text-red-800'
    };
    const style = styles[level] || 'bg-gray-100 text-gray-800';
    return <span className={`px-3 py-1 text-xs font-bold rounded-full ${style}`}>{level} Risk</span>;
};
// --- End of Helper ---

export default function PatientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate(); // Get the navigate function
  
  // --- State Management ---
  const [patient, setPatient] = useState(null);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';


  // --- Fetch Patient Data & History on Page Load ---
  useEffect(() => {
    const fetchPatient = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(`${apiBaseUrl}/api/patients/${id}`);
        setPatient(response.data);
      } catch (error) {
        console.error("Failed to fetch patient:", error);
        setPatient(null);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchHistory = async () => {
      setHistoryLoading(true);
      try {
        const response = await axios.get(`${apiBaseUrl}/api/prescriptions/patient/${id}`);
        setHistory(response.data);
      } catch (error) {
        console.error("Failed to fetch prescription history:", error);
        setHistory([]);
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchPatient();
    fetchHistory();
  }, [id, apiBaseUrl]);

  // --- Function to handle prescription deletion ---
  const handleDeletePrescription = async (prescriptionId) => {
    if (!window.confirm("Are you sure you want to delete this prescription history item? This action cannot be undone.")) {
      return;
    }

    try {
      await axios.delete(`${apiBaseUrl}/api/prescriptions/${prescriptionId}`);
      setHistory(prevHistory => 
        prevHistory.filter(pres => pres.id !== prescriptionId)
      );
    } catch (error) {
      console.error("Failed to delete prescription:", error);
      alert(`Error: ${error.response?.data?.error || 'Could not delete prescription.'}`);
    }
  };

  // --- ⭐️ NEW: Function to handle PATIENT deletion ---
  const handleDeletePatient = async () => {
    // Careful confirmation, as requested
    if (!window.confirm(`Are you absolutely sure you want to delete the entire record for ${patient.fullName}? This will delete all associated prescriptions and cannot be undone.`)) {
      return;
    }
    // Second confirmation
    if (!window.confirm(`FINAL CONFIRMATION: Delete patient ${patient.id}?`)) {
      return;
    }

    try {
      await axios.delete(`${apiBaseUrl}/api/patients/${id}`);
      alert('Patient record deleted successfully.');
      navigate('/patients'); // Navigate back to the patient list
    } catch (error) {
      console.error("Failed to delete patient:", error);
      alert(`Error: ${error.response?.data?.error || 'Could not delete patient record.'}`);
    }
  };


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
            <PrescriptionIcon />
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
                  <dt className="text-sm font-medium text-gray-500">Date of Birth</dt>
                  <dd className="text-sm font-semibold text-gray-900">{patient.dob}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Gender</dt>
                  <dd className="text-sm font-semibold text-gray-900">{patient.gender}</dd>
                </div>
                 <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Blood Type</dt>
                  <dd className="text-sm font-semibold text-gray-900">{patient.bloodType}</dd>
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
              
              {/* --- ⭐️ NEW: Delete Patient Button Section --- */}
              <hr className="my-4" />
              <div>
                <button
                  onClick={handleDeletePatient}
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-red-300 
                             rounded-lg shadow-sm text-sm font-medium text-red-700 
                             bg-red-50 hover:bg-red-100 transition"
                >
                  <TrashIcon className="h-5 w-5 mr-2" />
                  Delete Patient Record
                </button>
              </div>
              {/* --- End of New Section --- */}
            </div>
          </div>

          {/* Column 2: Prescription History */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white shadow-xl rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Prescription History</h3>
              {historyLoading ? (
                <p className="text-center text-gray-500 py-8">Loading history...</p>
              ) : history.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No prescription history found for this patient.</p>
              ) : (
                <div className="space-y-6">
                  {history.map((pres) => (
                    <div key={pres.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-4 py-3 flex justify-between items-center">
                        <h4 className="text-md font-semibold text-gray-800">
                          {new Date(pres.createdAt).toLocaleDateString("en-US", {
                            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </h4>
                        <RiskBadge level={pres.riskLevel} />
                      </div>
                      <div className="p-4 space-y-4">
                        <div>
                          <h5 className="font-bold text-gray-700">Extracted Drugs</h5>
                          <ul className="divide-y divide-gray-100 mt-1">
                            {pres.extractedDrugs.map(drug => (
                              <li key={drug.id} className="py-2">
                                <p className="font-semibold text-gray-900">{drug.name}</p>
                                <p className="text-sm text-gray-500">{drug.dosage}, {drug.frequency}</p>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h5 className="font-bold text-gray-700">AI Summary</h5>
                          <p className="text-sm text-gray-600">{pres.summary}</p>
                        </div>
                        <div>
                          <h5 className="font-bold text-gray-700">AI Recommendations</h5>
                          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 mt-1">
                            {Array.isArray(pres.recommendations) && pres.recommendations.map((rec, i) => (
                              <li key={i}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                        {pres.alternativePrescription && (
                          <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
                            <h5 className="text-md font-bold text-blue-800">Safer Alternative Suggested</h5>
                            <p className="text-sm text-blue-700 mb-2">{pres.alternativePrescription.summary}</p>
                            <ul className="divide-y divide-blue-200">
                              {Array.isArray(pres.alternativePrescription.drugs) && pres.alternativePrescription.drugs.map((drug, i) => (
                                <li key={i} className="py-2">
                                  <p className="font-semibold text-gray-900">{drug.name}</p>
                                  <p className="text-sm text-gray-500">{drug.dosage}, {drug.frequency}</p>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                            <p className="text-xs text-gray-400 italic max-w-xs">{pres.disclaimer}</p>
                            <button
                              onClick={() => handleDeletePrescription(pres.id)}
                              className="inline-flex items-center px-3 py-1 border border-transparent rounded-md shadow-sm text-xs font-medium text-white bg-red-600 hover:bg-red-700 transition"
                            >
                              <TrashIcon className="h-4 w-4 mr-1.5" />
                              Delete
                            </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

