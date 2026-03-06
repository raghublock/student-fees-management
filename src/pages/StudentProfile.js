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
        <h1 className="text-3xl font-extrabold text-indigo-700">Student Profile 👤</h1>
        <div className="space-x-4">
          <button onClick={handlePrint} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 shadow-md">
            🖨️ Print Receipt
          </button>
          <Link to="/dashboard" className="bg-gray-200 text-gray-800 px-4 py-2 rounded font-bold hover:bg-gray-300">← Back</Link>
        </div>
      </div>

      {/* Main Content Area */}
      <div id="printable-area" className="max-w-5xl mx-auto">
        
        {/* Profile Card */}
        <div className="bg-white p-8 rounded-2xl shadow-lg mb-6 border border-gray-100 flex flex-col md:flex-row items-center md:items-start gap-10 relative overflow-hidden">
          
          {/* Watermark: Laxmi Library */}
          <div className="print-only-watermark absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none rotate-45 text-7xl font-black text-gray-400 hidden">
            LAXMI LIBRARY
          </div>

          <div className="flex-shrink-0">
            {student.photo ? (
              <img src={student.photo} alt={student.name} className="h-40 w-40 rounded-2xl object-cover border-4 border-indigo-100 shadow-md" />
            ) : (
              <div className="h-40 w-40 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-300">No Photo</div>
            )}
          </div>

          <div className="flex-1 space-y-3 text-center md:text-left">
            <h2 className="text-4xl font-black text-gray-800 uppercase">{student.name}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <p><strong>📞 Mobile:</strong> {student.mobile || 'N/A'}</p>
              <p><strong>💬 WhatsApp:</strong> {student.whatsapp || 'N/A'}</p>
              <p><strong>💳 Aadhaar:</strong> {student.aadhaar_no || 'N/A'}</p>
              <p><strong>🆔 ID:</strong> #LAXMI-{student.id}</p>
            </div>
          </div>
          
          <div className="w-full md:w-64 bg-indigo-900 text-white p-6 rounded-2xl shadow-xl border-t-4 border-yellow-400">
             <h3 className="text-md font-bold mb-2 border-b border-indigo-700 pb-1 uppercase">Fees Summary</h3>
             <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Total:</span> <span>₹{student.total_fees}</span></div>
                <div className="flex justify-between text-green-300 font-bold"><span>Paid:</span> <span>₹{student.paid_fees}</span></div>
                <div className="pt-1 mt-1 border-t border-indigo-700 flex justify-between text-red-300 font-black">
                  <span>Dues:</span> <span>₹{student.due_fees}</span>
                </div>
             </div>
          </div>
        </div>

        {/* Payment History Ledger */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
          <div className="bg-indigo-700 p-4 no-print">
              <h3 className="text-lg font-bold text-white uppercase">Payment History Ledger 📜</h3>
          </div>
          <div className="p-2 print-header hidden">
            <h3 className="text-center text-2xl font-black border-b-2 pb-2 mb-4 text-indigo-900">LAXMI LIBRARY - FEES RECEIPT</h3>
          </div>
          <table className="w-full text-sm text-center">
            <thead className="bg-gray-100 text-gray-700 uppercase text-xs">
              <tr>
                <th className="p-3 border">Date</th>
                <th className="p-3 border">Amount Paid</th>
                <th className="p-3 border">Month / Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {studentFees.length > 0 ? studentFees.map(fee => (
                <tr key={fee.id}>
                  <td className="p-3 border">{new Date(fee.paid_on).toLocaleDateString('en-IN')}</td>
                  <td className="p-3 border font-bold text-green-700">₹{fee.amount}</td>
                  <td className="p-3 border italic text-gray-600">{fee.description || 'Regular Fees Payment'}</td>
                </tr>
              )) : (
                <tr><td colSpan="3" className="p-4 text-gray-400">No payment history found.</td></tr>
              )}
            </tbody>
          </table>
          <div className="p-4 text-center mt-6 hidden print-footer">
            <p className="text-[10px] text-gray-400 italic">This is a digital record of Laxmi Library Management System.</p>
            <div className="mt-12 flex justify-between px-16">
                <div className="text-center border-t border-gray-400 pt-1 w-40 text-xs font-bold">Student Signature</div>
                <div className="text-center border-t border-gray-400 pt-1 w-40 text-xs font-bold">Laxmi Library Stamp</div>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
          .bg-slate-50 { background: white !important; }
          .shadow-lg, .shadow-xl { box-shadow: none !important; border: 1px solid #ddd !important; }
          .bg-indigo-900 { background: #f8fafc !important; color: black !important; border: 1px solid #ddd !important; }
          .bg-indigo-900 span { color: black !important; }
          .text-green-300, .text-red-300 { color: black !important; font-weight: bold !important; }
          .print-header, .print-footer, .print-only-watermark { display: block !important; }
          .print-only-watermark { display: flex !important; }
          body { margin: 1cm; padding: 0; }
          table { border-collapse: collapse !important; width: 100% !important; }
          th, td { border: 1px solid #ccc !important; padding: 8px !important; }
        }
      `}} />
    </div>
  );
}

export default StudentProfile;
