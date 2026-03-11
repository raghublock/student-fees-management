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
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payDiscount, setPayDiscount] = useState('');
  const [payMode, setPayMode] = useState('Cash');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const API_URL = config.apiUrl; 
  const token = localStorage.getItem('adminToken');

  const loadProfileData = () => {
    fetch(`${API_URL}/api/students`, { headers: { 'Authorization': `Bearer ${token}` } })
    .then(res => res.json())
    .then(data => {
      if (Array.isArray(data)) {
        const foundStudent = data.find(s => Number(s.id) === Number(id));
        setStudent(foundStudent);
        if (foundStudent) {
          const targetEndpoint = foundStudent.has_active_plan ? `${API_URL}/api/plans/history` : `${API_URL}/api/fees/history`;
          fetch(targetEndpoint, { headers: { 'Authorization': `Bearer ${token}` } })
          .then(res => res.json())
          .then(historyData => {
            if (Array.isArray(historyData)) {
              const filtered = historyData.filter(item => Number(item.student_id) === Number(id));
              setPaymentHistory(filtered);
            }
          });
        }
      }
    });
  };

  useEffect(() => {
    if (!token) return navigate('/');
    loadProfileData();
    // eslint-disable-next-line
  }, [id, token, navigate]);

  const handleAddNewPayment = async (e) => {
      e.preventDefault();
      const amt = Number(payAmount) || 0;
      const disc = Number(payDiscount) || 0;
      if (amt <= 0 && disc <= 0) return toast.error("Amount daalein!");

      setIsProcessing(true);
      const tid = toast.loading("Entry save ho rahi hai...");

      try {
          if (amt > 0) {
              await fetch(`${API_URL}/api/fees/add`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                  body: JSON.stringify({ student_id: student.id, amount: amt, paid_on: new Date().toISOString().split('T')[0], mode: payMode, description: `Cycle Payment`, status: "Paid", month: "Extension" })
              });
          }
          if (disc > 0) {
              await fetch(`${API_URL}/api/fees/add`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                  body: JSON.stringify({ student_id: student.id, amount: disc, paid_on: new Date().toISOString().split('T')[0], mode: 'Discount', description: `Cycle Discount`, status: "Paid", month: "Extension" })
              });
          }

          const newPaid = Number(student.paid_fees || 0) + amt;
          const newDisc = Number(student.extra_fees || 0) + disc;
          await fetch(`${API_URL}/api/student/update/${student.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ ...student, paid_fees: newPaid, extra_fees: newDisc })
          });

          toast.success(`Entry Successful! 🎉`, { id: tid });
          setShowPayModal(false); setPayAmount(''); setPayDiscount('');
          loadProfileData();
      } catch (error) { toast.error("Entry fail ho gayi.", { id: tid }); } 
      finally { setIsProcessing(false); }
  };

  const handlePrint = (monthData) => { 
      setPrintMonthData(monthData);
      setTimeout(() => window.print(), 100);
  };

  if (!student) return <div className="p-10 text-center font-bold text-gray-400 uppercase tracking-widest animate-pulse">{config.appName} | Profile Loading...</div>;

  // =================================================================
  // 🧠 DATE-TO-DATE CYCLE ENGINE (No more manual month names!)
  // =================================================================
  
  const baseFee = Number(student.total_fees || 0);
  let ledger = [];
  let validTillStr = "N/A";
  let liveDue = 0;
  let totalBilledSoFar = 0;
  let totalPaid = 0;
  let totalDiscount = 0;
  
  if (!student.has_active_plan && paymentHistory.length > 0) {
      
      // 1. Find Exact Joining Date (From the Anchor)
      const sortedHistory = [...paymentHistory].sort((a,b) => new Date(a.paid_on) - new Date(b.paid_on));
      const firstRecordDate = sortedHistory.length > 0 ? sortedHistory[0].paid_on : new Date().toISOString().split('T')[0];
      const joinD = new Date(firstRecordDate);

      // 2. Sum all Paid and Discount money
      paymentHistory.forEach(p => {
          if (p.status === 'Paid') {
              if (p.mode === 'Discount') totalDiscount += Number(p.amount);
              else totalPaid += Number(p.amount);
          }
      });
      const effectivePaid = totalPaid + totalDiscount;

      // 3. Calculate Valid Till Date (Date to Date)
      const monthsCovered = Math.floor(effectivePaid / (baseFee || 1));
      const validTill = new Date(joinD);
      validTill.setMonth(validTill.getMonth() + monthsCovered);
      validTillStr = validTill.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

      // 4. Calculate how many Cycles have passed till TODAY
      const today = new Date();
      let cyclesPassed = 0;
      let tempD = new Date(joinD);
      while(tempD <= today) {
          cyclesPassed++;
          tempD.setMonth(tempD.getMonth() + 1);
      }
      if (cyclesPassed === 0) cyclesPassed = 1; // At least 1st month bill

      totalBilledSoFar = cyclesPassed * baseFee;
      liveDue = totalBilledSoFar - effectivePaid;

      // 5. Build Dynamic Ledger Array (Cycle by Cycle)
      let runningFunds = effectivePaid;
      const cyclesToShow = Math.max(cyclesPassed, Math.ceil(effectivePaid / (baseFee || 1)));

      for(let i = 0; i < cyclesToShow; i++) {
          // Cycle Start
          let cStart = new Date(joinD);
          cStart.setMonth(cStart.getMonth() + i);
          
          // Cycle End (1 day before next month)
          let cEnd = new Date(cStart);
          cEnd.setMonth(cEnd.getMonth() + 1);
          cEnd.setDate(cEnd.getDate() - 1);

          let cycleName = `${cStart.toLocaleDateString('en-IN', {day:'numeric', month:'short'})} to ${cEnd.toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'})}`;

          let rowBilled = baseFee;
          let rowPaid = 0;

          if (runningFunds >= rowBilled) {
              rowPaid = rowBilled;
              runningFunds -= rowBilled;
          } else if (runningFunds > 0) {
              rowPaid = runningFunds;
              runningFunds = 0;
          }

          let rowDue = rowBilled - rowPaid;

          ledger.push({
              cycle: cycleName,
              billed: rowBilled,
              allocated: rowPaid,
              due: rowDue,
              status: rowDue === 0 ? '✅ Cleared' : (rowPaid > 0 ? `⚠️ Due: ₹${rowDue}` : `❌ Unpaid`),
              statusColor: rowDue === 0 ? 'text-green-600' : 'text-red-500'
          });
      }
      ledger.reverse(); // Latest cycle on top
  } else if (student.has_active_plan && paymentHistory.length > 0) {
      validTillStr = paymentHistory[0].expiry_date ? new Date(paymentHistory[0].expiry_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';
  }

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans relative">
      <div className="print:hidden">
        
        <div className="max-w-6xl mx-auto flex justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm border-b-4 border-indigo-600">
            <h1 className="text-3xl font-black text-indigo-700 uppercase">{config.appName} 📚</h1>
            <div className="flex gap-3">
                <Link to="/dashboard" className="bg-slate-200 text-slate-700 px-5 py-2 rounded-lg font-black hover:bg-slate-300 transition-all">← Back</Link>
            </div>
        </div>

        <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                
                <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-xl border border-gray-100 flex flex-col md:flex-row items-center gap-8">
                    <img src={student.photo_url || student.photo || 'https://via.placeholder.com/150'} alt="Profile" className="h-36 w-36 rounded-3xl object-cover border-4 border-indigo-50 shadow-md" />
                    <div className="text-center md:text-left space-y-2 w-full">
                        <div className="flex flex-col md:flex-row items-center gap-4 justify-between w-full">
                            <h2 className="text-4xl font-black text-slate-800 uppercase tracking-tighter">{student.name}</h2>
                            
                            {!student.has_active_plan && (
                                <button 
                                    onClick={() => setShowPayModal(true)} 
                                    className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-black shadow-lg hover:bg-indigo-700 transition-all uppercase tracking-widest text-xs flex items-center gap-2 border-2 border-indigo-700"
                                >
                                    💳 Add Payment Entry
                                </button>
                            )}
                        </div>
                        
                        <div className={`inline-block px-4 py-1.5 rounded-md font-black text-xs uppercase tracking-widest shadow-sm ${liveDue > 0 ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-green-100 text-green-700 border border-green-200'}`}>
                            {student.has_active_plan ? `Seat Fixed 📦` : (liveDue > 0 ? `⚠️ Dues Pending` : `✅ Active Reader`)}
                        </div>

                        <div className="pt-2 text-sm font-bold text-slate-600 grid grid-cols-1 md:grid-cols-2 gap-2 uppercase">
                            <p>📞 {student.mobile || 'N/A'}</p>
                            <p>🆔 ID: #{config.receiptPrefix}-{student.id}</p>
                        </div>
                        
                        <div className="pt-3 border-t mt-3 border-slate-100">
                            <a href={`https://wa.me/91${student.whatsapp}?text=${encodeURIComponent(liveDue > 0 ? `Namaste ${student.name}, Aapki library fees ₹${liveDue} due hai. Kripya app mein payment clear karein. Thank you!` : `Namaste ${student.name}, Aapka account clear hai. Happy Reading!`)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-green-500 text-white px-5 py-2 rounded-xl font-black shadow-md hover:bg-green-600 transition-all uppercase tracking-widest text-xs">
                                💬 Send WhatsApp Reminder
                            </a>
                        </div>
                    </div>
                </div>

                {!student.has_active_plan && (
                    <div className="bg-slate-900 p-6 rounded-3xl text-white shadow-2xl border-t-8 border-indigo-500 flex flex-col justify-between">
                        <div>
                            <h3 className="text-xs font-black mb-3 border-b border-white/20 pb-2 uppercase tracking-widest text-indigo-300">Financial Summary</h3>
                            
                            <div className="space-y-2 text-sm font-bold">
                                <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg">
                                    <span className="text-slate-400 text-[10px] tracking-widest uppercase">Base Fee (Monthly):</span> 
                                    <span className="text-lg">₹{baseFee}</span>
                                </div>
                                <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg border-l-4 border-green-400">
                                    <span className="text-slate-300 text-[10px] tracking-widest uppercase">Total Cash Paid:</span> 
                                    <span className="text-green-400 text-lg">₹{totalPaid}</span>
                                </div>
                                <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg border-l-4 border-amber-400">
                                    <span className="text-slate-300 text-[10px] tracking-widest uppercase">Total Discounts:</span> 
                                    <span className="text-amber-400 text-sm">₹{totalDiscount}</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-white/20">
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-[10px] uppercase text-slate-400 tracking-widest mb-1">Live Due Now</p>
                                    <p className={`text-3xl font-black ${liveDue > 0 ? 'text-red-400 animate-pulse' : liveDue < 0 ? 'text-blue-400' : 'text-green-400'}`}>
                                        {liveDue < 0 ? `Adv: ₹${Math.abs(liveDue)}` : `₹${liveDue}`}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] uppercase text-slate-400 tracking-widest mb-1">Library Validity</p>
                                    <p className="text-yellow-300 text-[11px] font-black uppercase">{validTillStr}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 📜 NAYA: CYCLE-WISE DYNAMIC LEDGER */}
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 mb-10">
            <div className="bg-indigo-700 p-4 text-white font-black uppercase tracking-widest text-center text-sm flex justify-between items-center">
                <span>📜 DYNAMIC DATE-TO-DATE CYCLE LEDGER</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-center border-collapse">
                    <thead className="bg-slate-100 text-[10px] font-black uppercase text-slate-500 tracking-widest">
                    <tr>
                        <th className="p-4 border-b text-left pl-6">Reading Cycle</th>
                        <th className="p-4 border-b text-center text-slate-600">Cycle Base Fee</th>
                        <th className="p-4 border-b text-center text-green-600">Allocated Amount</th>
                        <th className="p-4 border-b text-right pr-6">Cycle Status</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                    {student.has_active_plan ? (
                        <tr><td colSpan="4" className="p-10 font-bold text-slate-400">PRO Plan Active. Custom validity applied.</td></tr>
                    ) : (
                        ledger.length > 0 ? ledger.map((row, idx) => (
                            <tr key={idx} className="hover:bg-indigo-50/30 transition-all border-b">
                                
                                <td className="p-4 text-left pl-6">
                                    <span className="font-black text-indigo-900 uppercase text-xs bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 flex items-center justify-between gap-4 w-max">
                                        🗓️ {row.cycle}
                                        <button onClick={() => handlePrint(row)} className="text-indigo-500 hover:text-indigo-800 transition-colors" title="Print Receipt">🖨️</button>
                                    </span>
                                </td>
                                
                                <td className="p-4 font-bold text-slate-600 text-sm">₹{row.billed}</td>
                                
                                <td className="p-4 font-black text-green-600 text-sm">₹{row.allocated}</td>
                                
                                <td className={`p-4 text-right pr-6 font-black text-sm ${row.statusColor}`}>
                                    {row.status}
                                </td>

                            </tr>
                        )) : <tr><td colSpan="4" className="p-10 text-slate-300 font-black italic uppercase text-xs">Koi reading record nahi mila.</td></tr>
                    )}
                    </tbody>
                </table>
            </div>
            </div>

        </div>
      </div>

      {showPayModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl transform transition-all border-t-8 border-indigo-600">
            <h3 className="text-xl font-black uppercase text-center mb-1 text-indigo-700">💳 Record Payment</h3>
            <p className="text-center text-xs font-bold text-slate-400 mb-6">Payment from <span className="text-slate-800">{student.name}</span></p>
            
            <form onSubmit={handleAddNewPayment} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pay Amount (₹)</label><input type="number" className="w-full border-2 border-slate-200 p-3 rounded-xl outline-none font-black text-2xl focus:border-indigo-500 text-indigo-700 text-center" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} required autoFocus /></div>
                <div><label className="text-[10px] font-black text-amber-500 uppercase tracking-widest ml-1">Discount (₹)</label><input type="number" className="w-full border-2 border-amber-200 p-3 rounded-xl outline-none font-black text-lg focus:border-amber-500 text-amber-600 bg-amber-50" value={payDiscount} onChange={(e) => setPayDiscount(e.target.value)} placeholder="e.g. 50" /></div>
                <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mode</label><select className="w-full border-2 border-slate-200 p-3 rounded-xl focus:border-slate-500 outline-none font-bold text-slate-700 h-[52px]" value={payMode} onChange={(e) => setPayMode(e.target.value)}><option>Cash</option><option>UPI</option><option>Card</option></select></div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => { setShowPayModal(false); setPayAmount(''); setPayDiscount(''); }} className="flex-1 bg-slate-100 text-slate-500 font-black py-3 rounded-xl">Cancel</button>
                <button type="submit" disabled={isProcessing} className={`flex-1 text-white font-black py-3 rounded-xl shadow-lg uppercase ${isProcessing ? 'bg-slate-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                    ✅ Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {printMonthData && (
      <div className="hidden print:block w-full max-w-3xl mx-auto bg-white text-black p-8 border-2 border-gray-800 outline-2 outline-offset-4 outline-black">
        <div className="flex justify-between items-end border-b-4 border-gray-800 pb-6 mb-6">
            <div>
               <h1 className="text-5xl font-black uppercase tracking-tighter text-black">{config.appName}</h1>
               <p className="font-bold text-gray-600 uppercase tracking-widest mt-1 text-sm">{config.branchName}</p>
            </div>
            <div className="text-right">
               <h2 className="text-3xl font-black uppercase text-gray-300 tracking-widest">LIBRARY RECEIPT</h2>
               <p className="font-bold text-gray-800 mt-2 text-sm">Receipt No: #{config.receiptPrefix}-{student.id}-{Math.floor(Math.random() * 900) + 100}</p>
               <p className="font-bold text-gray-800 text-sm">Date: {new Date().toLocaleDateString('en-IN')}</p>
            </div>
        </div>

        <div className="mb-8 flex justify-between">
            <div>
               <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1">Received From:</p>
               <h3 className="text-2xl font-black uppercase text-black">{student.name}</h3>
               <p className="font-bold text-gray-800">Phone: {student.mobile || student.whatsapp || 'N/A'}</p>
            </div>
            <div className="text-right">
                <span className="border-2 border-black text-black text-xs px-3 py-1 font-black uppercase tracking-widest">
                    Cycle: {printMonthData.cycle}
                </span>
            </div>
        </div>
        
        <table className="w-full border-collapse border-2 border-gray-800 mb-8">
            <thead className="bg-gray-100">
                <tr>
                    <th className="border-2 border-gray-800 p-4 text-left font-black uppercase tracking-widest text-xs">Description</th>
                    <th className="border-2 border-gray-800 p-4 text-center font-black uppercase tracking-widest text-xs">Base Fee</th>
                    <th className="border-2 border-gray-800 p-4 text-right font-black uppercase tracking-widest text-xs">Allocated Amount</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td className="border-2 border-gray-800 p-4 font-bold text-sm uppercase">
                        Library Cycle Payment
                    </td>
                    <td className="border-2 border-gray-800 p-4 text-center font-bold text-sm uppercase">
                         ₹{printMonthData.billed}
                    </td>
                    <td className="border-2 border-gray-800 p-4 text-right font-black text-xl">
                        ₹{printMonthData.allocated}
                    </td>
                </tr>
            </tbody>
        </table>

        {printMonthData.due > 0 && (
            <div className="flex justify-end mb-8">
               <div className="border-2 border-gray-800 p-3 w-64 flex justify-between bg-gray-100">
                  <span className="font-black uppercase text-xs tracking-widest">Cycle Due Balance:</span>
                  <span className="font-black text-xl text-red-600">₹{printMonthData.due}</span>
               </div>
            </div>
        )}
      </div>
      )}
    </div>
  );
}

export default StudentProfile;
