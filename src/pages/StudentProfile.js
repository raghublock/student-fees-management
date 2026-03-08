import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';

function StudentProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  
  const API_URL = "https://library-api.raghuveerbhati525.workers.dev";
  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    if (!token) return navigate('/');
    
    // 1. Pehle student ki basic info fetch karein PRO status check karne ke liye
    fetch(`${API_URL}/api/students`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (Array.isArray(data)) {
        const foundStudent = data.find(s => s.id.toString() === id);
        setStudent(foundStudent);

        // 2. Agar PRO hai toh Plans History fetch karein, warna Fees History
        const targetEndpoint = foundStudent?.has_active_plan 
          ? `${API_URL}/api/plans/history` 
          : `${API_URL}/api/fees/history`;

        fetch(targetEndpoint, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(historyData => {
          if (Array.isArray(historyData)) {
            // Student ke ID ke hisaab se filter karein
            const filtered = historyData.filter(item => item.student_id.toString() === id);
            setPaymentHistory(filtered);
          }
        });
      }
    });
  }, [id, token, navigate]);

  const handlePrint = () => {
    window.print();
  };

  if (!student) return <div className="p-10 text-center text-xl font-bold text-gray-500">Loading Profile... ⏳</div>;

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      
      {/* Navigation (No-Print) */}
      <div className="max-w-5xl mx-auto flex justify-between items-center mb-8 bg-white p-4 rounded-lg shadow-sm border-b-4 border-indigo-600 no-print">
        <h1 className="text-3xl font-extrabold text-indigo-700 font-serif text-center md:text-left">Laxmi Library 📚</h1>
        <div className="space-x-4">
          <button onClick={handlePrint} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 shadow-md transition">
            🖨️ Print Receipt
          </button>
          <Link to="/dashboard" className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-bold hover:bg-gray-300">← Back</Link>
        </div>
      </div>

      <div id="printable-area" className="max-w-5xl mx-auto">
        
        {/* Profile Card */}
        <div className="bg-white p-8 rounded-2xl shadow-lg mb-6 border border-gray-100 flex flex-col md:flex-row items-center md:items-start gap-10 relative overflow-hidden">
          
          <div className="print-only-watermark absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none rotate-45 text-7xl font-black text-gray-400 hidden">
            LAXMI LIBRARY
          </div>

          <div className="flex-shrink-0 relative">
            {student.photo ? (
              <img src={student.photo} alt={student.name} className="h-44 w-44 rounded-3xl object-cover border-4 border-indigo-100 shadow-md" />
            ) : (
              <div className="h-44 w-44 rounded-3xl bg-gray-100 flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-300">No Photo</div>
            )}
            <div className="absolute -bottom-2 -right-2 bg-white p-1 rounded-full shadow-lg no-print">
               <span className="bg-blue-600 text-white text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-tighter">Verified Member</span>
            </div>
          </div>

          <div className="flex-1 space-y-4 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center gap-3">
              <h2 className="text-4xl font-black text-slate-800 uppercase tracking-tight">{student.name}</h2>
              {student.has_active_plan && (
                <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-[10px] md:text-xs px-4 py-1.5 rounded-full font-black shadow-lg animate-pulse border border-yellow-200 uppercase">
                  PRO STUDENT 📦
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-medium text-slate-600">
              <p><strong>📞 Mobile:</strong> {student.mobile || 'N/A'}</p>
              <p><strong>🟢 WhatsApp:</strong> {student.whatsapp || 'N/A'}</p>
              <p><strong>🆔 Student ID:</strong> <span className="text-indigo-600 font-bold">#LAXMI-{student.id}</span></p>
              <p><strong>📅 Joining Date:</strong> {new Date().toLocaleDateString('en-IN')}</p>
            </div>
          </div>
          
          {/* Fees Summary - Changes color based on Plan */}
          <div className={`w-full md:w-72 p-6 rounded-3xl shadow-2xl border-t-8 transform transition hover:scale-105 text-white ${student.has_active_plan ? 'bg-orange-600 border-yellow-400' : 'bg-slate-900 border-yellow-500'}`}>
             <h3 className="text-md font-black mb-4 border-b border-white/20 pb-2 uppercase tracking-widest text-white">
                {student.has_active_plan ? 'Plan Summary 📋' : 'Fees Summary 💰'}
             </h3>
             <div className="space-y-3 text-sm font-bold">
                <div className="flex justify-between opacity-80">
                  <span>{student.has_active_plan ? 'Plan Cost:' : 'Total Fees:'}</span> 
                  <span>₹{student.has_active_plan ? paymentHistory[0]?.price : student.total_fees}</span>
                </div>
                <div className="flex justify-between text-green-300">
                  <span>Paid Amount:</span> 
                  <span>₹{student.has_active_plan ? paymentHistory[0]?.price : student.paid_fees}</span>
                </div>
                {!student.has_active_plan && (
                  <div className="pt-2 mt-2 border-t border-white/20 flex justify-between text-red-300 text-lg font-black">
                    <span>Dues:</span> <span>₹{student.due_fees}</span>
                  </div>
                )}
                {student.has_active_plan && (
                   <div className="pt-2 mt-2 border-t border-white/20 flex justify-between text-yellow-200 font-black italic">
                    <span>Expiry:</span> <span>{paymentHistory[0]?.expiry_date || 'N/A'}</span>
                  </div>
                )}
             </div>
          </div>
        </div>

        {/* Dynamic Payment History Ledger */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-200">
          <div className="p-6 print-header hidden">
            <div className="flex justify-between items-center border-b-8 border-indigo-900 pb-6 mb-6">
              <div className="text-left">
                <div className="text-4xl font-black text-indigo-900 tracking-tighter">LAXMI LIBRARY</div>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Bikaner, Rajasthan</div>
              </div>
              <div className="text-right text-sm font-black text-slate-800 uppercase tracking-widest">
                OFFICIAL {student.has_active_plan ? 'PLAN' : 'FEES'} RECEIPT <br/> 
                <span className="text-xs font-bold text-slate-400 font-sans">DATE: {new Date().toLocaleDateString('en-IN')}</span>
              </div>
            </div>
          </div>

          <div className={`${student.has_active_plan ? 'bg-orange-500' : 'bg-indigo-800'} p-5 no-print flex justify-between items-center transition-colors`}>
              <h3 className="text-lg font-black text-white uppercase tracking-wider">
                {student.has_active_plan ? 'Plan Purchase History 📦' : 'Monthly Fees History 📜'}
              </h3>
          </div>

          <table className="w-full text-sm text-center">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-black tracking-widest">
              <tr>
                <th className="p-4 border">Date</th>
                <th className="p-4 border">Amount</th>
                <th className="p-4 border">{student.has_active_plan ? 'Plan Name' : 'Month / Description'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paymentHistory.length > 0 ? paymentHistory.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 border font-bold text-slate-600 uppercase text-xs">
                    {item.start_date || (item.paid_on ? new Date(item.paid_on).toLocaleDateString('en-IN') : 'N/A')}
                  </td>
                  <td className="p-4 border font-black text-green-600 text-base italic">₹{item.price || item.amount}</td>
                  <td className="p-4 border font-bold text-indigo-900 uppercase text-[10px]">
                    {item.plan_name || item.description || 'Monthly Fees'}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="3" className="p-12 text-gray-400 font-bold italic tracking-wider">No history found for this member.</td></tr>
              )}
            </tbody>
          </table>

          {/* Print Only Footer */}
          <div className="p-6 text-center mt-12 hidden print-footer">
            <div className="p-4 bg-slate-50 rounded-xl mb-10 border border-slate-200">
               <p className="text-[10px] text-slate-500 italic uppercase font-bold tracking-widest"> 
                  Note: This is a system-generated digital receipt. <br/>
                  Laxmi Library Management System - Designed by Raghuveer Bhati
               </p>
            </div>
            <div className="flex justify-between px-20">
                <div className="text-center border-t-4 border-slate-300 pt-3 w-56 text-[10px] font-black text-slate-500 uppercase tracking-widest">Student Signature</div>
                <div className="text-center border-t-4 border-slate-300 pt-3 w-56 text-[10px] font-black text-indigo-900 uppercase tracking-widest">Authorized Signatory</div>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
          .bg-slate-50 { background: white !important; }
          .shadow-lg, .shadow-xl, .shadow-2xl { box-shadow: none !important; border: 1px solid #eee !important; }
          .print-header, .print-footer, .print-only-watermark { display: block !important; }
          .print-only-watermark { display: flex !important; }
          body { margin: 1cm; padding: 0; }
          table { border-collapse: collapse !important; width: 100% !important; border: 2px solid #000 !important; }
          th, td { border: 1px solid #000 !important; padding: 12px !important; font-weight: bold !important; color: #000 !important; }
        }
      `}} />
    </div>
  );
}

export default StudentProfile;
