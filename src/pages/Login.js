import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  
  // Apna live Cloudflare URL yahan daalein
  const API_URL = "https://library-api.raghuveerbhati525.workers.dev";

  const handleLogin = async (e) => {
    e.preventDefault();
    const toastId = toast.loading('Logging in...');

    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        // Token ko browser mein save karein
        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('adminName', data.admin.name);
        toast.success('Login Successful! 🎉', { id: toastId });
        navigate('/dashboard'); // Login ke baad Dashboard par bhejein
      } else {
        toast.error(data.error || 'Login failed', { id: toastId });
      }
    } catch (err) {
      toast.error('Server error. Please try again.', { id: toastId });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md border-t-4 border-blue-600">
        <h2 className="text-3xl font-extrabold text-center text-blue-900 mb-2">Admin Login</h2>
        <p className="text-center text-gray-500 mb-8">Student Fees Management System</p>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email Address</label>
            <input 
              type="email" 
              className="mt-1 w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input 
              type="password" 
              className="mt-1 w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>
          <button 
            type="submit" 
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition shadow-lg">
            Login to Dashboard
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
