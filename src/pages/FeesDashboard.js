import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import config from '../config'; // 🚀 Config file import ki gayi hai

function FeesDashboard() {
  const [students, setStudents] = useState([]);
  const [feesHistory, setFeesHistory] = useState([]); // 🚀 Hook ki jagah local state use kiya
  const [editingId, setEditingId] = useState(null);
  const navigate = useNavigate();
  
  // 📅 Default date aaj ki set ki hai
  const [formData, setFormData] = useState({ 
    student_id: '', 
    amount: '', 
    paid_on: new Date().toISOString().split('T')[0], 
    mode: 'Cash', 
    month: '', 
    description: '', 
    status: 'Paid' 
  });

  const API_URL = "https://library-api.raghuveerbhati525.workers.dev";
  const token = localStorage.getItem('adminToken');

  // 🔄 Data Fetching Function (Hook hata kar yahin daal diya taaki crash na ho)
  const fetchData = async () => {
    try {
      // Fetch Students
      const resStudents = await fetch(`${API_URL}/api/students`, { 
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataStudents = await resStudents.json();
      setStudents(Array.isArray(dataStudents) ? dataStudents : []);

      // Fetch Fees History
      const resHistory = await fetch(`${API_URL}/api/fees/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataHistory = await resHistory.json();
      setFeesHistory(Array.isArray(dataHistory) ? dataHistory : []);
    } catch (err) {
      toast.error("Data load karne mein problem aayi.");
    }
  };

  useEffect(() => {
    if (!token) return navigate('/');
    fetchData();
  }, [token, navigate]);

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
        toast.success(editingId ? 'Record Updated! ✅' : 'Fees Record Saved! ✅', { id: toastId });
        setFormData({ 
          student_id: '', amount: '', 
          paid_on: new Date().toISOString().split('T')[0], 
          mode: 'Cash', month: '', description: '', status: 'Paid' 
        });
        setEditingId(null);
        fetchData(); // 🚀 Refreshing table data
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
      paid_on: fee.paid_on ? fee.paid_on.split('T')[0] : new Date().toISOString().split('T')[0],
      mode: fee.mode || 'Cash',
      month: fee.month || '',
      description: fee.description || '',
      status: fee.status || 'Paid'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 🗑️ Delete Logic
  const handleDelete = async (id) => {
    if(window.confirm("Kya aap ye fees record hamesha ke liye mitana chahte hain?")) {
      try {
        const res = await fetch(`${API_URL}/api/fees/delete/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if(res.ok) {
          toast.success('Record Deleted! 🗑️');
          fetchData();
        }
      } catch (err) {
        toast.error('Delete fail ho gaya.');
      }
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      
      {/* Header (Dynamic Config Applied) */}
      <div className="max-w-7xl mx-auto flex justify-between items-center mb-8 bg-white p-5 rounded-xl shadow-md border-b-4 border-green-600">
        <div>
          <h1 className="text-3xl font-black text-green-700 uppercase tracking-tighter">{config.appName} Fees 💰</h1>
          <p className="text-gray-500 font-bold text-xs uppercase italic">{config.branchName} | Management Portal</p>
        </div>
        <div className="flex gap-3">
          <Link to="/dashboard" className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-black shadow-lg hover:bg-indigo-700 transition flex items-center gap-2">← Back to Dashboard</Link>
        </div>
      </div>

      {/* Form Section */}
      <div className={`max-w-7xl mx-auto bg-white p-8 rounded-2xl shadow-xl mb-10 border-t-8 ${editingId ? 'border-yellow-500 bg-yellow-50' : 'border-green-600'}`}>
        <h2 className="text-lg font-black mb-6 text-slate-700 uppercase tracking-wide">
          {editingId ? "✏️ Edit Fees Record" : "➕ Nayi Fees Entry Karein"}
        </h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">{config.userType} Select Karein</label>
            <select className="border-2 p-3 rounded-xl outline-none focus:border-green-500 font-bold text-slate-700" value={formData.student_id} onChange={(e) => setFormData({...formData, student_id: e.target.value})} required>
              <option value="">-- Choose {config.userType} --</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          
          <div className="flex flex-col gap-1">
             <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Amount (₹)</label>
             <input type="number" placeholder="Enter Amount" className="border-2 p-3 rounded-xl outline-none focus:border-green-500 font-bold" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} required />
          </div>

          <div className="flex flex-col gap-1">
             <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Payment Date 📅</label>
             <input type="date" className="border-2 p-3 rounded-xl outline-none focus:border-green-500 font-bold bg-green-50" value={formData.paid_on} onChange={(e) => setFormData({...formData, paid_on: e.target.value})} required />
          </div>
          
          <div className="flex flex-col gap-1">
             <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Billing Month</label>
             <select className="border-2 p-3 rounded-xl outline-none focus:border-green-500 font-bold text-indigo-700 bg-indigo-50" value={formData.month} onChange={(e) => setFormData({...formData, month: e.target.value})}>
                <option value="">-- Select Month --</option>
                {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
             </select>
          </div>

          <div className="flex flex-col gap-1">
             <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Payment Mode</label>
             <select className="border-2 p-3 rounded-xl outline-none focus:border-green-500 font-bold" value={formData.mode} onChange={(e) => setFormData({...formData, mode: e.target.value})}>
                <option value="Cash">Cash 💵</option>
                <option value="UPI">UPI / Online 📱</option>
                <option value="Bank Transfer">Bank Transfer 🏦</option>
             </select>
          </div>

          <div className="flex flex-col gap-1 md:col-span-2">
             <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Description / Note</label>
             <input type="text" placeholder="e.g., Pending amount cleared" className="border-2 p-3 rounded-xl outline-none focus:border-green-500 font-bold" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
          </div>
          
          <div className="flex gap-2 items-end">
            <button type="submit" className={`w-full font-black py-4 rounded-xl transition shadow-xl text-white uppercase tracking-widest active:scale-95 ${editingId ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-600 hover:bg-green-700'}`}>
              {editingId ? "Update Entry ✏️" : "Save Entry 🚀"}
            </button>
            {editingId && (
              <button type="button" onClick={() => {setEditingId(null); setFormData({student_id: '', amount: '', paid_on: new Date().toISOString().split('T')[0], mode: 'Cash', month: '', description: '', status: 'Paid'});}} className="bg-slate-400 text-white px-6 py-4 rounded-xl font-black uppercase tracking-widest hover:bg-slate-500">Cancel</button>
            )}
          </div>
        </form>
      </div>

      {/* Table Section */}
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100">
        <div className="bg-slate-800 p-4"><h3 className="text-white font-black uppercase tracking-wider">Fees History 📜</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black tracking-widest">
              <tr>
                <th className="p-4 border-b">Payment Date</th>
                <th className="p-4 border-b">{config.userType} Name</th>
                <th className="p-4 border-b">Month</th>
                <th className="p-4 border-b">Amount</th>
                <th className="p-4 border-b">Mode</th>
                <th className="p-4 border-b text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {feesHistory.map(fee => (
                <tr key={fee.id} className="hover:bg-green-50/50 transition-colors">
                  <td className="p-4 font-bold text-slate-500 uppercase text-xs">{new Date(fee.paid_on).toLocaleDateString('en-IN')}</td>
                  <td className="p-4 font-black text-slate-800 uppercase">{fee.student_name}</td>
                  <td className="p-4">
                    <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-200">
                      {fee.month || 'General'}
                    </span>
                  </td>
                  <td className="p-4 font-black text-green-600 text-lg italic">₹{fee.amount}</td>
                  <td className="p-4 text-slate-500 font-bold text-xs uppercase">{fee.mode}</td>
                  <td className="p-4 text-center space-x-2">
                    <button onClick={() => handleEdit(fee)} className="bg-amber-100 text-amber-700 px-4 py-2 rounded-xl font-black text-[10px] hover:bg-amber-200 transition-all uppercase">Edit</button>
                    <button onClick={() => handleDelete(fee.id)} className="bg-red-100 text-red-600 px-4 py-2 rounded-xl font-black text-[10px] hover:bg-red-200 transition-all uppercase">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {feesHistory.length === 0 && <p className="text-center p-16 text-slate-300 font-black uppercase tracking-widest text-xs">Abhi tak koi fees entry nahi hui hai.</p>}
        </div>
      </div>
    </div>
  );
}

export default FeesDashboard;
