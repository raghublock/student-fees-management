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
  // 🧠 AUTOMATIC DYNAMIC MONTH-WISE LEDGER
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
      const allMonthsSet = new Set();
      
      paymentHistory.forEach(p => {
          if (p.status === 'Paid' && p.amount) {
              const mStr = p.month || new Date(p.paid_on).toLocaleString('default', { month: 'short', year: 'numeric' });
              const mArr = mStr.split(',').map(m => m.trim());
              const splitAmt = Number(p.amount) / mArr.length;
              
              mArr.forEach(m => {
                  monthPayments[m] = (monthPayments[m] || 0) + splitAmt;
                  allMonthsSet.add(m);
              });
          }
      });

      const sortedMonths = Array.from(allMonthsSet).sort((a,b) => new Date(a) - new Date(b));
      const currentMonthDate = new Date();
      const currentMonthStr = currentMonthDate.toLocaleString('default', { month: 'short', year: 'numeric' });
      
      let startMonthStr = sortedMonths.length > 0 ? sortedMonths[0] : currentMonthStr;
      
      const startD = new Date(startMonthStr);
      let endD = new Date(); 
      
      if (sortedMonths.length > 0) {
          const lastPaidD = new Date(sortedMonths[sortedMonths.length - 1]);
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

          const totalAvailable = paidThisMonth + carryOver;
          const balance = totalAvailable - baseFee;

          let due = 0;
          let advance = 0;

          if (balance < 0) {
              due = Math.abs(balance);
              carryOver = balance; 
          } else {
              advance = balance;
              carryOver = balance; 
          }

          ledger.push({
              month: m,
              base: baseFee,
              paid: paidThisMonth,
              due: due,
              advance: advance,
              netBalance: carryOver
          });
      });

      ledger.reverse(); // Latest month on top

      currentMonthSummary = ledger.find(l => l.month === currentMonthStr) || { base: baseFee, paid: 0, due: baseFee, advance: 0, netBalance: -baseFee };
      const currentIndex = ledger.findIndex(l => l.month === currentMonthStr);
      
      previousMonthSummary = currentIndex !== -1 && ledger[currentIndex + 1] 
                             ? ledger[currentIndex + 1] 
                             : { due: 0, advance: 0, netBalance: 0 };
      
      totalDueOverall = currentMonthSummary.netBalance < 0 ? Math.abs(currentMonthSummary.netBalance) : 0;

      const fullyPaidCount = Math.floor(totalPaidLifetime / (baseFee || 1));
      let vm = startD.getMonth() + fullyPaidCount - 1;
      let vy = startD.getFullYear();
      while(vm > 11) { vm -= 12; vy++; }
      validTillText = fullyPaidCount > 0 ? `End of ${months[vm]} ${vy}` : 'N/A';

      // 20 TAREEKH DISCONTINUED LOGIC
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
                
                {/* Info Card */}
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

                {/* EXACT REQUESTED FINANCIAL BOX */}
                {!student.has_active_plan && currentMonthSummary && (
                    <div className="bg-slate-900 p-6 rounded-3xl text-white shadow-2xl border-t-8 border-indigo-500 flex flex-col justify-between">
                        <div>
                            <h3 className="text-xs font-black mb-3 border-b border-white/20 pb-2 uppercase tracking-widest text-indigo-300">Financial Summary</h3>
                            
                            <div className="space-y-2 text-sm font-bold">
                                <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg">
                                    <span className="text-slate-400 text-[10px] tracking-widest uppercase">Current Month Base Fees:</span> 
                                    <span className="text-lg">₹{currentMonthSummary.base}</span>
                                </div>
                                <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg">
                                    <span className="text-slate-400 text-[10px] tracking-widest uppercase">Current Month Paid Fees:</span> 
                                    <span className="text-green-400 text-lg">₹{currentMonthSummary.paid}</span>
                                </div>
                                
                                <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg border-l-4 border-amber-400">
                                    <span className="text-amber-200 text-[10px] tracking-widest uppercase">Prev Month {previousMonthSummary.netBalance < 0 ? 'Due' : 'Advance'}:</span> 
                                    <span className={previousMonthSummary.netBalance < 0 ? 'text-red-400' : 'text-blue-400'}>
                                        ₹{Math.abs(previousMonthSummary.netBalance)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-white/20">
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-[10px] uppercase text-slate-400 tracking-widest mb-1">Total Due</p>
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

            {/* 📜 MONTH-WISE SEPARATE TABLE */}
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
                        <th className="p-4 border-b text-center text-green-600">Paid Fees</th>
                        <th className="p-4 border-b text-center text-blue-600">Advance Fees</th>
                        <th className="p-4 border-b text-center text-red-500">Due Fees</th>
                        <th className="p-4 border-b text-right pr-6">Fees Receipt</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                    {student.has_active_plan ? (
                        <tr><td colSpan="6" className="p-10 font-bold text-slate-400">PRO Plan Active - Refer to Dashboard.</td></tr>
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
                                
                                <td className="p-4 font-black text-blue-500 text-sm">{row.advance > 0 ? `+₹${row.advance}` : '-'}</td>
                                
                                <td className="p-4 font-black text-red-500 text-sm">{row.due > 0 ? `⚠️ ₹${row.due}` : '-'}</td>

                                <td className="p-4 text-right pr-6">
                                    <button 
                                        onClick={() => handlePrint(row)} 
                                        className="bg-slate-800 hover:bg-black text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-md"
                                    >
                                        🖨️ Receipt
                                    </button>
                                </td>

                            </tr>
                        )) : <tr><td colSpan="6" className="p-10 text-slate-300 font-black italic uppercase text-xs">No records found.</td></tr>
                    )}
                    </tbody>
                </table>
            </div>
            </div>

        </div>
      </div>

      {/* 🖨️ SPECIFIC MONTH PRINT VIEW */}
      {printMonthData && (
      <div className="hidden print:block w-full max-w-3xl mx-auto bg-white text-black p-8 border-2 border-gray-800 outline-2 outline-offset-4 outline-black">
        <div className="flex justify-between items-end border-b-4 border-gray-800 pb-6 mb-6">
            <div>
               <h1 className="text-5xl font-black uppercase tracking-tighter text-black">{config.appName}</h1>
               <p className="font-bold text-gray-600 uppercase tracking-widest mt-1 text-sm">{config.branchName}</p>
            </div>
            <div className="text-right">
               <h2 className="text-3xl font-black uppercase text-gray-300 tracking-widest">FEE RECEIPT</h2>
               <p className="font-bold text-gray-800 mt-2 text-sm">Receipt No: #{config.receiptPrefix}-{student.id}-{Math.floor(Math.random() * 900) + 100}</p>
               <p className="font-bold text-gray-800 text-sm">Date: {new Date().toLocaleDateString('en-IN')}</p>
            </div>
        </div>

        <div className="mb-8 flex justify-between">
            <div>
               <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1">Received From:</p>
               <h3 className="text-2xl font-black uppercase text-black">{student.name}</h3>
               <p className="font-bold text-gray-800">Phone: {student.mobile || student.whatsapp || 'N/A'}</p>
               <p className="font-bold text-gray-800">ID: #{config.receiptPrefix}-{student.id}</p>
            </div>
            <div className="text-right">
                <span className="border-2 border-black text-black text-xs px-3 py-1 font-black uppercase tracking-widest">
                    Billing Month: {printMonthData.month}
                </span>
            </div>
        </div>
        
        <table className="w-full border-collapse border-2 border-gray-800 mb-8">
            <thead className="bg-gray-100">
                <tr>
                    <th className="border-2 border-gray-800 p-4 text-left font-black uppercase tracking-widest text-xs">Description</th>
                    <th className="border-2 border-gray-800 p-4 text-center font-black uppercase tracking-widest text-xs">Base Fee</th>
                    <th className="border-2 border-gray-800 p-4 text-right font-black uppercase tracking-widest text-xs">Amount Paid</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td className="border-2 border-gray-800 p-4 font-bold text-sm uppercase">
                        Fees Payment for Month of {printMonthData.month}
                    </td>
                    <td className="border-2 border-gray-800 p-4 text-center font-bold text-sm uppercase">
                         ₹{printMonthData.base}
                    </td>
                    <td className="border-2 border-gray-800 p-4 text-right font-black text-xl">
                        ₹{printMonthData.paid}
                    </td>
                </tr>
            </tbody>
        </table>

        <div className="flex justify-end mb-8 gap-4">
           {printMonthData.advance > 0 && (
               <div className="border-2 border-gray-800 p-3 w-48 flex justify-between bg-gray-100">
                  <span className="font-black uppercase text-xs tracking-widest">Advance:</span>
                  <span className="font-black text-lg">₹{printMonthData.advance}</span>
               </div>
           )}
           {printMonthData.due > 0 && (
               <div className="border-2 border-gray-800 p-3 w-48 flex justify-between bg-gray-100">
                  <span className="font-black uppercase text-xs tracking-widest">Due Balance:</span>
                  <span className="font-black text-lg">₹{printMonthData.due}</span>
               </div>
           )}
        </div>

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
      )}
    </div>
  );
}

export default StudentProfile;
