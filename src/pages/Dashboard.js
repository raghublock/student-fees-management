import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';

function Dashboard() {
  const [students, setStudents] = useState([]);
  
  // Aadhaar_no yahan se hata diya gaya hai 🛡️
  const [formData, setFormData] = useState({ 
    name: '', total_fees: '', paid_fees: '', extra_fees: '', 
    mobile: '', whatsapp: '', email: '', photo: '' 
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
  }, [navigate, token]);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 400; 
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                setFormData({ ...formData, photo: dataUrl });
                toast.success("Photo optimized!");
            };
        };
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
      
      if (response.ok) {
        setFormData({ name: '', total_fees: '', paid_fees: '', extra_fees: '', mobile: '', whatsapp: '', email: '', photo: '' });
        setEditingId(null); 
        toast.success(editingId ? "Data Updated! ✏️" : "Student Saved! ✅");
        fetchStudents(); 
      }
    } catch (error) {
      toast.error("Network problem.");
    }
  };

  const handleDelete = async (id) => {
    if(window.confirm("Record mitaana chahte hain?")) {
      await fetch(`${API_URL}/api/student/delete/${id}`, { 
        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchStudents();
      toast.success("Hata diya gaya!");
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
      email: student.email || '',
      photo: student.photo || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredStudents = students.filter(s => {
    const matchName = s.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchPending = showPendingOnly ? (s.due_fees > 0) : true;
    return matchName && matchPending;
  });

  return (
    <div className="p-4 bg-slate-50 min-h-screen font-sans">
      {/* 🚀 Header Section Updated with Plans Manager Button */}
      <div className="flex justify-between items-center max-w-7xl mx-auto mb-8 bg-white p-5 rounded-xl shadow-md border-b-4 border-indigo-700 transition-all">
        <div>
          <h1 className="text-3xl font-black text-indigo-900">Laxmi Library 📚</h1>
          <p className="text-gray-500 font-bold italic">Bikaner Branch | Welcome, {adminName || 'Admin'}</p>
        </div>
        <div className="flex flex-col md:flex-row gap-3">
          <Link to="/plans" className="bg-orange-500 text-white px-5 py-2 rounded-lg font-bold hover:bg-orange-600 shadow-lg border-b-4 border-orange-800 transition active:scale-95 flex items-center gap-2">
            <span>📦</span> Plans Manager
          </Link>
          <Link to="/fees" className="bg-green-600 text-white px-5 py-2 rounded-lg font-bold hover:bg-green-700 shadow-lg border-b-4 border-green-800 transition">
            <span>💰</span> Fees Dashboard
          </Link>
          <button onClick={() => { localStorage.clear(); navigate('/'); }} className="bg-red-500 text-white px-5 py-2 rounded-lg font-bold hover:bg-red-600 shadow-lg border-b-4 border-red-700 transition">
            Logout
          </button>
        </div>
      </div>

      {/* Form Section - Aadhaar Input Removed */}
      <div className={`max-w-7xl mx-auto bg-white p-6 rounded-2xl shadow-lg mb-8 border-t-8 ${editingId ? 'border-yellow-500 bg-yellow-50' : 'border-indigo-600'}`}>
        <h2 className="text-xl font-black mb-6 text-gray-800 uppercase tracking-wider">
          {editingId ? "✏️ Update Student" : "➕ Add New Student"}
        </h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input type="text" placeholder="Student Name" className="border-2 p-3 rounded-xl focus:border-indigo-500 outline-none transition" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
          <input type="text" placeholder="Mobile Number" className="border-2 p-3 rounded-xl focus:border-indigo-500 outline-none" value={formData.mobile} onChange={(e) => setFormData({...formData, mobile: e.target.value})} />
          <input type="text" placeholder="WhatsApp Number" className="border-2 p-3 rounded-xl focus:border-indigo-500 outline-none" value={formData.whatsapp} onChange={(e) => setFormData({...formData, whatsapp: e.target.value})} />
          
          <div className="flex flex-col border-2 p-2 rounded-xl bg-gray-50 border-dashed border-indigo-200">
            <label className="text-[10px] font-black text-indigo-400 mb-1 uppercase">Student Photo</label>
            <div className="flex items-center gap-2">
              <input type="file" accept="image/*" className="text-[10px] w-full cursor-pointer" onChange={handlePhotoChange} />
              {formData.photo && <img src={formData.photo} alt="Preview" className="h-10 w-10 rounded-full border-2 border-indigo-500 object-cover shadow-sm" />}
            </div>
          </div>

          <input type="number" placeholder="Total Fees (₹)" className="border-2 p-3 rounded-xl focus:border-indigo-500 outline-none" value={formData.total_fees} onChange={(e) => setFormData({...formData, total_fees: e.target.value})} required />
          <input type="number" placeholder="Paid Fees (₹)" className="border-2 p-3 rounded-xl focus:border-indigo-500 outline-none" value={formData.paid_fees} onChange={(e) => setFormData({...formData, paid_fees: e.target.value})} required />
          <input type="number" placeholder="Extra (Optional)" className="border-2 p-3 rounded-xl focus:border-indigo-500 outline-none" value={formData.extra_fees} onChange={(e) => setFormData({...formData, extra_fees: e.target.value})} />
          
          <button type="submit" className={`text-white font-black py-3 rounded-xl shadow-xl transition-all ${editingId ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-indigo-600 hover:bg-indigo-800'}`}>
            {editingId ? "SAVE CHANGES" : "REGISTER STUDENT"}
          </button>
        </form>
      </div>

      {/* Search & Pending Filter */}
      <div className="max-w-7xl mx-auto flex flex-wrap gap-4 items-center justify-between mb-4">
        <div className="relative w-full max-w-md">
          <input 
            type="text" 
            placeholder="🔍 Search Student..." 
            className="border-2 p-3 pl-10 rounded-2xl w-full shadow-sm outline-none focus:border-indigo-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <label className="flex items-center space-x-3 bg-red-100 text-red-700 px-6 py-3 rounded-2xl font-black cursor-pointer hover:bg-red-200 transition shadow-sm border-b-4 border-red-300">
          <input type="checkbox" className="h-5 w-5 rounded" checked={showPendingOnly} onChange={(e) => setShowPendingOnly(e.target.checked)} />
          <span>DUES PENDING ONLY</span>
        </label>
      </div>

      {/* Data Table */}
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
        <table className="w-full text-left">
          <thead className="bg-slate-800 text-white">
            <tr>
              <th className="p-4 text-xs font-black uppercase">Identity</th>
              <th className="p-4 text-xs font-black uppercase">Name</th>
              <th className="p-4 text-xs font-black uppercase">Contact</th>
              <th className="p-4 text-xs font-black uppercase">Financials</th>
              <th className="p-4 text-xs font-black uppercase text-center">Manage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredStudents.map(s => (
              <tr key={s.id} className="hover:bg-indigo-50/50 transition-colors">
                <td className="p-4">
                  {s.photo ? (
                    <img src={s.photo} alt="Student" className="h-14 w-14 rounded-2xl object-cover border-2 border-white shadow-md" />
                  ) : (
                    <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-400 border border-slate-200 uppercase">No Photo</div>
                  )}
                </td>
                <td className="p-4 font-black text-slate-800 text-lg uppercase">{s.name}</td>
                <td className="p-4 text-xs font-bold text-slate-500">
                   📱 {s.mobile || 'N/A'} <br/>
                   🟢 {s.whatsapp || 'N/A'}
                </td>
                <td className="p-4">
                  <div className="text-[10px] font-bold text-slate-400">TOTAL: ₹{s.total_fees}</div>
                  <div className="text-sm font-black text-green-600 underline">PAID: ₹{s.paid_fees}</div>
                  <div className={`text-sm font-black ${s.due_fees > 0 ? 'text-red-600 bg-red-50 rounded px-1' : 'text-slate-400'}`}>
                    DUE: ₹{s.due_fees || 0}
                  </div>
                </td>
                <td className="p-4 flex gap-2 justify-center items-center mt-4">
                  <button onClick={() => handleEdit(s)} className="bg-amber-100 text-amber-700 p-2 rounded-lg font-black hover:bg-amber-200 transition text-[10px]">EDIT</button>
                  <a href={`https://wa.me/91${s.whatsapp}?text=Laxmi%20Library%20Bikaner%3A%20Namaste%20${s.name}%2C%20aapki%20DUE%20FEES%20₹${s.due_fees}%20hai.`} 
                     target="_blank" rel="noreferrer" 
                     className="bg-green-100 text-green-700 p-2 rounded-lg font-black hover:bg-green-200 transition text-[10px]">NOTICE</a>
                  <button onClick={() => handleDelete(s.id)} className="bg-red-100 text-red-700 p-2 rounded-lg font-black hover:bg-red-200 transition text-[10px]">REMOVE</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Dashboard;
