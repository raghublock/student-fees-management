import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

function Analytics() {
  const [data, setData] = useState(null);
  const [pendingStudents, setPendingStudents] = useState([]);
  const API_URL = "https://library-api.raghuveerbhati525.workers.dev";
  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    fetch(`${API_URL}/api/analytics/revenue`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json()).then(setData);
    
    fetch(`${API_URL}/api/analytics/pending-reminders`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json()).then(setPendingStudents);
  }, []);

  const sendBulkReminders = () => {
    pendingStudents.forEach(s => {
      const msg = `Namaste ${s.name}, Laxmi Library Bikaner se yaad dilaya jata hai ki aapki fees ₹${s.due_fees} pending hai. Kripya jama karayein.`;
      window.open(`https://wa.me/91${s.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank');
    });
    toast.success("Sabhi ke WhatsApp tabs khul rahe hain!");
  };

  if (!data) return <p className="p-10 text-center">Calculations Chal Rahi Hain... ⏳</p>;

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      <h1 className="text-3xl font-black text-indigo-900 mb-8 border-b-4 border-indigo-600 pb-2 uppercase italic">Library Business Analytics 📊</h1>

      {/* Revenue Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white p-6 rounded-3xl shadow-lg border-t-8 border-green-500 transform transition hover:scale-105">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Monthly Revenue</p>
          <h2 className="text-4xl font-black text-green-600 italic">₹{data.revenue.monthly}</h2>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-lg border-t-8 border-blue-500 transform transition hover:scale-105">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Quarterly Revenue</p>
          <h2 className="text-4xl font-black text-blue-600 italic">₹{data.revenue.quarterly}</h2>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-lg border-t-8 border-indigo-900 transform transition hover:scale-105">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Lifetime</p>
          <h2 className="text-4xl font-black text-indigo-900 italic">₹{data.revenue.total}</h2>
        </div>
      </div>

      {/* Join/Exit Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="bg-indigo-100 p-6 rounded-3xl border-2 border-indigo-200 flex justify-between items-center">
          <div><p className="font-black text-indigo-900 uppercase">New Joinings (Month)</p><h3 className="text-3xl font-black">+{data.stats.new_joining}</h3></div>
          <span className="text-5xl">📈</span>
        </div>
        <div className="bg-red-100 p-6 rounded-3xl border-2 border-red-200 flex justify-between items-center">
          <div><p className="font-black text-red-900 uppercase">Student Exits (Inactive)</p><h3 className="text-3xl font-black">-{data.stats.exits}</h3></div>
          <span className="text-5xl">📉</span>
        </div>
      </div>

      {/* Bulk WhatsApp Section */}
      <div className="bg-white p-8 rounded-3xl shadow-2xl border-l-8 border-green-600">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black text-slate-800 uppercase">Pending Fees Reminders ({pendingStudents.length})</h2>
          <button onClick={sendBulkReminders} className="bg-green-600 text-white px-6 py-3 rounded-xl font-black shadow-lg hover:bg-green-700 transition flex items-center gap-2 uppercase tracking-tighter">
            <span>📲</span> Send Bulk WhatsApp Reminder
          </button>
        </div>
        <div className="max-h-60 overflow-y-auto divide-y">
          {pendingStudents.map((s, i) => (
            <div key={i} className="py-3 flex justify-between">
              <span className="font-bold text-slate-700 uppercase">{s.name}</span>
              <span className="text-red-600 font-black">₹{s.due_fees} Pending</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
export default Analytics;
