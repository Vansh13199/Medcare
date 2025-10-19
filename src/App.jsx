import { Routes, Route } from 'react-router-dom';
import { SignedIn, SignedOut, RedirectToSignIn, SignIn } from "@clerk/clerk-react";

// --- Import All Your Pages ---
import DashboardPage from './pages/DashboardPage';
import PatientListPage from './pages/PatientListPage';
import PatientDetailPage from './pages/PatientDetailPage';
import PatientFormPage from './pages/PatientFormPage';
import NewPrescriptionPage from './pages/NewPrescriptionPage'; // <-- This is the important import

function App() {

  return (
    <Routes>
      
      {/* --- Public Sign-In Route --- */}
      <Route 
        path="/sign-in" 
        element={<SignIn routing="path" path="/sign-in" />} 
      />
      
      {/* --- Protected Routes --- */}
      {/* All routes inside <SignedIn> are protected. */}
      
      <Route 
        path="/" 
        element={
          <SignedIn>
            <DashboardPage />
          </SignedIn>
        } 
      />
      
      <Route 
        path="/patients" 
        element={
          <SignedIn>
            <PatientListPage /> 
          </SignedIn>
        } 
      />
      
      <Route 
        path="/patients/:id" 
        element={
          <SignedIn>
            <PatientDetailPage />
          </SignedIn>
        } 
      />

      <Route 
        path="/patients/new" 
        element={
          <SignedIn>
            <PatientFormPage />
          </SignedIn>
        } 
      />

      {/* --- This is the corrected route --- */}
      <Route 
        path="/patients/:id/new-prescription" 
        element={
          <SignedIn>
            <NewPrescriptionPage />
          </SignedIn>
        } 
      />
      
      {/* Placeholder for Reports */}
      <Route 
        path="/reports" 
        element={
          <SignedIn>
            <h1 className="p-8 text-2xl">Reports Page (Coming Soon)</h1>
          </SignedIn>
        } 
      />
      
      {/* --- Catch-all for unauthenticated users --- */}
      <Route 
        path="*"
        element={
          <SignedOut>
            <RedirectToSignIn redirectUrl="/sign-in" />
          </SignedOut>
        }
      />
    </Routes>
  );
}

export default App;