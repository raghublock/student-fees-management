import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useFees } from '../hooks/useFees'; 

function FeesDashboard() {
  const [students, setStudents] = useState([]);
  const { feesHistory, fetchHistory } = useFees();
  const [editingId, setEditingId] = useState(null);
  
  // 📅 Default date aaj ki set ki hai
  const [formData, setFormData] = useState({ 
    student_id: '', 
    amount: '', 
    paid_on: new Date().toISOString().split('T')[0], 
    mode: 'Cash', 
    month: '', // Naya field for Month
    description: '', 
    status: 'Paid' 
  });

  const API_URL = "https://library-api.raghuveerbhati525.workers.dev";
  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    fetch(`${API_URL}/api/students`, { 
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setStudents(data);
        else setStudents([]);
      })
      .catch(err => setStudents([]));
  }, [token]);

  // ➕ Save / Update Logic
  const handleSubmit = async (e) => {
    e.preventDefault();
    const toastId = toast.loading(editingId ? 'Entry update ho rahi hai...' : 'Fees entry save ho rahi hai...');
    
    try {
      const url = editingId ? `${API_URL}/api/fees/update/${editingId}` : `${API_URL}/api/fees/add`;
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formData)
      });

      if(res.ok) {
        toast.success(editingId ? 'Record Updated!' : 'Fees Record Saved!', { id: toastId });
        setFormData({ 
          student_id: '', amount: '', 
          paid_on: new Date().toISOString().split('T')[0], 
          mode: 'Cash', month: '', description: '', status: 'Paid' 
        });
        setEditingId(null);
        fetchHistory(); 
      } else {
        toast.error('Error saving record', { id: toastId });
      }
    } catch (err) {
      toast.error('Network Error', { id: toastId });
    }
  };

  // ✏️ Edit Logic
  const handleEdit = (fee) => {
    setEditingId(fee.id);
    setFormData({
      student_id: fee.student_id,
      amount: fee.amount,
      paid_on: fee.paid_on.split('T')[0],
      mode: fee.mode,
      month: fee.month || '',
      description: fee.description || '',
      status: fee.status || 'Paid'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 🗑️ Delete Logic
  const handleDelete = async (id) => {
    if(window.confirm("Kya aap ye fees record mitana chahte hain?")) {
      try {
        const res = await fetch(`${API_URL}/api/fees/delete/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if(res.ok) {
          toast.success('Record Deleted!');
          fetchHistory();
        }
      } catch (err) {
        toast.error('Delete fail ho gaya.');
      }
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      {/* Header */}
      <div className="max-w-7xl mx-auto flex justify-between items-center mb-8 bg-white p-4 rounded-lg shadow-sm border-b-4 border-green-600">
        <div>
          <h1 className="text-3xl font-extrabold text-green-700">Laxmi Library Fees 💰</h1>
          <p className="text-xs text-gray-500 font-bold">Official Management Portal</p>
        </div>
        <div className="space-x-4">
          <Link to="/dashboard" className="bg-blue-100 text-blue-700 px-4 py-2 rounded font-bold hover:bg-blue-200 transition">← Back to Students</Link>
          <button onClick={() => {localStorage.clear(); window.location.href='/';}} className="bg-red-500 text-white px-4 py-2 rounded font-bold shadow-md">Logout</button>
        </div>
      </div>

      {/* Form Section */}
      <div className={`max-w-7xl mx-auto bg-white p-6 rounded-xl shadow-md mb-8 border-t-4 ${editingId ? 'border-yellow-500 bg-yellow-50' : 'border-green-600'}`}>
        <h2 className="text-xl font-bold mb-4 text-gray-700 border-b pb-2 uppercase tracking-wide">
          {editingId ? "✏️ Edit Fees Record" : "➕ Nayi Fees Entry Karein"}
        </h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select className="border p-3 rounded-lg outline-none focus:ring-2 focus:ring-green-400" value={formData.student_id} onChange={(e) => setFormData({...formData, student_id: e.target.value})} required>
            <option value="">-- Student Select Karein --</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          
          <input type="number" placeholder="Amount (₹)" className="border p-3 rounded-lg outline-none focus:ring-2 focus:ring-green-400" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} required />
          
          <input type="date" className="border p-3 rounded-lg outline-none" value={formData.paid_on} onChange={(e) => setFormData({...formData, paid_on: e.target.value})} required />
          
          {/* 📅 Month Picker */}
          <select className="border p-3 rounded-lg outline-none bg-indigo-50 font-bold text-indigo-700" value={formData.month} onChange={(e) => setFormData({...formData, month: e.target.value})}>
            <option value="">-- Kis Month ki Fees? --</option>
            {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <select className="border p-3 rounded-lg outline-none" value={formData.mode} onChange={(e) => setFormData({...formData, mode: e.target.value})}>
            <option value="Cash">Cash</option>
            <option value="UPI">UPI / Online</option>
            <option value="Bank Transfer">Bank Transfer</option>
          </select>

          <input type="text" placeholder="Description (e.g., Note if any)" className="border p-3 rounded-lg outline-none md:col-span-2" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
          
          <div className="flex gap-2">
            <button type="submit" className={`flex-1 font-bold py-3 rounded-lg transition shadow-lg text-white ${editingId ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-600 hover:bg-green-700'}`}>
              {editingId ? "Update Entry" : "Save Entry"}
            </button>
            {editingId && (
              <button type="button" onClick={() => {setEditingId(null); setFormData({student_id: '', amount: '', paid_on: new Date().toISOString().split('T')[0], mode: 'Cash', month: '', description: '', status: 'Paid'});}} className="bg-gray-400 text-white px-4 rounded-lg font-bold">Cancel</button>
            )}
          </div>
        </form>
      </div>

      {/* Table Section */}
      <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-xl overflow-x-auto border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-800 text-white uppercase text-xs">
            <tr>
              <th className="p-4 text-left">Date</th>
              <th className="p-4 text-left">Student Name</th>
              <th className="p-4 text-left">Month</th>
              <th className="p-4 text-left">Amount</th>
              <th className="p-4 text-left">Mode</th>
              <th className="p-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {feesHistory.map(fee => (
              <tr key={fee.id} className="hover:bg-green-50/50 transition-colors">
                <td className="p-4 text-gray-600">{new Date(fee.paid_on).toLocaleDateString('en-IN')}</td>
                <td className="p-4 font-black text-gray-800 text-base">{fee.student_name}</td>
                <td className="p-4">
                  <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                    {fee.month || 'General'}
                  </span>
                </td>
                <td className="p-4 font-black text-green-600 text-lg">₹{fee.amount}</td>
                <td className="p-4 text-gray-500 font-medium">{fee.mode}</td>
                <td className="p-4 text-center space-x-3">
                  <button onClick={() => handleEdit(fee)} className="text-blue-600 font-bold hover:text-blue-800 transition">Edit</button>
                  <button onClick={() => handleDelete(fee.id)} className="text-red-500 font-bold hover:text-red-700 transition">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {feesHistory.length === 0 && <p className="text-center p-12 text-gray-400 font-medium italic">Abhi tak koi fees entry nahi hui hai.</p>}
      </div>
    </div>
  );
}

export default FeesDashboard;
