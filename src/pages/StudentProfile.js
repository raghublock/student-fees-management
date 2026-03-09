import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import config from '../config'; 

function StudentProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  
  const API_URL = config.apiUrl; 
  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    if (!token) return navigate('/');
    
    fetch(`${API_URL}/api/students`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (Array.isArray(data)) {
        const foundStudent = data.find(s => Number(s.id) === Number(id));
        setStudent(foundStudent);

        if (foundStudent) {
          const targetEndpoint = foundStudent.has_active_plan 
            ? `${API_URL}/api/plans/history` 
            : `${API_URL}/api/fees/history`;

          fetch(targetEndpoint, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          .then(res => res.json())
          .then(historyData => {
            if (Array.isArray(historyData)) {
              const filtered = historyData.filter(item => Number(item.student_id) === Number(id));
              setPaymentHistory(filtered);
            }
          })
          .catch(() => toast.error("History load nahi hui"));
        }
      }
    })
    .catch(() => toast.error("Profile load nahi hui"));
  }, [id, token, navigate]);

  const handlePrint = () => { window.print(); };

  if (!student) return <div className="p-10 text-center font-bold text-gray-400 uppercase tracking-widest animate-pulse">{config.appName} | Profile Loading...</div>;

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      <div className="max-w-5xl mx-auto flex justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm border-b-4 border-indigo-600 no-print">
        <h1 className="text-3xl font-black text-indigo-700 uppercase">{config.appName} {config.mainEmoji}</h1>
        <div className="flex gap-3">
          <button onClick={handlePrint} className="bg-indigo-600 text-white px-5 py-2 rounded-lg font-black shadow-md hover:bg-indigo-700 transition active:scale-95">🖨️ Print Receipt</button>
          <Link to="/dashboard" className="bg-slate-200 text-slate-700 px-5 py-2 rounded-lg font-black hover:bg-slate-300">← Back</Link>
        </div>
      </div>

      <div id="printable-area" className="max-w-5xl mx-auto">
        <div className="bg-white p-8 rounded-3xl shadow-xl mb-6 border border-gray-100 flex flex-col md:flex-row items-center gap-10 relative overflow-hidden">
          <img 
            src={student.photo_url || student.photo || 'https://via.placeholder.com/150'} 
            alt={config.userType} 
            className="h-44 w-44 rounded-3xl object-cover border-4 border-indigo-50 shadow-lg"
          />
          <div className="flex-1 text-center md:text-left space-y-2">
            <div className="flex flex-col md:flex-row items-center gap-3 justify-center md:justify-start">
              <h2 className="text-4xl font-black text-slate-800 uppercase tracking-tighter">{student.name}</h2>
              {student.has_active_plan && (
                <span className="bg-gradient-to-r from-yellow-400 to-orange-600 text-white text-[10px] px-4 py-1.5 rounded-full font-black animate-pulse shadow-xl border border-yellow-200 uppercase">
                  PRO {config.userType.toUpperCase()} 📦
                </span>
              )}
            </div>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">
              Account Status: {student.has_active_plan ? `Custom ${config.planLabel} Activated` : 'Regular Monthly Fees'}
            </p>
            <div className="pt-4 text-sm font-bold text-slate-600 grid grid-cols-1 md:grid-cols-2 gap-2 uppercase">
                <p>📞 {student.mobile || 'N/A'}</p>
                <p>🆔 {config.userType} ID: #{config.receiptPrefix}-{student.id}</p>
            </div>
          </div>

          <div className={`w-full md:w-72 p-6 rounded-3xl text-white shadow-2xl transition-all duration-500 transform hover:scale-105 ${student.has_active_plan ? 'bg-orange-600 border-t-8 border-yellow-400' : 'bg-slate-900 border-t-8 border-indigo-500'}`}>
             <h3 className="text-xs font-black mb-4 border-b border-white/20 pb-2 uppercase tracking-widest italic">
                {student.has_active_plan ? 'Current Subscription' : 'Account Financials'}
             </h3>
             <div className="space-y-3 text-sm font-bold">
                <div className="flex justify-between opacity-80">
                  <span>Total Fees:</span> 
                  <span>₹{student.has_active_plan ? paymentHistory[0]?.price || '...' : student.total_fees}</span>
                </div>
                <div className="flex justify-between text-green-300">
                  <span>Paid:</span> 
                  <span>₹{student.has_active_plan ? paymentHistory[0]?.price || '...' : student.paid_fees}</span>
                </div>
                {!student.has_active_plan && (
                  <div className="pt-2 mt-2 border-t border-white/20 flex justify-between text-red-400 text-xl font-black italic underline">
                    <span>Due:</span> <span>₹{student.due_fees}</span>
                  </div>
                )}
             </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
          <div className={`${student.has_active_plan ? 'bg-orange-500' : 'bg-indigo-800'} p-5 text-white font-black uppercase tracking-widest text-center text-sm`}>
             {student.has_active_plan ? `📦 ACTIVE ${config.planLabel.toUpperCase()} PURCHASE RECORD` : '📜 MONTHLY FEES PAYMENT LEDGER'}
          </div>
          <table className="w-full text-center border-collapse">
            <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
              <tr>
                <th className="p-5 border-b">Transaction Date</th>
                <th className="p-5 border-b">Amount</th>
                <th className="p-5 border-b text-left">Details & Month</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paymentHistory.length > 0 ? paymentHistory.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-all border-b">
                  <td className="p-5 font-bold text-slate-500 uppercase text-xs">
                    {item.start_date || (item.paid_on ? new Date(item.paid_on).toLocaleDateString('en-IN') : 'N/A')}
                  </td>
                  <td className="p-5 font-black text-green-600 text-lg italic">₹{item.price || item.amount}</td>
                  <td className="p-5 text-left font-black text-indigo-900 uppercase text-[10px] tracking-tighter">
                    <div className="text-xs text-slate-500">{item.plan_name || item.description || 'Verified Payment'}</div>
                    {/* 🚀 NAYA JAADOO: Yahan Month print hoga! */}
                    {item.month && (
                      <div className="mt-1 bg-green-100 text-green-700 px-2 py-1 inline-block rounded border border-green-200 shadow-sm text-[9px] tracking-widest">
                        🗓️ FOR: {item.month}
                      </div>
                    )}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="3" className="p-20 text-slate-300 font-black italic uppercase text-xs tracking-widest">No payment history found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default StudentProfile;
