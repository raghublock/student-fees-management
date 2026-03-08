import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Saare pages import kar rahe hain
import Login from './pages/Login'; 
import Dashboard from './pages/Dashboard';
import StudentProfile from './pages/StudentProfile';
import PlanPurchase from './pages/PlanPurchase';
import Analytics from './pages/Analytics';

// Agar FeesDashboard ka alag page hai toh usko bhi yahan import karna 
// import FeesDashboard from './pages/FeesDashboard';

function App() {
  return (
    <Router>
      {/* Notifications ke liye Toaster */}
      <Toaster 
        position="top-center" 
        toastOptions={{ 
          duration: 3000,
          style: { fontWeight: 'bold', borderRadius: '10px' } 
        }} 
      />
      
      <Routes>
        {/* Login Page Route */}
        <Route path="/" element={<Login />} />
        
        {/* Main Dashboard Route */}
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* Custom Plans Manager Route */}
        <Route path="/plans" element={<PlanPurchase />} />
        
        {/* Student Profile Route (ID dynamic pass hoti hai) */}
        <Route path="/student/:id" element={<StudentProfile />} />
        
        {/* 📊 Naya Analytics & Revenue Route */}
        <Route path="/analytics" element={<Analytics />} />

        {/* Agar Fees ka alag page hai toh isey uncomment karein: */}
        {/* <Route path="/fees" element={<FeesDashboard />} /> */}
        
      </Routes>
    </Router>
  );
}

export default App;
