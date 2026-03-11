import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import config from '../config';

function Analytics() {
  const [students, setStudents] = useState([]);
  const [feesHistory, setFeesHistory] = useState([]);
  const [plansHistory, setPlansHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const navigate = useNavigate();
  const API_URL = config.apiUrl;
  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    if (!token) return navigate('/');

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [resStudents, resFees, resPlans] = await Promise.all([
          fetch(`${API_URL}/api/students`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${API_URL}/api/fees/history`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${API_URL}/api/plans/history`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        const dataStudents = await resStudents.json();
        const dataFees = await resFees.json();
        const dataPlans = await resPlans.json();

        setStudents(Array.isArray(dataStudents) ? dataStudents : []);
        setFeesHistory(Array.isArray(dataFees) ? dataFees : []);
        setPlansHistory(Array.isArray(dataPlans) ? dataPlans : []);
      } catch (error) {
        toast.error("Data load hone mein error aayi!");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [token, navigate, API_URL]);

  // ==========================================
  // 🧠 SMART ANALYTICS ENGINE
  // ==========================================
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  let previousMonth = currentMonth - 1;
  let previousYear = currentYear;
  if (previousMonth < 0) {
      previousMonth = 11;
      previousYear--;
  }

  // 1. REVENUE CALCULATIONS
  let revThisMonth = 0;
  let revLastMonth = 0;
  let totalLifetimeCollection = 0;

  feesHistory.forEach(f => {
      if (f.status === 'Paid' && f.mode !== 'Discount') {
          const amt = Number(f.amount) || 0;
          totalLifetimeCollection += amt;
          
          const d = new Date(f.paid_on);
          if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
              revThisMonth += amt;
          } else if (d.getMonth() === previousMonth && d.getFullYear() === previousYear) {
              revLastMonth += amt;
          }
      }
  });

  plansHistory.forEach(p => {
      const amt = Number(p.price) || 0;
      totalLifetimeCollection += amt;
      
      const d = new Date(p.start_date);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
          revThisMonth += amt;
      } else if (d.getMonth() === previousMonth && d.getFullYear() === previousYear) {
          revLastMonth += amt;
      }
  });

  // 2. STUDENT PROCESSING & EXPIRY CATEGORIZATION
  let totalGlobalDue = 0;
  let dueGeneratedThisMonth = 0; // Due belonging to students whose cycle started/renewed this month

  const expiry1to5 = [];
  const expiry6to10 = [];
  const expiry11to15 = [];
  const masterTableData = [];

  students.forEach(s => {
      const baseFee = Number(s.total_fees) || 0;
      const discountAmt = Number(s.extra_fees) || 0;
      const liveDue = baseFee - Number(s.paid_fees) - discountAmt;
      
      if (liveDue > 0) totalGlobalDue += liveDue;

      let validTillD = null;
      let joinD = null;
      let totalBilled = 0;
      let latestPayDate = 'N/A';
      let latestPayAmt = 0;

      const studentFees = feesHistory.filter(f => Number(f.student_id) === Number(s.id));

      if (s.has_active_plan) {
          const plan = plansHistory.find(p => Number(p.student_id) === Number(s.id));
          if (plan) {
              validTillD = new Date(plan.expiry_date);
              joinD = new Date(plan.start_date);
              totalBilled = Number(plan.price);
              latestPayDate = plan.start_date;
              latestPayAmt = plan.price;
          }
      } else {
          // Date-to-Date Logic for Regular Students
          const sortedF = [...studentFees].sort((a,b) => new Date(a.paid_on) - new Date(b.paid_on));
          if (sortedF.length > 0) {
              joinD = new Date(sortedF[0].paid_on);
              const cashPayments = sortedF.filter(f => f.status === 'Paid' && f.mode !== 'Discount');
              if (cashPayments.length > 0) {
                  const lastPay = cashPayments[cashPayments.length - 1];
                  latestPayDate = lastPay.paid_on;
                  latestPayAmt = lastPay.amount;
              }

              const totalPaid = Number(s.paid_fees) || 0;
              const effectivePaid = totalPaid + discountAmt;
              const monthsCovered = Math.floor(effectivePaid / (baseFee || 1));
              
              validTillD = new Date(joinD);
              validTillD.setMonth(validTillD.getMonth() + monthsCovered);

              let cyclesPassed = 0;
              let tempD = new Date(joinD);
              while(tempD <= today) { cyclesPassed++; tempD.setMonth(tempD.getMonth() + 1); }
              if (cyclesPassed === 0) cyclesPassed = 1;
              totalBilled = cyclesPassed * baseFee;

              // Check if their current active cycle started this month, if so add to "Due this month"
              let currentCycleStart = new Date(joinD);
              currentCycleStart.setMonth(currentCycleStart.getMonth() + (cyclesPassed - 1));
              if (currentCycleStart.getMonth() === currentMonth && currentCycleStart.getFullYear() === currentYear && liveDue > 0) {
                  dueGeneratedThisMonth += liveDue;
              }
          }
      }

      // Calculate Days Left
      let daysLeft = -999;
      let validTillStr = 'N/A';
      if (validTillD) {
          validTillStr = validTillD.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
          const timeDiff = validTillD.getTime() - today.getTime();
          daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));
      }

      const tableRow = {
          ...s,
          planName: s.has_active_plan ? 'Reserved Seat' : 'Regular Cycle',
          joinDateStr: joinD ? joinD.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A',
          validTillStr,
          daysLeft,
          totalBilled,
          liveDue: liveDue > 0 ? liveDue : 0,
          latestPayDate,
          latestPayAmt
      };

      masterTableData.push(tableRow);

      // Bucket Sorting for Expiries
      if (daysLeft >= 1 && daysLeft <= 5) expiry1to5.push(tableRow);
      else if (daysLeft >= 6 && daysLeft <= 10) expiry6to10.push(tableRow);
      else if (daysLeft >= 11 && daysLeft <= 15) expiry11to15.push(tableRow);
  });

  if (isLoading) return <div className="p-10 text-center font-black animate-pulse text-indigo-500 text-xl">Loading Analytics Engine... ⚙️</div>;

  return (
    <div className="p-4 bg-slate-50 min-h-screen font-sans relative">
      
      {/* HEADER */}
      <div className="max-w-7xl mx-auto flex justify-between items-center mb-6 bg-white p-5 rounded-2xl shadow-sm border-b-4 border-indigo-600">
        <div>
          <h1 className="text-3xl font-black text-indigo-900 tracking-tight">Library Analytics 📊</h1>
          <p className="text-gray-500 font-bold text-sm uppercase tracking-widest">Financials & Predictions</p>
        </div>
        <Link to="/dashboard" className="bg-slate-200 text-slate-700 px-5 py-2 rounded-xl font-black hover:bg-slate-300 transition">← Back to Dashboard</Link>
      </div>

      {/* TOP FINANCIAL KPI CARDS */}
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-indigo-600 text-white p-5 rounded-2xl shadow-lg border-b-4 border-indigo-800">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Rev This Month</p>
            <h3 className="text-2xl font-black">₹{revThisMonth}</h3>
        </div>
        <div className="bg-slate-800 text-white p-5 rounded-2xl shadow-lg border-b-4 border-black">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Rev Last Month</p>
            <h3 className="text-2xl font-black">₹{revLastMonth}</h3>
        </div>
        <div className="bg-green-500 text-white p-5 rounded-2xl shadow-lg border-b-4 border-green-700">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Lifetime Collection</p>
            <h3 className="text-2xl font-black">₹{totalLifetimeCollection}</h3>
        </div>
        <div className="bg-amber-500 text-white p-5 rounded-2xl shadow-lg border-b-4 border-amber-700">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-90 mb-1">Due Generated This Mth</p>
            <h3 className="text-2xl font-black">₹{dueGeneratedThisMonth}</h3>
        </div>
        <div className="bg-red-500 text-white p-5 rounded-2xl shadow-lg border-b-4 border-red-700 animate-pulse">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-90 mb-1">Total Global Due</p>
            <h3 className="text-2xl font-black">₹{totalGlobalDue}</h3>
        </div>
      </div>

      {/* EXPIRY PREDICTION BOARDS */}
      <div className="max-w-7xl mx-auto mb-8">
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest mb-4 border-l-4 border-indigo-500 pl-3">⏳ Upcoming Expiries (Renewals)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* 1-5 Days */}
              <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-red-100">
                  <div className="bg-red-500 text-white p-3 text-center font-black uppercase text-xs tracking-widest">
                      Expires in 1 to 5 Days ({expiry1to5.length})
                  </div>
                  <div className="p-2 max-h-64 overflow-y-auto">
                      {expiry1to5.length > 0 ? expiry1to5.map(s => (
                          <div key={s.id} className="flex justify-between items-center p-2 hover:bg-slate-50 border-b border-slate-100 last:border-0">
                              <div><p className="font-bold text-sm text-slate-800">{s.name}</p><p className="text-[10px] text-red-500 font-black">{s.daysLeft} Days Left</p></div>
                              <a href={`https://wa.me/91${s.whatsapp}?text=Namaste ${s.name}, Aapki library validity ${s.daysLeft} din mein khatam ho rahi hai. Kripya renew karwayein.`} target="_blank" rel="noreferrer" className="bg-green-100 text-green-600 px-2 py-1 rounded font-black text-[10px]">💬 Warn</a>
                          </div>
                      )) : <p className="text-center text-xs font-bold text-slate-400 p-4">Koi student nahi hai.</p>}
                  </div>
              </div>

              {/* 6-10 Days */}
              <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-orange-100">
                  <div className="bg-orange-400 text-white p-3 text-center font-black uppercase text-xs tracking-widest">
                      Expires in 6 to 10 Days ({expiry6to10.length})
                  </div>
                  <div className="p-2 max-h-64 overflow-y-auto">
                      {expiry6to10.length > 0 ? expiry6to10.map(s => (
                          <div key={s.id} className="flex justify-between items-center p-2 hover:bg-slate-50 border-b border-slate-100 last:border-0">
                              <div><p className="font-bold text-sm text-slate-800">{s.name}</p><p className="text-[10px] text-orange-500 font-black">{s.daysLeft} Days Left</p></div>
                              <a href={`https://wa.me/91${s.whatsapp}`} target="_blank" rel="noreferrer" className="bg-green-100 text-green-600 px-2 py-1 rounded font-black text-[10px]">💬 Warn</a>
                          </div>
                      )) : <p className="text-center text-xs font-bold text-slate-400 p-4">Koi student nahi hai.</p>}
                  </div>
              </div>

              {/* 11-15 Days */}
              <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-blue-100">
                  <div className="bg-blue-500 text-white p-3 text-center font-black uppercase text-xs tracking-widest">
                      Expires in 11 to 15 Days ({expiry11to15.length})
                  </div>
                  <div className="p-2 max-h-64 overflow-y-auto">
                      {expiry11to15.length > 0 ? expiry11to15.map(s => (
                          <div key={s.id} className="flex justify-between items-center p-2 hover:bg-slate-50 border-b border-slate-100 last:border-0">
                              <div><p className="font-bold text-sm text-slate-800">{s.name}</p><p className="text-[10px] text-blue-500 font-black">{s.daysLeft} Days Left</p></div>
                          </div>
                      )) : <p className="text-center text-xs font-bold text-slate-400 p-4">Koi student nahi hai.</p>}
                  </div>
              </div>

          </div>
      </div>

      {/* MASTER DATA TABLE */}
      <div className="max-w-7xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
          <div className="bg-slate-900 p-4 text-white font-black uppercase tracking-widest text-center text-sm">
             📋 DETAILED MASTER SHEET
          </div>
          <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                  <thead className="bg-slate-100 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b-2 border-slate-200">
                      <tr>
                          <th className="p-4">Student Info</th>
                          <th className="p-4">Plan / Fee Type</th>
                          <th className="p-4">Dates (Join ➡️ Valid Till)</th>
                          <th className="p-4 bg-slate-50">Complete Amount (Billed)</th>
                          <th className="p-4">Discounts</th>
                          <th className="p-4 text-green-600">Total Paid</th>
                          <th className="p-4 text-red-500">Live Due</th>
                          <th className="p-4 text-right">Last Payment Received</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {masterTableData.map(s => (
                          <tr key={s.id} className="hover:bg-indigo-50/30 transition-colors">
                              <td className="p-4">
                                  <div className="font-black text-slate-800 text-sm uppercase">{s.name}</div>
                                  <div className="text-[10px] font-bold text-slate-500">📞 {s.mobile}</div>
                              </td>
                              <td className="p-4">
                                  <span className={`text-[10px] px-2 py-1 rounded font-black uppercase ${s.has_active_plan ? 'bg-orange-100 text-orange-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                      {s.planName}
                                  </span>
                              </td>
                              <td className="p-4">
                                  <div className="text-xs font-bold text-slate-600">{s.joinDateStr} ➡️</div>
                                  <div className={`text-xs font-black mt-0.5 ${s.daysLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-green-600'}`}>
                                      {s.validTillStr}
                                  </div>
                              </td>
                              <td className="p-4 bg-slate-50 font-bold text-slate-700 text-sm">
                                  ₹{s.totalBilled}
                              </td>
                              <td className="p-4 font-bold text-amber-500 text-sm">
                                  {s.extra_fees > 0 ? `₹${s.extra_fees}` : '-'}
                              </td>
                              <td className="p-4 font-black text-green-600 text-sm bg-green-50/20">
                                  ₹{s.paid_fees}
                              </td>
                              <td className="p-4 font-black text-red-500 text-sm">
                                  {s.liveDue > 0 ? `₹${s.liveDue}` : '-'}
                              </td>
                              <td className="p-4 text-right">
                                  <div className="font-black text-slate-700 text-sm">₹{s.latestPayAmt}</div>
                                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.latestPayDate}</div>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>

    </div>
  );
}

export default Analytics;
