import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

function Analytics() {
  const [data, setData] = useState(null);
  const [pendingStudents, setPendingStudents] = useState([]);
  
  // Custom Filter State
  const [customDates, setCustomDates] = useState({ start: '', end: '' });
  const [customStats, setCustomStats] = useState(null);

  const navigate = useNavigate();
  const API_URL = "https://library-api.raghuveerbhati525.workers.dev";
  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    if (!token) return navigate('/');

    // This Month Default Stats
    fetch(`${API_URL}/api/analytics/revenue`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json()).then(setData)
      .catch(() => toast.error("Analytics load nahi ho paya"));

    // Pending Reminders
    fetch(`${API_URL}/api/analytics/pending-reminders`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json()).then(resData => setPendingStudents(Array.isArray(resData) ? resData : []));
  }, [token, navigate]);

  // 📅 Fetch Custom Date Range Data
  const handleCustomCalculate = async (e) => {
    e.preventDefault();
    if(!customDates.start || !customDates.end) {
      toast.error("Please select both dates!");
      return;
    }
    const loadToast = toast.loading("Calculating...");
    try {
      const res = await fetch(`${API_URL}/api/analytics/custom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ startDate: customDates.start, endDate: customDates.end })
      });
      const result = await res.json();
      setCustomStats({ 
        regular: result.customRegular, 
        pro: result.customPro, 
        total: result.customRegular + result.customPro,
        joined: result.customJoined 
      });
      toast.success("Calculation Done! ✅", { id: loadToast });
    } catch (err) {
      toast.error("Error in calculation", { id: loadToast });
    }
  };

  const sendBulkReminders = () => {
    if (pendingStudents.length === 0) {
      toast.error("Koi pending fees nahi hai!"); return;
    }
    if(window.confirm(`${pendingStudents.length} students ko WhatsApp par reminder bheja jayega. Continue?`)) {
      pendingStudents.forEach((s, index) => {
        setTimeout(() => {
          const msg = `Namaste ${s.name},\nLaxmi Library Bikaner se yaad dilaya jata hai ki aapki fees ₹${s.due_fees} pending hai. Kripya jama karayein. 🙏`;
          window.open(`https://wa.me/91${s.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank');
        }, index * 500);
      });
      toast.success("WhatsApp tabs khul gaye!");
    }
  };

  if (!data) return <div className="p-20 text-center font-black text-slate-400 text-xl animate-pulse uppercase">Fetching Data... ⏳</div>;

  const currentMonthRegular = data.revenue?.regular_monthly || 0;
  const currentMonthPro = data.revenue?.pro_monthly || 0;
  const currentMonthTotal = currentMonthRegular + currentMonthPro;

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      
      {/* Header */}
      <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center mb-8 bg-white p-5 rounded-2xl shadow-md border-b-4 border-slate-800 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">📊 Business Analytics</h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Laxmi Library Revenue Dashboard</p>
        </div>
        <Link to="/dashboard" className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-black shadow-lg hover:bg-indigo-700 transition flex items-center gap-2">
          ← Back
        </Link>
      </div>

      {/* 📅 Custom Manual Filter Section */}
      <div className="max-w-7xl mx-auto bg-slate-900 p-8 rounded-3xl shadow-2xl mb-10 border-t-8 border-yellow-400">
        <h2 className="text-xl font-black text-white uppercase mb-4 tracking-widest">📅 Check Custom Revenue (From & To Date)</h2>
        <form onSubmit={handleCustomCalculate} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mb-6">
          <div className="flex flex-col">
            <label className="text-yellow-400 font-bold text-xs uppercase mb-1">From Date</label>
            <input type="date" className="border-2 border-slate-600 bg-slate-800 text-white p-3 rounded-xl font-bold outline-none focus:border-yellow-400" value={customDates.start} onChange={(e) => setCustomDates({...customDates, start: e.target.value})} required />
          </div>
          <div className="flex flex-col">
            <label className="text-yellow-400 font-bold text-xs uppercase mb-1">To Date</label>
            <input type="date" className="border-2 border-slate-600 bg-slate-800 text-white p-3 rounded-xl font-bold outline-none focus:border-yellow-400" value={customDates.end} onChange={(e) => setCustomDates({...customDates, end: e.target.value})} required />
          </div>
          <button type="submit" className="bg-yellow-400 text-slate-900 font-black py-3 rounded-xl hover:bg-yellow-500 transition-all uppercase tracking-widest active:scale-95 shadow-xl">
            Calculate Revenue 🚀
          </button>
        </form>

        {/* Output for Custom Data */}
        {customStats && (
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-600 mt-4">
            <h3 className="text-white font-bold mb-4 uppercase text-sm border-b border-slate-600 pb-2">Results from {customDates.start} to {customDates.end}</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
               <div className="bg-slate-700 p-4 rounded-xl">
                 <p className="text-[10px] font-black text-green-400 uppercase tracking-widest">Regular Fees</p>
                 <h2 className="text-3xl font-black text-white">₹{customStats.regular}</h2>
               </div>
               <div className="bg-slate-700 p-4 rounded-xl">
                 <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest">PRO Plans</p>
                 <h2 className="text-3xl font-black text-white">₹{customStats.pro}</h2>
               </div>
               <div className="bg-yellow-500 p-4 rounded-xl text-slate-900">
                 <p className="text-[10px] font-black uppercase tracking-widest">Grand Total</p>
                 <h2 className="text-3xl font-black">₹{customStats.total}</h2>
               </div>
               <div className="bg-indigo-500 p-4 rounded-xl text-white">
                 <p className="text-[10px] font-black uppercase tracking-widest">New Joinings</p>
                 <h2 className="text-3xl font-black">+{customStats.joined}</h2>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* 📈 This Month Overview */}
      <h2 className="max-w-7xl mx-auto text-xl font-black text-slate-700 uppercase mb-4 tracking-widest">Current Month Overview 💵</h2>
      <div className="max-w-7xl mx-auto mb-10 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-xl border-t-8 border-green-500 hover:scale-105 transition">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Regular Monthly Fees (Current Month)</p>
          <h2 className="text-4xl font-black text-green-600 tracking-tighter">₹{currentMonthRegular}</h2>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-xl border-t-8 border-orange-500 hover:scale-105 transition">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">PRO Plans Revenue (Current Month)</p>
          <h2 className="text-4xl font-black text-orange-600 tracking-tighter">₹{currentMonthPro}</h2>
        </div>
        <div className="bg-slate-800 p-6 rounded-3xl shadow-xl border-t-8 border-yellow-400 hover:scale-105 transition text-white">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Grand Revenue (Current Month)</p>
          <h2 className="text-4xl font-black text-yellow-400 tracking-tighter">₹{currentMonthTotal}</h2>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mb-10 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-indigo-100 p-8 rounded-3xl border-2 border-indigo-200 flex justify-between items-center shadow-md">
          <div>
            <p className="font-black text-indigo-900 uppercase tracking-widest text-xs mb-1">Students Joined (This Month)</p>
            <h3 className="text-5xl font-black text-indigo-700">+{data.stats?.new_joining || 0}</h3>
          </div>
          <span className="text-6xl drop-shadow-md">📈</span>
        </div>
        <div className="bg-red-100 p-8 rounded-3xl border-2 border-red-200 flex justify-between items-center shadow-md">
          <div>
            <p className="font-black text-red-900 uppercase tracking-widest text-xs mb-1">Student Exits (Inactive > 30 Days)</p>
            <h3 className="text-5xl font-black text-red-700">-{data.stats?.exits || 0}</h3>
          </div>
          <span className="text-6xl drop-shadow-md">📉</span>
        </div>
      </div>

      {/* 📲 Bulk WhatsApp Pending Dues */}
      <div className="max-w-7xl mx-auto bg-white p-8 rounded-3xl shadow-2xl border-l-8 border-green-600 mb-10">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 border-b-2 border-slate-100 pb-6">
          <div>
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Pending Fees Alert ⚠️</h2>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{pendingStudents.length} Students Pending</p>
          </div>
          <button onClick={sendBulkReminders} className="bg-green-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl hover:bg-green-700 transition flex items-center gap-3 uppercase active:scale-95">
            <span className="text-2xl">📲</span> Send Bulk Reminders
          </button>
        </div>
        
        <div className="max-h-80 overflow-y-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest sticky top-0">
              <tr>
                <th className="p-4 border-b">Student Name</th>
                <th className="p-4 border-b">Contact</th>
                <th className="p-4 border-b text-right">Pending Dues</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pendingStudents.length > 0 ? pendingStudents.map((s, i) => (
                <tr key={i} className="hover:bg-green-50 transition-colors">
                  <td className="p-4 font-black text-slate-700 uppercase">{s.name}</td>
                  <td className="p-4 font-bold text-slate-500">📞 {s.whatsapp || 'N/A'}</td>
                  <td className="p-4 text-right">
                    <span className="bg-red-50 text-red-600 px-3 py-1 rounded-lg font-black italic border border-red-100">₹{s.due_fees}</span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="3" className="p-10 text-center font-bold text-green-500 uppercase tracking-widest">🎉 Koi pending dues nahi hain.</td>
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
