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
              // Filter to get only this student's records
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

  // 🗓️ Expiry Date Logic
  let expiryDisplay = 'N/A';
  let latestPayment = null;
  
  if (paymentHistory.length > 0) {
      latestPayment = paymentHistory[0]; 
      if (student.has_active_plan) {
          expiryDisplay = latestPayment.expiry_date 
            ? new Date(latestPayment.expiry_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) 
            : 'N/A';
      } else {
          if (latestPayment.month) {
              const monthsArr = latestPayment.month.split(',').map(m => m.trim());
              const lastMonth = monthsArr[monthsArr.length - 1]; 
              expiryDisplay = `End of ${lastMonth}`;
          } else if (latestPayment.paid_on) {
              const d = new Date(latestPayment.paid_on);
              d.setDate(d.getDate() + 30);
              expiryDisplay = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
          }
      }
  }

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      <div className="print:hidden">
        
        {/* Header Section */}
        <div className="max-w-5xl mx-auto flex justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm border-b-4 border-indigo-600">
            <h1 className="text-3xl font-black text-indigo-700 uppercase">{config.appName} {config.mainEmoji}</h1>
            <div className="flex gap-3">
            <button onClick={handlePrint} className="bg-indigo-600 text-white px-5 py-2 rounded-lg font-black shadow-md hover:bg-indigo-700 transition active:scale-95">🖨️ Print Receipt</button>
            <Link to="/dashboard" className="bg-slate-200 text-slate-700 px-5 py-2 rounded-lg font-black hover:bg-slate-300">← Back</Link>
            </div>
        </div>

        <div className="max-w-5xl mx-auto">
            {/* Top Profile Box */}
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

                <div className="pt-5">
                <a 
                    href={`https://wa.me/91${student.whatsapp}?text=${encodeURIComponent(Number(student.due_fees) > 0 ? `Namaste ${student.name}, Aapki ${config.appName} ki ₹${student.due_fees} fees due hai. Kripya jama karwayein.` : `Namaste ${student.name}, Aapka ${config.appName} ka account ekdum clear hai. Thank you!`)}`} 
                    target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-2 bg-green-500 text-white px-5 py-2.5 rounded-xl font-black shadow-lg hover:bg-green-600 hover:-translate-y-1 transition-all uppercase tracking-widest text-xs"
                >
                    💬 Send WhatsApp Message
                </a>
                </div>
            </div>

            {/* 🚀 FIXED: Smart Financial Box (Accurate Math) */}
            <div className={`w-full md:w-80 p-6 rounded-3xl text-white shadow-2xl transition-all duration-500 transform hover:scale-105 ${student.has_active_plan ? 'bg-orange-600 border-t-8 border-yellow-400' : 'bg-slate-900 border-t-8 border-indigo-500'}`}>
                <h3 className="text-xs font-black mb-4 border-b border-white/20 pb-2 uppercase tracking-widest italic">
                    {student.has_active_plan ? 'Current Subscription' : 'Account Financials'}
                </h3>
                <div className="space-y-3 text-sm font-bold">
                    
                    <div className="flex justify-between opacity-80">
                        {/* 🚀 FIX: Total Billed ab hamesha actual DB se aayega, latest payment amount se override nahi hoga */}
                        <span>Lifetime Billed:</span> 
                        <span>₹{student.has_active_plan ? (latestPayment?.price || '...') : student.total_fees}</span>
                    </div>
                    
                    <div className="flex justify-between text-green-400">
                        {/* 🚀 FIX: Total Paid ab hamesha actual DB se aayega */}
                        <span>Lifetime Paid:</span> 
                        <span>₹{student.has_active_plan ? (latestPayment?.price || '...') : student.paid_fees}</span>
                    </div>
                    
                    {!student.has_active_plan && (
                    <div className="pt-2 mt-2 border-t border-white/20">
                        {Number(student.due_fees) > 0 ? (
                            <div className="flex justify-between text-red-400 text-xl font-black italic underline">
                                <span>Total Due:</span> <span>₹{student.due_fees}</span>
                            </div>
                        ) : Number(student.due_fees) < 0 ? (
                            <div className="flex justify-between text-blue-400 text-xl font-black italic underline">
                                {/* 🚀 FIX: Negative due ab "Advance" ban kar aayega */}
                                <span>Advance:</span> <span>₹{Math.abs(student.due_fees)}</span>
                            </div>
                        ) : (
                            <div className="flex justify-between text-green-400 text-lg font-black italic">
                                <span>Status:</span> <span>✅ Cleared</span>
                            </div>
                        )}
                    </div>
                    )}

                    <div className="pt-2 mt-2 border-t border-white/20">
                        <div className="flex justify-between text-yellow-300 text-sm font-black uppercase tracking-wider">
                            <span>Valid Till:</span> 
                            <span>{expiryDisplay}</span>
                        </div>
                    </div>

                </div>
            </div>
            </div>

            {/* 📜 SINGLE TABLE: DETAILED BANK PASSBOOK */}
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 mb-10">
            <div className={`${student.has_active_plan ? 'bg-orange-500' : 'bg-slate-800'} p-4 text-white font-black uppercase tracking-widest text-center text-sm`}>
                {student.has_active_plan ? `📦 ACTIVE ${config.planLabel.toUpperCase()} PURCHASE RECORD` : '📜 DETAILED BANK PASSBOOK'}
            </div>
            <table className="w-full text-center border-collapse">
                <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                <tr>
                    <th className="p-4 border-b text-left pl-6">Date & Month</th>
                    <th className="p-4 border-b text-left">Description</th>
                    <th className="p-4 border-b text-red-400 text-right">Fee Charged (Due 🔴)</th>
                    <th className="p-4 border-b text-green-500 text-right pr-6">Amount Paid (Paid 🟢)</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                {paymentHistory.length > 0 ? paymentHistory.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-all border-b">
                    
                    <td className="p-4 font-bold text-slate-500 uppercase text-xs text-left pl-6">
                        {item.start_date || (item.paid_on ? new Date(item.paid_on).toLocaleDateString('en-IN') : 'N/A')}
                        <br/>
                        {item.month && (
                            <span className="text-[9px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded mt-1 inline-block border border-indigo-100 font-black">
                                🗓️ {item.month}
                            </span>
                        )}
                    </td>
                    
                    <td className="p-4 text-xs font-black text-slate-700 text-left">
                        {item.plan_name || item.description || 'Verified Payment'}
                    </td>

                    <td className="p-4 font-black text-red-500 text-sm text-right">
                        {/* 🚀 FIX: Agar Status 'Billed' hai toh wo Laal rang mein dikhega */}
                        {item.status === 'Billed' ? `+₹${item.amount || item.price}` : '-'}
                    </td>

                    <td className="p-4 font-black text-green-600 text-sm text-right pr-6">
                        {/* 🚀 FIX: Agar Status 'Paid' hai toh wo Hare rang mein dikhega */}
                        {item.status === 'Paid' ? `₹${item.amount || item.price}` : '-'}
                    </td>

                    </tr>
                )) : (
                    <tr><td colSpan="4" className="p-20 text-slate-300 font-black italic uppercase text-xs tracking-widest">No passbook history found.</td></tr>
                )}
                </tbody>
            </table>
            </div>

        </div>
      </div>

      {/* 🖨️ PRINT VIEW (Normal screen par GAYAB rahega) */}
      <div className="hidden print:block w-full max-w-3xl mx-auto bg-white text-black p-8 border-2 border-gray-800 outline-2 outline-offset-4 outline-black">
        <div className="flex justify-between items-end border-b-4 border-gray-800 pb-6 mb-6">
            <div>
               <h1 className="text-5xl font-black uppercase tracking-tighter text-black">{config.appName}</h1>
               <p className="font-bold text-gray-600 uppercase tracking-widest mt-1 text-sm">{config.branchName}</p>
            </div>
            <div className="text-right">
               <h2 className="text-3xl font-black uppercase text-gray-300 tracking-widest">INVOICE</h2>
               <p className="font-bold text-gray-800 mt-2 text-sm">Receipt No: #{config.receiptPrefix}-{student.id}-{Math.floor(Math.random() * 900) + 100}</p>
               <p className="font-bold text-gray-800 text-sm">Date: {new Date().toLocaleDateString('en-IN')}</p>
            </div>
        </div>
        <div className="mb-8 flex justify-between">
            <div>
               <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1">Billed To:</p>
               <h3 className="text-2xl font-black uppercase text-black">{student.name}</h3>
               <p className="font-bold text-gray-800">Phone: {student.mobile || student.whatsapp || 'N/A'}</p>
               <p className="font-bold text-gray-800">ID: #{config.receiptPrefix}-{student.id}</p>
            </div>
            {student.has_active_plan && (
                <div className="text-right">
                    <span className="border-2 border-black text-black text-xs px-3 py-1 font-black uppercase tracking-widest">
                        {config.planLabel} Member
                    </span>
                </div>
            )}
        </div>
        
        <table className="w-full border-collapse border-2 border-gray-800 mb-8">
            <thead className="bg-gray-100">
                <tr>
                    <th className="border-2 border-gray-800 p-4 text-left font-black uppercase tracking-widest text-xs">Description</th>
                    <th className="border-2 border-gray-800 p-4 text-center font-black uppercase tracking-widest text-xs">Duration/Validity</th>
                    <th className="border-2 border-gray-800 p-4 text-right font-black uppercase tracking-widest text-xs">Amount Paid</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td className="border-2 border-gray-800 p-4 font-bold text-sm uppercase">
                        {student.has_active_plan ? latestPayment?.plan_name : (latestPayment?.description || 'Monthly Fees Payment')}
                        {!student.has_active_plan && latestPayment?.month && (
                             <div className="text-xs text-gray-500 mt-1 uppercase">For Months: {latestPayment.month}</div>
                        )}
                    </td>
                    <td className="border-2 border-gray-800 p-4 text-center font-bold text-sm uppercase">
                         {expiryDisplay}
                    </td>
                    <td className="border-2 border-gray-800 p-4 text-right font-black text-xl">
                        ₹{student.has_active_plan ? latestPayment?.price : latestPayment?.amount}
                    </td>
                </tr>
            </tbody>
        </table>

        {!student.has_active_plan && Number(student.due_fees) > 0 && (
            <div className="flex justify-end mb-8">
               <div className="border-2 border-gray-800 p-3 w-64 flex justify-between bg-gray-100">
                  <span className="font-black uppercase text-xs tracking-widest">Total Due Balance:</span>
                  <span className="font-black text-xl">₹{student.due_fees}</span>
               </div>
            </div>
        )}
        <div className="mt-16 pt-8 border-t-2 border-dashed border-gray-400 flex justify-between items-end">
            <div>
               <p className="font-black text-xl italic text-gray-800">Thank You!</p>
               <p className="text-xs font-bold text-gray-500 mt-1 uppercase">Computer Generated Receipt</p>
            </div>
            <div className="text-center">
               <div className="border-b-2 border-gray-800 w-48 mb-2"></div>
               <p className="font-black uppercase tracking-widest text-xs text-gray-600">Authorized Signature</p>
            </div>
        </div>
      </div>
    </div>
  );
}

export default StudentProfile;
