import React, { useState, useEffect } from 'react';
import { useParams, NavLink, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import axios from 'axios';

// --- Icons ---
// ⭐️ UPDATED: Changed icons from variables to components (added `() => ( ... )`)
const UploadIcon = () => (
    <svg className="h-12 w-12 mx-auto text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const AnalyzeIcon = () => (
    <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3.5a1.5 1.5 0 011.5 1.5v1.518a4.502 4.502 0 010 7.964V16.5a1.5 1.5 0 11-3 0v-1.518a4.502 4.502 0 010-7.964V5A1.5 1.5 0 0110 3.5zM8.5 6a.5.5 0 000 1h3a.5.5 0 000-1h-3zM10 14a3.5 3.5 0 100-7 3.5 3.5 0 000 7z" /></svg>
);
// --- End of Icons ---

// --- ⭐️ UPDATED: Loading Indicator Component ---
// This component shows the animated, indeterminate progress bar.
const LoadingIndicator = () => (
  <div className="text-center">
    <p className="text-lg font-semibold text-purple-700 mb-3">
      AI is analyzing the image, please wait...
    </p>
    <p className="text-sm text-gray-500 mb-4">
      This may take up to 2-3 minutes to provide best results.
    </p>
    <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
      <div 
        className="h-2.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-600"
        style={{
          width: '100%',
          // This CSS animation creates the sliding effect
          animation: 'indeterminate-progress 2s infinite ease-in-out',
          transformOrigin: '0% 50%'
        }}
      ></div>
    </div>
  </div>
);

export default function NewPrescriptionPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    // --- State Management ---
    const [patient, setPatient] = useState(null);
    const [selectedImage, setSelectedImage] = useState(null);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';


    // --- Fetch Patient Data on Page Load ---
    useEffect(() => {
        const fetchPatient = async () => {
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
        fetchPatient();
    }, [id, apiBaseUrl]);

    // --- Handle Image Selection ---
    const handleImageChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setSelectedImage({
                file: file,
                previewUrl: URL.createObjectURL(file)
            });
            setAnalysisResult(null);
        }
    };

    // --- Handle Analysis Call to Backend ---
    const handleAnalyze = async () => {
        if (!selectedImage) {
            alert('Please upload a prescription image first.');
            return;
        }

        setIsAnalyzing(true);
        setAnalysisResult(null);

        const formData = new FormData();
        formData.append('prescriptionImage', selectedImage.file);

        try {
            const response = await axios.post(
                `${apiBaseUrl}/api/prescriptions/upload/${id}`,
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );
            setAnalysisResult(response.data);
            console.log('Analysis successful:', response.data);
        } catch (error) {
            console.error('Analysis failed:', error);
            alert(`Analysis failed: ${error.response?.data?.error || 'Please check the server logs.'}`);
        } finally {
            setIsAnalyzing(false);
        }
    };

    // --- UI Helper for Risk Badge ---
    const RiskBadge = ({ level }) => {
        const styles = {
            Low: 'bg-green-100 text-green-800',
            Moderate: 'bg-yellow-100 text-yellow-800',
            High: 'bg-red-100 text-red-800'
        };
        const style = styles[level] || 'bg-gray-100 text-gray-800';
        return <span className={`px-4 py-2 text-sm font-bold rounded-full ${style}`}>{level} Risk</span>;
    };
    
    // Loading and Not Found States
    if (isLoading) return <div className="p-8">Loading patient data...</div>;
    if (!patient) return <div className="p-8 text-red-500">Error: Patient not found.</div>;

    return (
        <>
            {/* --- ⭐️ UPDATED: CSS Keyframes for the progress bar --- */}
            <style>
            {`
                @keyframes indeterminate-progress {
                    0% {
                        transform: translateX(-100%) scaleX(0.5);
                    }
                    50% {
                        transform: translateX(0) scaleX(1);
                    }
                    100% {
                        transform: translateX(100%) scaleX(0.5);
                    }
                }
            `}
            </style>
            <div className="min-h-screen bg-gray-100">
                <Navbar />

                {/* Header */}
                <header className="bg-white shadow-sm">
                    <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
                        <h1 className="text-3xl font-bold leading-tight text-gray-900">
                            New Prescription for {patient.fullName}
                        </h1>
                        <p className="text-sm text-gray-500">Patient ID: {id}</p>
                    </div>
                </header>

                {/* Main Content */}
                <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                    <div className="space-y-8">
                        {/* Top Row for Uploader */}
                        <div className="bg-white shadow-xl rounded-2xl p-6 space-y-4">
                            <h3 className="text-xl font-semibold text-gray-900 border-b-2 border-purple-200 pb-2">
                                Step 1: Upload Prescription
                            </h3>
                            
                            {selectedImage ? (
                                <div className="text-center">
                                    <img src={selectedImage.previewUrl} alt="Prescription Preview" className="max-h-80 w-auto mx-auto rounded-lg shadow-md"/>
                                    <button onClick={() => setSelectedImage(null)} className="mt-4 text-sm text-red-600 hover:text-red-800 font-medium">
                                        Remove Image
                                    </button>
                                </div>
                            ) : (
                                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                                    <div className="space-y-1 text-center">
                                        {/* ⭐️ UPDATED: Using icon as a component */}
                                        <UploadIcon /> 
                                        <div className="flex text-sm text-gray-600">
                                            <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-purple-600 hover:text-purple-500 focus-within:outline-none">
                                                <span>Upload a file</span>
                                                <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleImageChange} accept="image/*" />
                                            </label>
                                            <p className="pl-1">or drag and drop</p>
                                        </div>
                                        <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                                    </div>
                                </div>
                            )}

                            <button onClick={handleAnalyze} disabled={!selectedImage || isAnalyzing}
                                    className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent 
                                             rounded-lg shadow-md font-medium text-white 
                                             bg-gradient-to-r from-purple-600 to-blue-600 
                                             hover:from-purple-700 hover:to-blue-700
                                             transition disabled:opacity-50 disabled:cursor-not-allowed">
                                {/* ⭐️ UPDATED: Using icon as a component */}
                                {isAnalyzing ? 'Analyzing...' : <> <AnalyzeIcon /> Analyze Prescription Image </>}
                            </button>
                        </div>

                        {/* Analysis Section */}
                        <div className="space-y-6">
                            {/* --- ⭐️ UPDATED: Replaced spinner with new LoadingIndicator --- */}
                            {isAnalyzing && (
                                <div className="bg-white shadow-xl rounded-2xl p-8">
                                    <LoadingIndicator />
                                </div>
                            )}

                            {!isAnalyzing && analysisResult && (
                                <div className={`flex flex-col ${analysisResult.alternativePrescription ? 'lg:flex-row' : ''} gap-8`}>
                                    {/* Step 2 Card */}
                                    <div className="bg-white shadow-xl rounded-2xl p-6 flex flex-col w-full">
                                        <h3 className="text-xl font-semibold text-gray-900 mb-4">Step 2: Review Analysis</h3>
                                        <div className="space-y-4 flex-grow">
                                            <div className="text-center"> <RiskBadge level={analysisResult.riskLevel} /> </div>
                                            <div>
                                                <h4 className="font-bold text-gray-800">Interaction Summary</h4>
                                                <p className="text-gray-600">{analysisResult.summary}</p>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-800">Extracted Drugs</h4>
                                                <ul className="divide-y divide-gray-200 mt-1">
                                                    {analysisResult.extractedDrugs.map((drug, i) => (
                                                        <li key={i} className="py-2">
                                                            <p className="font-semibold text-gray-900">{drug.name}</p>
                                                            <p className="text-sm text-gray-500">{drug.dosage}, {drug.frequency}</p>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-800">Recommendations</h4>
                                                <ul className="list-disc list-inside text-gray-600 space-y-1 mt-1">
                                                    {analysisResult.recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Step 3 Card */}
                                    {analysisResult.alternativePrescription && (
                                        <div className="bg-white shadow-xl rounded-2xl p-6 flex flex-col w-full">
                                            <h3 className="text-xl font-semibold text-gray-900 mb-4 border-b-2 border-blue-200 pb-2">
                                                Step 3: Recommended Prescription
                                            </h3>
                                            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 flex-grow rounded-lg">
                                                <h4 className="text-lg font-bold text-blue-800 mb-2">Safer Alternative Suggested</h4>
                                                <p className="text-sm text-blue-700 mb-3">{analysisResult.alternativePrescription.summary}</p>
                                                <ul className="divide-y divide-blue-200">
                                                    {analysisResult.alternativePrescription.drugs.map((drug, i) => (
                                                        <li key={i} className="py-2">
                                                            <p className="font-semibold text-gray-900">{drug.name}</p>
                                                            <p className="text-sm text-gray-500">{drug.dosage}, {drug.frequency}</p>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* --- AI Disclaimer Footer --- */}
                    {analysisResult && (
                        <footer className="mt-8 text-center">
                            <p className="text-xs text-gray-500 italic">
                                {analysisResult.disclaimer}
                            </p>
                        </footer>
                    )}
                </main>
            </div>
        </>
    );
}

