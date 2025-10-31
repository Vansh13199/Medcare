import { Routes, Route } from 'react-router-dom';
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";

// Import All Your Pages
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import LandingPage from './pages/LandingPage'; // <-- Import the new LandingPage
import PatientListPage from './pages/PatientListPage';
import PatientDetailPage from './pages/PatientDetailPage';
import PatientFormPage from './pages/PatientFormPage';
import NewPrescriptionPage from './pages/NewPrescriptionPage'; 
// import ReportsPage from './pages/ReportsPage'; // Placeholder for reports

function App() {

  return (
    <Routes>
      {/* --- ⭐️ UPDATED: Root Route ('/') ---
        - Signed out users see the LandingPage.
        - Signed in users see their Dashboard.
      */}
      <Route 
        path="/" 
        element={
          <>
            <SignedIn>
              <DashboardPage />
            </SignedIn>
            <SignedOut>
              <LandingPage />
            </SignedOut>
          </>
        } 
      />

      {/* --- Public Sign-In Route --- */}
      <Route 
        path="/sign-in" 
        element={<LoginPage />} 
      />
      
      {/* --- Protected Routes --- */}
      {/* These are only accessible when signed in */}
      
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

      <Route 
        path="/patients/:id/new-prescription" 
        element={
          <SignedIn>
            <NewPrescriptionPage />
          </SignedIn>
        } 
      />
      
      {/* <Route 
        path="/reports" 
        element={
          <SignedIn>
            <ReportsPage />
          </SignedIn>
        } 
      /> */}
      
      {/* --- Catch-all for unauthenticated users ---
        If a user is signed out and tries to access any protected route,
        they will be redirected to the /sign-in page.
      */}
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
