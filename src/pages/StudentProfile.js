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
    
    // 1. Student details fetch karna
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

    // 2. Fees History fetch karna
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

  // 📄 Print Function: Yeh sirf receipt wala part print karega
  const handlePrint = () => {
    window.print();
  };

  if (!student) return <div className="p-10 text-center text-xl font-bold text-gray-500">Loading Profile... ⏳</div>;

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      
      {/* Navigation Header (Hide on Print) */}
      <div className="max-w-5xl mx-auto flex justify-between items-center mb-8 bg-white p-4 rounded-lg shadow-sm border-b-4 border-indigo-600 no-print">
        <h1 className="text-3xl font-extrabold text-indigo-700">Student Profile 👤</h1>
        <div className="space-x-4">
          <button onClick={handlePrint} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 shadow-md transition">
            🖨️ Print Receipt
          </button>
          <Link to="/dashboard" className="bg-gray-200 text-gray-800 px-4 py-2 rounded font-bold hover:bg-gray-300 transition">← Back</Link>
        </div>
      </div>

      {/* Main Profile & Receipt Card */}
      <div id="receipt-section" className="max-w-5xl mx-auto bg-white p-8 rounded-2xl shadow-lg mb-8 border border-gray-100 flex flex-col md:flex-row items-center md:items-start gap-10 relative overflow-hidden">
        
        {/* Print Only Watermark */}
        <div className="print-only-watermark absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none rotate-45 text-6xl font-black text-gray-400 hidden">
          BIKANER LIBRARY
        </div>

        {/* Photo Section */}
        <div className="flex-shrink-0">
          {student.photo ? (
            <img 
              src={student.photo} 
              alt={student.name} 
              className="h-48 w-48 rounded-2xl object-cover border-4 border-indigo-100 shadow-md"
            />
          ) : (
            <div className="h-48 w-48 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-300">
              No Photo
            </div>
          )}
        </div>

        {/* Student Details */}
        <div className="flex-1 space-y-3 text-center md:text-left">
          <h2 className="text-5xl font-black text-gray-800 mb-2 uppercase">{student.name}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm md:text-base">
            <p className="text-gray-600 font-medium">📞 Mobile: <span className="text-gray-900 font-bold">{student.mobile || 'N/A'}</span></p>
            <p className="text-gray-600 font-medium">💬 WhatsApp: <span className="text-green-600 font-bold">{student.whatsapp || 'N/A'}</span></p>
            <p className="text-gray-600 font-medium">💳 Aadhaar: <span className="text-gray-900 font-mono font-bold">{student.aadhaar_no || 'N/A'}</span></p>
            <p className="text-gray-600 font-medium">🆔 Student ID: <span className="text-indigo-600 font-bold">#LIB-2026-{student.id}</span></p>
          </div>
          <div className="pt-4 mt-4 border-t border-dashed border-gray-200 show-on-print hidden">
            <p className="text-xs text-gray-400 italic">This is a digitally generated receipt from Bikaner Library System.</p>
          </div>
        </div>
        
        {/* Summary Card */}
        <div className="w-full md:w-64 bg-indigo-900 text-white p-6 rounded-2xl shadow-xl border-t-4 border-yellow-400">
           <h3 className="text-lg font-bold mb-4 border-b border-indigo-700 pb-2">Fees Summary</h3>
           <div className="space-y-3">
              <div className="flex justify-between"><span>Total Fees:</span> <span className="font-bold">₹{student.total_fees}</span></div>
              <div className="flex justify-between text-green-300"><span>Paid:</span> <span className="font-bold">₹{student.paid_fees}</span></div>
              <div className="pt-2 mt-2 border-t border-indigo-700 flex justify-between text-red-300 text-xl font-black">
                <span>Dues:</span> <span>₹{student.due_fees}</span>
              </div>
           </div>
        </div>
      </div>

      {/* Fees Ledger (Hide on Print if you only want the receipt) */}
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200 no-print">
        <div className="bg-indigo-700 p-5 flex justify-between items-center">
            <h3 className="text-xl font-bold text-white">Payment History Ledger 📜</h3>
            <span className="bg-indigo-500 text-white text-xs px-3 py-1 rounded-full uppercase">Official Records</span>
        </div>
        <table className="w-full text-sm text-center">
          <thead className="bg-gray-50 text-gray-700 uppercase text-xs">
            <tr>
              <th className="p-4">Date</th>
              <th className="p-4">Amount</th>
              <th className="p-4">Mode</th>
              <th className="p-4">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {studentFees.length > 0 ? studentFees.map(fee => (
              <tr key={fee.id} className="hover:bg-indigo-50/30">
                <td className="p-4 font-medium text-gray-700">{new Date(fee.paid_on).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                <td className="p-4 font-black text-green-600 text-lg">₹{fee.amount}</td>
                <td className="p-4">
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-lg text-[10px] font-black">{fee.mode}</span>
                </td>
                <td className="p-4 text-gray-500 italic">{fee.description || 'Fees Payment'}</td>
              </tr>
            )) : (
              <tr><td colSpan="4" className="text-center p-12 text-gray-400">No transactions found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 🛠️ Print CSS Custom Logic */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
          .bg-slate-50 { background: white !important; }
          .shadow-lg, .shadow-xl { box-shadow: none !important; border: 1px solid #eee !important; }
          .rounded-2xl { border-radius: 8px !important; }
          .bg-indigo-900 { background-color: #f8fafc !important; color: black !important; border: 1px solid #ddd !important; }
          .bg-indigo-900 span { color: black !important; }
          .text-red-300, .text-green-300 { color: black !important; font-weight: bold !important; }
          .print-only-watermark, .show-on-print { display: flex !important; }
          body { margin: 0; padding: 0; }
          #receipt-section { width: 100% !important; margin-top: 20px !important; }
        }
      `}} />
    </div>
  );
}

export default StudentProfile;
