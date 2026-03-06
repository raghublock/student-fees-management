import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';

function Dashboard() {
  const [students, setStudents] = useState([]);
  
  // 🚀 State Update: photo field add kiya gaya hai
  const [formData, setFormData] = useState({ 
    name: '', total_fees: '', paid_fees: '', extra_fees: '', 
    mobile: '', whatsapp: '', email: '', aadhaar_no: '', photo: '' 
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const navigate = useNavigate();
  const API_URL = "https://library-api.raghuveerbhati525.workers.dev";
  const token = localStorage.getItem('adminToken');
  const adminName = localStorage.getItem('adminName');

  const fetchStudents = () => {
    fetch(`${API_URL}/api/students`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setStudents(data);
        else setStudents([]); 
      })
      .catch(err => toast.error("Data load hone mein dikkat aayi."));
  };

  useEffect(() => { 
    if (!token) navigate('/');
    else fetchStudents(); 
  }, [navigate, token, fetchStudents]);

  // 🚀 Photo ko base64 code mein badalne ka function
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
        // Step 1: Size check (Agar 1MB se badi hai toh upload hi mat karo)
        if (file.size > 1000000) { 
            alert("Bhai, photo ka size bahut bada hai (1MB+). Mobile settings se quality kam karein ya screenshot le kar upload karein.");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setFormData({ ...formData, photo: reader.result });
        };
        reader.readAsDataURL(file);
    }
};
  const handleSubmit = async (e) => {
    e.preventDefault();
    const total = Number(formData.total_fees);
    const paid = Number(formData.paid_fees);
    const due = total - paid;
    
    try {
      const url = editingId ? `${API_URL}/api/student/update/${editingId}` : `${API_URL}/api/student/add`;
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...formData, total_fees: total, paid_fees: paid, due_fees: due })
      });
      
      const responseData = await response.json();

      if (!response.ok) {
        toast.error(`Error: ${responseData.error || "Data save nahi hua"}`);
        return;
      }

      setFormData({ name: '', total_fees: '', paid_fees: '', extra_fees: '', mobile: '', whatsapp: '', email: '', aadhaar_no: '', photo: '' });
      setEditingId(null); 
      
      toast.success(editingId ? "Data Update Ho Gaya! ✏️" : "Student Save Ho Gaya! ✅");
      fetchStudents(); 
    } catch (error) {
      toast.error("Network problem. Check connection.");
    }
  };

  const handleDelete = async (id) => {
    if(window.confirm("Kya aap is student ka record mitaana chahte hain?")) {
      await fetch(`${API_URL}/api/student/delete/${id}`, { 
        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchStudents();
      toast.success("Record hata diya gaya!");
    }
  };

  const handleEdit = (student) => {
    setEditingId(student.id);
    setFormData({
      name: student.name,
      total_fees: student.total_fees,
      paid_fees: student.paid_fees,
      extra_fees: student.extra_fees || '',
      mobile: student.mobile || '',
      whatsapp: student.whatsapp || '',
      aadhaar_no: student.aadhaar_no || '',
      email: student.email || '',
      photo: student.photo || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ name: '', total_fees: '', paid_fees: '', extra_fees: '', mobile: '', whatsapp: '', email: '', aadhaar_no: '', photo: '' });
  };

  const filteredStudents = students.filter(s => {
    const matchName = s.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchPending = showPendingOnly ? (s.due_fees > 0) : true;
    return matchName && matchPending;
  });

  return (
    <div className="p-4 bg-slate-100 min-h-screen font-sans">
      {/* Header Section */}
      <div className="flex justify-between items-center max-w-7xl mx-auto mb-6 bg-white p-4 rounded-lg shadow-sm border-b-4 border-blue-600">
        <div>
          <h1 className="text-3xl font-bold text-blue-900">Student Management & Fees System 🎓</h1>
          <p className="text-gray-500 font-medium">Welcome, {adminName || 'Admin'}</p>
        </div>
        <div className="space-x-4">
          <Link to="/fees" className="bg-green-500 text-white px-4 py-2 rounded font-bold hover:bg-green-600 transition shadow-md">Go to Fees Dashboard 💰</Link>
          <button onClick={() => { localStorage.clear(); navigate('/'); }} className="bg-red-500 text-white px-4 py-2 rounded font-bold hover:bg-red-600 shadow-md">Logout</button>
        </div>
      </div>
      
      {/* Input Form Section */}
      <div className={`max-w-7xl mx-auto bg-white p-6 rounded-xl shadow-md mb-8 border-l-8 ${editingId ? 'border-yellow-500 bg-yellow-50' : 'border-blue-600'}`}>
        <h2 className="text-xl font-bold mb-4 text-gray-700 underline">
          {editingId ? "✏️ Update Student Information" : "➕ Add New Student"}
        </h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input type="text" placeholder="Student Name" className="border p-2 rounded outline-none focus:ring-2 focus:ring-blue-400" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
          <input type="text" placeholder="Mobile Number" className="border p-2 rounded outline-none focus:ring-2 focus:ring-blue-400" value={formData.mobile} onChange={(e) => setFormData({...formData, mobile: e.target.value})} />
          <input type="text" placeholder="WhatsApp Number" className="border p-2 rounded outline-none focus:ring-2 focus:ring-blue-400" value={formData.whatsapp} onChange={(e) => setFormData({...formData, whatsapp: e.target.value})} />
          
          {/* 🚀 NAYA: Photo Capture/Upload Input */}
          <div className="flex flex-col border p-2 rounded bg-gray-50">
            <label className="text-xs font-bold text-gray-500 mb-1">Upload/Capture Photo</label>
            <div className="flex items-center gap-2">
              <input 
                type="file" 
                accept="image/*" 
                capture="environment" 
                className="text-xs w-full" 
                onChange={handlePhotoChange} 
              />
              {formData.photo && <img src={formData.photo} alt="Preview" className="h-10 w-10 rounded-full border border-blue-400 object-cover" />}
            </div>
          </div>

          <input type="text" placeholder="Aadhaar Number" className="border p-2 rounded outline-none focus:ring-2 focus:ring-blue-400" value={formData.aadhaar_no} onChange={(e) => setFormData({...formData, aadhaar_no: e.target.value})} />
          <input type="number" placeholder="Total Fees" className="border p-2 rounded outline-none focus:ring-2 focus:ring-blue-400" value={formData.total_fees} onChange={(e) => setFormData({...formData, total_fees: e.target.value})} required />
          <input type="number" placeholder="Paid Fees" className="border p-2 rounded outline-none focus:ring-2 focus:ring-blue-400" value={formData.paid_fees} onChange={(e) => setFormData({...formData, paid_fees: e.target.value})} required />
          <input type="number" placeholder="Extra Fees" className="border p-2 rounded outline-none focus:ring-2 focus:ring-blue-400" value={formData.extra_fees} onChange={(e) => setFormData({...formData, extra_fees: e.target.value})} />
          
          <div className="md:col-span-1 flex gap-2">
            <button type="submit" className={`flex-1 text-white font-bold py-2 rounded transition shadow-lg ${editingId ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-blue-600 hover:bg-blue-800'}`}>
              {editingId ? "Update Data" : "Add Student"}
            </button>
            {editingId && (
              <button type="button" onClick={cancelEdit} className="bg-gray-400 text-white font-bold py-2 px-4 rounded hover:bg-gray-500 shadow-lg">Cancel</button>
            )}
          </div>
        </form>
      </div>

      {/* Search Bar */}
      <div className="max-w-7xl mx-auto bg-blue-50 p-4 rounded-t-lg border border-blue-200 flex flex-wrap gap-4 items-center justify-between">
        <input 
          type="text" 
          placeholder="🔍 Search Student Name..." 
          className="border p-2 rounded w-full max-w-xs shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <label className="flex items-center space-x-2 bg-red-100 text-red-800 px-4 py-2 rounded-full font-bold cursor-pointer hover:bg-red-200 transition">
          <input 
            type="checkbox" 
            className="form-checkbox h-5 w-5 text-red-600"
            checked={showPendingOnly}
            onChange={(e) => setShowPendingOnly(e.target.checked)}
          />
          <span>Dues Pending Only</span>
        </label>
      </div>

      {/* Data Table */}
      <div className="max-w-7xl mx-auto bg-white rounded-b-lg shadow-xl overflow-x-auto border-x border-b border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-blue-700 text-white font-bold">
            <tr>
              <th className="p-3 text-left border-b border-blue-800">Photo</th>
              <th className="p-3 text-left border-b border-blue-800">Name</th>
              <th className="p-3 text-left border-b border-blue-800">Contact Details</th>
              <th className="p-3 text-left border-b border-blue-800">Fees (T/P/D)</th>
              <th className="p-3 text-center border-b border-blue-800">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredStudents.map(s => (
              <tr key={s.id} className="hover:bg-blue-50 transition-colors">
                <td className="p-3">
                  {/* 🚀 NAYA: Photo Display logic */}
                  {s.photo ? (
                    <img src={s.photo} alt="Student" className="h-12 w-12 rounded-full object-cover border-2 border-blue-200 shadow-sm" />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-[10px] border border-gray-300">No Image</div>
                  )}
                </td>
                <td className="p-3 text-left font-bold text-blue-900 text-lg">{s.name}</td>
                <td className="p-3 text-left text-gray-700 font-medium text-xs">
                   📞 {s.mobile || '-'} <br/>
                   💬 {s.whatsapp || '-'} <br/>
                   💳 Aadhaar: {s.aadhaar_no || '-'}
                </td>
                <td className="p-3 text-left">
                  <span className="text-gray-600 font-medium">Total: ₹{s.total_fees || 0}</span> <br/>
                  <span className="text-green-600 font-bold">Paid: ₹{s.paid_fees || 0}</span> <br/>
                  <span className={`font-bold ${s.due_fees > 0 ? 'text-red-600' : 'text-gray-500'}`}>Due: ₹{s.due_fees || 0}</span>
                </td>
                <td className="p-3 text-center space-x-2 flex justify-center items-center h-full pt-6">
                  <Link to={`/student/${s.id}`} className="bg-indigo-500 text-white px-3 py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-indigo-600 transition">Profile</Link>
                  <button onClick={() => handleEdit(s)} className="bg-yellow-500 text-white px-3 py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-yellow-600 transition">Edit</button>
                  <a href={`https://wa.me/91${s.whatsapp}?text=Namaste%20${s.name},%20aapki%20due%20fees%20₹${s.due_fees}%20hai.`} 
                     target="_blank" rel="noreferrer" 
                     className="bg-green-500 text-white px-3 py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-green-600 transition">WA</a>
                  <button onClick={() => handleDelete(s.id)} className="bg-red-500 text-white px-3 py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-red-600 transition">Del</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredStudents.length === 0 && <p className="text-center p-10 text-gray-500 font-medium">No records found.</p>}
      </div>
    </div>
  );
}
export default Dashboard;
