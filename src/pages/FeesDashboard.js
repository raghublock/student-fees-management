import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useFees } from '../hooks/useFees'; 

function FeesDashboard() {
  const [students, setStudents] = useState([]);
  const { feesHistory, fetchHistory } = useFees();
  const [formData, setFormData] = useState({ 
    student_id: '', amount: '', paid_on: '', mode: 'Cash', description: '', status: 'Paid' 
  });

  const API_URL = "https://library-api.raghuveerbhati525.workers.dev";
  const token = localStorage.getItem('adminToken');

  // Crash-proof dropdown fetch logic
  useEffect(() => {
    fetch(`${API_URL}/api/students`, { 
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setStudents(data);
        } else {
          setStudents([]); 
        }
      })
      .catch(err => {
        console.error("Dropdown fetch error:", err);
        setStudents([]);
      });
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const toastId = toast.loading('Fees entry save ho rahi hai...');
    try {
      const res = await fetch(`${API_URL}/api/fees/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      if(res.ok) {
        toast.success('Fees Record Saved!', { id: toastId });
        setFormData({ student_id: '', amount: '', paid_on: '', mode: 'Cash', description: '', status: 'Paid' });
        fetchHistory(); 
      } else {
        toast.error('Error saving record', { id: toastId });
      }
    } catch (err) {
      toast.error('Network Error', { id: toastId });
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      <div className="max-w-7xl mx-auto flex justify-between items-center mb-8 bg-white p-4 rounded-lg shadow-sm border-b-4 border-green-600">
        <h1 className="text-3xl font-extrabold text-green-700">Fees Management 💰</h1>
        <div className="space-x-4">
          <Link to="/dashboard" className="bg-blue-100 text-blue-700 px-4 py-2 rounded font-bold hover:bg-blue-200">← Back to Students</Link>
          <button onClick={() => {localStorage.clear(); window.location.href='/';}} className="bg-red-500 text-white px-4 py-2 rounded font-bold">Logout</button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto bg-white p-6 rounded-xl shadow-md mb-8">
        <h2 className="text-xl font-bold mb-4 text-gray-700 border-b pb-2">Nayi Fees Entry Karein</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select className="border p-3 rounded outline-none" value={formData.student_id} onChange={(e) => setFormData({...formData, student_id: e.target.value})} required>
            <option value="">-- Student Select Karein --</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.name} (Class: {s.class})</option>)}
          </select>
          <input type="number" placeholder="Amount (₹)" className="border p-3 rounded outline-none" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} required />
          <input type="date" className="border p-3 rounded outline-none" value={formData.paid_on} onChange={(e) => setFormData({...formData, paid_on: e.target.value})} required />
          <select className="border p-3 rounded outline-none" value={formData.mode} onChange={(e) => setFormData({...formData, mode: e.target.value})}>
            <option value="Cash">Cash</option>
            <option value="UPI">UPI / Online</option>
            <option value="Bank Transfer">Bank Transfer</option>
          </select>
          <input type="text" placeholder="Description (e.g., April Fees)" className="border p-3 rounded outline-none" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
          <button type="submit" className="bg-green-600 text-white font-bold py-3 rounded hover:bg-green-700 transition shadow-lg">Save Fees Entry</button>
        </form>
      </div>

      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-green-700 text-white">
            <tr>
              <th className="p-4 text-left">Date</th>
              <th className="p-4 text-left">Student Name</th>
              <th className="p-4 text-left">Amount</th>
              <th className="p-4 text-left">Mode</th>
              <th className="p-4 text-left">Description</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {feesHistory.map(fee => (
              <tr key={fee.id} className="hover:bg-green-50 transition-colors">
                <td className="p-4 font-medium text-gray-600">{new Date(fee.paid_on).toLocaleDateString('en-IN')}</td>
                <td className="p-4 font-bold text-gray-800">{fee.student_name} <br/><span className="text-xs text-gray-500">Roll: {fee.roll_no}</span></td>
                <td className="p-4 font-bold text-green-600">₹{fee.amount}</td>
                <td className="p-4">{fee.mode}</td>
                <td className="p-4 text-gray-600">{fee.description}</td>
                <td className="p-4 text-center">
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold">{fee.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {feesHistory.length === 0 && <p className="text-center p-10 text-gray-400 font-medium">Abhi tak koi fees entry nahi hui hai.</p>}
      </div>
    </div>
  );
}

export default FeesDashboard;
