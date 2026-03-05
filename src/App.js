import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import FeesDashboard from './pages/FeesDashboard';
import StudentProfile from './pages/StudentProfile'; // 👈 Ye import check karein

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('adminToken');
  return token ? children : <Navigate to="/" />;
};

function App() {
  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/fees" element={<ProtectedRoute><FeesDashboard /></ProtectedRoute>} /> 
        
        {/* 🚀 YEH LINE HAI ASLEE SOLUTION: Dashboard ke Link ko yahan se rasta milta hai */}
        <Route path="/student/:id" element={<ProtectedRoute><StudentProfile /></ProtectedRoute>} /> 
      </Routes>
    </Router>
  );
}

export default App;
