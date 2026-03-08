import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

function Analytics() {
  const [data, setData] = useState(null);
  const [pendingStudents, setPendingStudents] = useState([]);
  const navigate = useNavigate();
  
  const API_URL = "https://library-api.raghuveerbhati525.workers.dev";
  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    if (!token) return navigate('/');

    // 1. Revenue & Stats Fetch Karein
    fetch(`${API_URL}/api/analytics/revenue`, { 
      headers: { 'Authorization': `Bearer ${token}` } 
    })
    .then(res => res.json())
    .then(setData)
    .catch(() => toast.error("Analytics load nahi ho paya"));

    // 2. Pending Reminders Fetch Karein
    fetch(`${API_URL}/api/analytics/pending-reminders`, { 
      headers: { 'Authorization': `Bearer ${token}` } 
    })
    .then(res => res.json())
    .then(data => {
      setPendingStudents(Array.isArray(data) ? data : []);
    });
  }, [token, navigate]);

  // 📲 Bulk WhatsApp Reminder Logic
  const sendBulkReminders = () => {
    if (pendingStudents.length === 0) {
      toast.error("Koi pending fees nahi hai!");
      return;
    }
    
    // Browser popup blocker ko rokne ke liye confirm message
    if(window.confirm(`${pendingStudents.length} students ko WhatsApp tab mein open kiya jayega. Continue?`)) {
      pendingStudents.forEach((s, index) => {
        setTimeout(() => {
          const msg = `Namaste ${s.name},\nLaxmi Library Bikaner se yaad dilaya jata hai ki aapki fees ₹${s.due_fees} pending hai. Kripya samay par jama karayein. 🙏`;
          window.open(`https://wa.me/91${s.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank');
        }, index * 500); // Har tab ke beech 0.5 second ka gap taaki browser block na kare
      });
      toast.success("WhatsApp tabs open ho rahe hain! 🚀");
    }
  };

  if (!data) return <div className="p-20 text-center font-black text-slate-400 text-xl animate-pulse tracking-widest uppercase">Calculating Business Analytics... ⏳</div>;

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      
      {/* 🚀 Header */}
      <div className="max-w-7xl mx-auto flex justify-between items-center mb-8 bg-white p-5 rounded-2xl shadow-md border-b-4 border-slate-800">
        <div>
          <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">📊 Business Analytics</h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Laxmi Library Revenue Dashboard</p>
        </div>
        <Link to="/dashboard" className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-black shadow-lg hover:bg-indigo-700 transition active:scale-95 flex items-center gap-2">
          ← Back to Dashboard
        </Link>
      </div>

      {/* 💰 Revenue Section */}
      <div className="max-w-7xl mx-auto mb-10">
        <h2 className="text-xl font-black text-slate-700 uppercase mb-4 tracking-widest">Revenue Overview 💵</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-3xl shadow-xl border-t-8 border-green-500 transform transition hover:scale-105">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">This Month Revenue</p>
            <h2 className="text-5xl font-black text-green-600 italic tracking-tighter">₹{data.revenue?.monthly || 0}</h2>
          </div>
          <div className="bg-white p-8 rounded-3xl shadow-xl border-t-8 border-blue-500 transform transition hover:scale-105">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Quarterly Revenue (3 Months)</p>
            <h2 className="text-5xl font-black text-blue-600 italic tracking-tighter">₹{data.revenue?.quarterly || 0}</h2>
          </div>
          <div className="bg-slate-900 p-8 rounded-3xl shadow-xl border-t-8 border-yellow-400 transform transition hover:scale-105">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Total Lifetime Revenue</p>
            <h2 className="text-5xl font-black text-yellow-400 italic tracking-tighter">₹{data.revenue?.total || 0}</h2>
          </div>
        </div>
      </div>

      {/* 📈 Student Flow Stats */}
      <div className="max-w-7xl mx-auto mb-10">
        <h2 className="text-xl font-black text-slate-700 uppercase mb-4 tracking-widest">Student Attendance & Flow 👥</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-indigo-100 p-8 rounded-3xl border-2 border-indigo-200 flex justify-between items-center shadow-md">
            <div>
              <p className="font-black text-indigo-900 uppercase tracking-widest text-xs mb-1">New Joinings (This Month)</p>
              <h3 className="text-5xl font-black text-indigo-700">+{data.stats?.new_joining || 0}</h3>
            </div>
            <span className="text-6xl drop-shadow-md">📈</span>
          </div>
          <div className="bg-red-100 p-8 rounded-3xl border-2 border-red-200 flex justify-between items-center shadow-md">
            <div>
              <p className="font-black text-red-900 uppercase tracking-widest text-xs mb-1">Student Exits (Inactive > 45 Days)</p>
              <h3 className="text-5xl font-black text-red-700">-{data.stats?.exits || 0}</h3>
            </div>
            <span className="text-6xl drop-shadow-md">📉</span>
          </div>
        </div>
      </div>

      {/* 📲 Bulk WhatsApp Pending Dues */}
      <div className="max-w-7xl mx-auto bg-white p-8 rounded-3xl shadow-2xl border-l-8 border-green-600 mb-10">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 border-b-2 border-slate-100 pb-6">
          <div>
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Pending Fees Alert ⚠️</h2>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{pendingStudents.length} Students Pending</p>
          </div>
          <button 
            onClick={sendBulkReminders} 
            className="bg-green-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl hover:bg-green-700 transition-all flex items-center gap-3 uppercase tracking-widest active:scale-95 border-b-4 border-green-800"
          >
            <span className="text-2xl">📲</span> Send Bulk Reminders
          </button>
        </div>
        
        <div className="max-h-80 overflow-y-auto pr-4">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest sticky top-0">
              <tr>
                <th className="p-4 border-b">Student Name</th>
                <th className="p-4 border-b">WhatsApp Number</th>
                <th className="p-4 border-b text-right">Pending Dues</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pendingStudents.length > 0 ? pendingStudents.map((s, i) => (
                <tr key={i} className="hover:bg-green-50/50 transition-colors">
                  <td className="p-4 font-black text-slate-700 uppercase">{s.name}</td>
                  <td className="p-4 font-bold text-slate-500">📞 {s.whatsapp || 'N/A'}</td>
                  <td className="p-4 text-right">
                    <span className="bg-red-50 text-red-600 px-3 py-1 rounded-lg font-black italic border border-red-100">
                      ₹{s.due_fees}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="3" className="p-10 text-center font-bold text-green-500 uppercase tracking-widest">
                    🎉 Sabki fees clear hai! Koi pending dues nahi hain.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Analytics;
