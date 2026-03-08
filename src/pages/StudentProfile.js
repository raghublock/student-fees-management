import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';

function StudentProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [studentFees, setStudentFees] = useState([]);
  
  const API_URL = "https://library-api.raghuveerbhati525.workers.dev";
  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    if (!token) return navigate('/');
    
    // Students fetch karke check karenge ki PRO tag (active plan) hai ya nahi
    fetch(`${API_URL}/api/students`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (Array.isArray(data)) {
        const foundStudent = data.find(s => s.id.toString() === id);
        setStudent(foundStudent);
      }
    });

    fetch(`${API_URL}/api/fees/history`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (Array.isArray(data)) {
        const filteredFees = data.filter(fee => fee.student_id.toString() === id);
        setStudentFees(filteredFees);
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
        <h1 className="text-3xl font-extrabold text-indigo-700 font-serif">Laxmi Library 📚</h1>
        <div className="space-x-4">
          <button onClick={handlePrint} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 shadow-md transition">
            🖨️ Print Receipt
          </button>
          <Link to="/dashboard" className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-bold hover:bg-gray-300">← Back</Link>
        </div>
      </div>

      {/* Main Content Area */}
      <div id="printable-area" className="max-w-5xl mx-auto">
        
        {/* Profile Card */}
        <div className="bg-white p-8 rounded-2xl shadow-lg mb-6 border border-gray-100 flex flex-col md:flex-row items-center md:items-start gap-10 relative overflow-hidden">
          
          {/* Watermark: Laxmi Library (Print Only) */}
          <div className="print-only-watermark absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none rotate-45 text-7xl font-black text-gray-400 hidden">
            LAXMI LIBRARY
          </div>

          <div className="flex-shrink-0 relative">
            {student.photo ? (
              <img src={student.photo} alt={student.name} className="h-44 w-44 rounded-3xl object-cover border-4 border-indigo-100 shadow-md" />
            ) : (
              <div className="h-44 w-44 rounded-3xl bg-gray-100 flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-300">No Photo</div>
            )}
            {/* 📸 Floating Photo Badge */}
            <div className="absolute -bottom-2 -right-2 bg-white p-1 rounded-full shadow-lg no-print">
               <span className="bg-blue-600 text-white text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-tighter">Verified Member</span>
            </div>
          </div>

          <div className="flex-1 space-y-4 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center gap-3">
              <h2 className="text-4xl font-black text-slate-800 uppercase tracking-tight">{student.name}</h2>
              {/* ⭐ PRO Student Tag - Added specifically for Profile Page */}
              {student.has_active_plan && (
                <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-[10px] md:text-xs px-4 py-1.5 rounded-full font-black shadow-lg animate-pulse border border-yellow-200 uppercase">
                  PRO STUDENT
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-medium text-slate-600">
              <p className="flex items-center gap-2 justify-center md:justify-start"><strong>📞 Mobile:</strong> {student.mobile || 'N/A'}</p>
              <p className="flex items-center gap-2 justify-center md:justify-start"><strong>🟢 WhatsApp:</strong> {student.whatsapp || 'N/A'}</p>
              <p className="flex items-center gap-2 justify-center md:justify-start"><strong>🆔 Student ID:</strong> <span className="text-indigo-600 font-bold">#LAXMI-{student.id}</span></p>
              <p className="flex items-center gap-2 justify-center md:justify-start"><strong>📅 Joining Date:</strong> {new Date().toLocaleDateString('en-IN')}</p>
            </div>
          </div>
          
          <div className="w-full md:w-72 bg-slate-900 text-white p-6 rounded-3xl shadow-2xl border-t-8 border-yellow-500 transform transition hover:scale-105">
             <h3 className="text-md font-black mb-4 border-b border-slate-700 pb-2 uppercase tracking-widest text-yellow-500">Fees Summary 💰</h3>
             <div className="space-y-3 text-sm font-bold">
                <div className="flex justify-between text-slate-400"><span>Total Fees:</span> <span>₹{student.total_fees}</span></div>
                <div className="flex justify-between text-green-400"><span>Paid Fees:</span> <span>₹{student.paid_fees}</span></div>
                <div className="pt-2 mt-2 border-t border-slate-700 flex justify-between text-red-400 text-lg font-black">
                  <span>Dues:</span> <span>₹{student.due_fees}</span>
                </div>
             </div>
          </div>
        </div>

        {/* Payment History Ledger */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-200">
          <div className="p-6 print-header hidden">
            <div className="flex justify-between items-center border-b-8 border-indigo-900 pb-6 mb-6">
              <div className="text-left">
                <div className="text-4xl font-black text-indigo-900 tracking-tighter">LAXMI LIBRARY</div>
                <div className="text-xs font-bold text-gray-500 uppercase">Premium Library Services | Bikaner, Rajasthan</div>
              </div>
              <div className="text-right text-sm font-black text-slate-800 uppercase tracking-widest">
                OFFICIAL FEES RECEIPT <br/> 
                <span className="text-xs font-bold text-slate-400">DATE: {new Date().toLocaleDateString('en-IN')}</span>
              </div>
            </div>
          </div>

          <div className="bg-indigo-800 p-5 no-print flex justify-between items-center">
              <h3 className="text-lg font-black text-white uppercase tracking-wider">Payment History Ledger 📜</h3>
              <span className="text-indigo-200 text-xs font-bold uppercase tracking-tighter">Verified Cloud Database</span>
          </div>

          <table className="w-full text-sm text-center">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-black tracking-widest">
              <tr>
                <th className="p-4 border">Payment Date</th>
                <th className="p-4 border">Amount Paid</th>
                <th className="p-4 border">Month / Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {studentFees.length > 0 ? studentFees.map(fee => (
                <tr key={fee.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 border font-bold text-slate-600 uppercase text-xs">{new Date(fee.paid_on).toLocaleDateString('en-IN')}</td>
                  <td className="p-4 border font-black text-green-600 text-base italic">₹{fee.amount}</td>
                  <td className="p-4 border font-bold text-indigo-900 uppercase text-[10px]">{fee.description || 'Monthly Library Fees'}</td>
                </tr>
              )) : (
                <tr><td colSpan="3" className="p-12 text-gray-400 font-bold italic tracking-wider">Abhi tak koi payment record database mein nahi mila hai.</td></tr>
              )}
            </tbody>
          </table>

          {/* Print Only Footer */}
          <div className="p-6 text-center mt-12 hidden print-footer">
            <div className="p-4 bg-slate-50 rounded-xl mb-10 border border-slate-200">
               <p className="text-[10px] text-slate-500 italic uppercase font-bold tracking-widest"> 
                  Note: This is a system-generated digital receipt. No signature is required. <br/>
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
          .bg-slate-900 { background: #fff !important; color: #000 !important; border: 2px solid #000 !important; }
          .bg-slate-900 h3, .bg-slate-900 span { color: #000 !important; }
          .text-green-400, .text-red-400 { color: #000 !important; font-weight: bold !important; text-decoration: underline !important; }
          .print-header, .print-footer, .print-only-watermark { display: block !important; }
          .print-only-watermark { display: flex !important; }
          body { margin: 1cm; padding: 0; }
          table { border-collapse: collapse !important; width: 100% !important; border: 2px solid #000 !important; }
          th, td { border: 1px solid #000 !important; padding: 12px !important; font-weight: bold !important; color: #000 !important; }
          .animate-pulse { animation: none !important; }
          .rounded-3xl, .rounded-2xl { border-radius: 10px !important; }
        }
      `}} />
    </div>
  );
}

export default StudentProfile;
