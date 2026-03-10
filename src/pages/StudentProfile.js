import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import config from '../config'; 

function StudentProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  
  const [printMonthData, setPrintMonthData] = useState(null);
  
  const API_URL = config.apiUrl; 
  const token = localStorage.getItem('adminToken');

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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

  const handlePrint = (monthData) => { 
      setPrintMonthData(monthData);
      setTimeout(() => window.print(), 100);
  };

  if (!student) return <div className="p-10 text-center font-bold text-gray-400 uppercase tracking-widest animate-pulse">{config.appName} | Profile Loading...</div>;

  // =================================================================
  // 🧠 THE MASTERPIECE: TRANSPARENT DYNAMIC LEDGER
  // =================================================================
  
  const baseFee = Number(student.total_fees || 0);
  const ledger = [];
  let currentMonthSummary = null;
  let previousMonthSummary = null;
  let totalDueOverall = 0;
  let validTillText = "N/A";
  let accountStatus = "🟢 Active & Regular";

  if (!student.has_active_plan) {
      const monthPayments = {};
      const allKnownMonths = new Set(); 
      
      paymentHistory.forEach(p => {
          if (p.month) {
              const mArr = p.month.split(',').map(m => m.trim());
              mArr.forEach(m => allKnownMonths.add(m)); 
              
              if (p.status === 'Paid' && p.amount) {
                  const splitAmt = Number(p.amount) / mArr.length;
                  mArr.forEach(m => {
                      monthPayments[m] = (monthPayments[m] || 0) + splitAmt;
                  });
              }
          }
      });

      const sortedKnownMonths = Array.from(allKnownMonths).sort((a,b) => new Date(a) - new Date(b));
      const currentMonthDate = new Date();
      const currentMonthStr = currentMonthDate.toLocaleString('default', { month: 'short', year: 'numeric' });
      
      let startMonthStr = sortedKnownMonths.length > 0 ? sortedKnownMonths[0] : currentMonthStr;
      
      const startD = new Date(startMonthStr);
      let endD = new Date(); 
      
      if (sortedKnownMonths.length > 0) {
          const lastPaidD = new Date(sortedKnownMonths[sortedKnownMonths.length - 1]);
          if (lastPaidD > endD) endD = lastPaidD;
      }

      const timeline = [];
      let curr = new Date(startD.getFullYear(), startD.getMonth(), 1);
      const end = new Date(endD.getFullYear(), endD.getMonth(), 1);
      while(curr <= end) {
          timeline.push(curr.toLocaleString('default', { month: 'short', year: 'numeric' }));
          curr.setMonth(curr.getMonth() + 1);
      }

      let carryOver = 0; 
      let totalPaidLifetime = 0;

      timeline.forEach(m => {
          const paidThisMonth = monthPayments[m] || 0;
          totalPaidLifetime += paidThisMonth;

          const incomingCarry = carryOver; // 🚀 NAYA: Pichle mahine se kya aaya
          const totalAvailable = paidThisMonth + incomingCarry;
          const balance = totalAvailable - baseFee;

          let finalStatus = '';
          let statusColor = '';

          if (balance < 0) {
              finalStatus = `⚠️ Due: ₹${Math.abs(balance)}`;
              statusColor = 'text-red-500';
              carryOver = balance; 
          } else if (balance > 0) {
              finalStatus = `⭐ Adv: ₹${balance}`;
              statusColor = 'text-blue-500';
              carryOver = balance; 
          } else {
              finalStatus = `✅ Cleared`;
              statusColor = 'text-green-500';
              carryOver = 0;
          }

          ledger.push({
              month: m,
              base: baseFee,
              paid: paidThisMonth,
              incomingCarry: incomingCarry,
              finalStatus: finalStatus,
              statusColor: statusColor,
              netBalance: carryOver
          });
      });

      ledger.reverse(); 

      currentMonthSummary = ledger.find(l => l.month === currentMonthStr) || { base: baseFee, paid: 0, incomingCarry: 0, netBalance: -baseFee };
      const currentIndex = ledger.findIndex(l => l.month === currentMonthStr);
      
      previousMonthSummary = currentIndex !== -1 && ledger[currentIndex + 1] 
                             ? ledger[currentIndex + 1] 
                             : { netBalance: 0 };
      
      totalDueOverall = currentMonthSummary.netBalance < 0 ? Math.abs(currentMonthSummary.netBalance) : 0;

      const fullyPaidCount = Math.floor(totalPaidLifetime / (baseFee || 1));
      let vm = startD.getMonth() + fullyPaidCount - 1;
      let vy = startD.getFullYear();
      while(vm > 11) { vm -= 12; vy++; }
      validTillText = fullyPaidCount > 0 ? `End of ${months[vm]} ${vy}` : 'N/A';

      if (currentMonthDate.getDate() > 20 && currentMonthSummary.paid === 0 && totalDueOverall > 0) {
          accountStatus = "🔴 Pending / Discontinued";
      }
  }

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      
      <div className="print:hidden">
        
        <div className="max-w-6xl mx-auto flex justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm border-b-4 border-indigo-600">
            <h1 className="text-3xl font-black text-indigo-700 uppercase">{config.appName}</h1>
            <Link to="/dashboard" className="bg-slate-200 text-slate-700 px-5 py-2 rounded-lg font-black hover:bg-slate-300">← Back</Link>
        </div>

        <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                
                <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-xl border border-gray-100 flex flex-col md:flex-row items-center gap-8">
                    <img src={student.photo_url || student.photo || 'https://via.placeholder.com/150'} alt="Profile" className="h-36 w-36 rounded-3xl object-cover border-4 border-indigo-50 shadow-md" />
                    <div className="text-center md:text-left space-y-2 w-full">
                        <h2 className="text-4xl font-black text-slate-800 uppercase tracking-tighter">{student.name}</h2>
                        
                        <div className={`inline-block px-4 py-1.5 rounded-md font-black text-xs uppercase tracking-widest shadow-sm ${accountStatus.includes('🔴') ? 'bg-red-100 text-red-700 border border-red-200 animate-pulse' : 'bg-green-100 text-green-700 border border-green-200'}`}>
                            {student.has_active_plan ? `PRO Plan Activated` : accountStatus}
                        </div>

                        <div className="pt-2 text-sm font-bold text-slate-600 grid grid-cols-1 md:grid-cols-2 gap-2 uppercase">
                            <p>📞 {student.mobile || 'N/A'}</p>
                            <p>🆔 ID: #{config.receiptPrefix}-{student.id}</p>
                        </div>
                        
                        <div className="pt-3 border-t mt-3 border-slate-100">
                            <a href={`https://wa.me/91${student.whatsapp}?text=${encodeURIComponent(totalDueOverall > 0 ? `Namaste ${student.name}, Aapki fees ₹${totalDueOverall} due hai. Kripya app mein payment clear karein.` : `Namaste ${student.name}, Aapka account ekdum clear hai. Thank you!`)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-green-500 text-white px-5 py-2 rounded-xl font-black shadow-md hover:bg-green-600 transition-all uppercase tracking-widest text-xs">
                                💬 Send WhatsApp
                            </a>
                        </div>
                    </div>
                </div>

                {!student.has_active_plan && currentMonthSummary && (
                    <div className="bg-slate-900 p-6 rounded-3xl text-white shadow-2xl border-t-8 border-indigo-500 flex flex-col justify-between">
                        <div>
                            <h3 className="text-xs font-black mb-3 border-b border-white/20 pb-2 uppercase tracking-widest text-indigo-300">Financial Summary</h3>
                            
                            <div className="space-y-2 text-sm font-bold">
                                <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg">
                                    <span className="text-slate-400 text-[10px] tracking-widest uppercase">Base Month Fee:</span> 
                                    <span className="text-lg">₹{currentMonthSummary.base}</span>
                                </div>
                                <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg">
                                    <span className="text-slate-400 text-[10px] tracking-widest uppercase">Paid in Current Mth:</span> 
                                    <span className="text-green-400 text-lg">₹{currentMonthSummary.paid}</span>
                                </div>
                                
                                <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg border-l-4 border-amber-400">
                                    <span className="text-amber-200 text-[10px] tracking-widest uppercase">Prev Mth {previousMonthSummary.netBalance < 0 ? 'Due' : 'Advance'}:</span> 
                                    <span className={previousMonthSummary.netBalance < 0 ? 'text-red-400' : 'text-blue-400'}>
                                        ₹{Math.abs(previousMonthSummary.netBalance)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-white/20">
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-[10px] uppercase text-slate-400 tracking-widest mb-1">Total Due Now</p>
                                    <p className={`text-3xl font-black ${totalDueOverall > 0 ? 'text-red-400 animate-pulse' : 'text-green-400'}`}>
                                        ₹{totalDueOverall}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] uppercase text-slate-400 tracking-widest mb-1">Valid Till</p>
                                    <p className="text-yellow-300 text-xs font-black uppercase">{validTillText}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 📜 MONTH-WISE SEPARATE TABLE (Advance Fixed) */}
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 mb-10">
            <div className="bg-indigo-700 p-4 text-white font-black uppercase tracking-widest text-center text-sm">
                📜 MONTH-WISE FEES SEPARATION LEDGER
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-center border-collapse">
                    <thead className="bg-slate-100 text-[10px] font-black uppercase text-slate-500 tracking-widest">
                    <tr>
                        <th className="p-4 border-b text-left pl-6">Month of Fees</th>
                        <th className="p-4 border-b text-center text-slate-600">Base Fees</th>
                        <th className="p-4 border-b text-center text-green-600">Paid Direct</th>
                        
                        {/* 🚀 NAYA COLUMN: Pura Hisaab dikhayega */}
                        <th className="p-4 border-b text-center text-amber-600">Pichla Hisaab (Adj)</th>
                        
                        <th className="p-4 border-b text-right pr-6">Month Status</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                    {student.has_active_plan ? (
                        <tr><td colSpan="5" className="p-10 font-bold text-slate-400">PRO Plan Active - Refer to Dashboard.</td></tr>
                    ) : (
                        ledger.length > 0 ? ledger.map((row, idx) => (
                            <tr key={idx} className="hover:bg-indigo-50/30 transition-all border-b">
                                
                                <td className="p-4 text-left pl-6">
                                    <span className="font-black text-indigo-900 uppercase text-sm bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">
                                        🗓️ {row.month}
                                    </span>
                                </td>
                                
                                <td className="p-4 font-bold text-slate-600 text-sm">₹{row.base}</td>
                                
                                <td className="p-4 font-black text-green-600 text-sm">₹{row.paid}</td>
                                
                                {/* 🚀 FIX: Yahan exactly pata chalega ki advance apply hua hai */}
                                <td className="p-4 font-black text-amber-500 text-xs">
                                    {row.incomingCarry > 0 ? `+₹${row.incomingCarry} (Adv)` : row.incomingCarry < 0 ? `-₹${Math.abs(row.incomingCarry)} (Due)` : '₹0'}
                                </td>
                                
                                <td className={`p-4 text-right pr-6 font-black text-sm ${row.statusColor}`}>
                                    {row.finalStatus}
                                </td>

                            </tr>
                        )) : <tr><td colSpan="5" className="p-10 text-slate-300 font-black italic uppercase text-xs">No records found.</td></tr>
                    )}
                    </tbody>
                </table>
            </div>
            </div>

        </div>
      </div>
    </div>
  );
}

export default StudentProfile;
