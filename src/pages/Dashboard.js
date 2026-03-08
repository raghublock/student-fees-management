import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import config from '../config'; // 🚀 Config file import kar li

function Dashboard() {
  const [students, setStudents] = useState([]);
  
  const [formData, setFormData] = useState({ 
    name: '', total_fees: '', paid_fees: '', extra_fees: '', 
    mobile: '', whatsapp: '', email: '', photo: '' 
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // 🚀 Naya State: Photo upload hone ka loading dikhane ke liye
  const [isUploading, setIsUploading] = useState(false);

  const navigate = useNavigate();
  
  // ✅ Puraana hardcoded link hata diya! Ab ye config se chalega
  const API_URL = config.apiUrl;
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

  // 🚀 NAYA CLOUDINARY UPLOAD MAGIC
  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const toastId = toast.loading("Photo Cloud par upload ho rahi hai... ☁️");

    // Cloudinary ka form data banayenge
    const data = new FormData();
    data.append('file', file);
    
    // ⚠️ DHYAN DEIN: Yahan apna Preset Name daalein (Jaise: gym_preset)
    data.append('upload_preset', 'gym_preset'); 

    try {
      // ⚠️ DHYAN DEIN: URL mein YOUR_CLOUD_NAME ko apne Cloudinary naam se badlein
      const res = await fetch('https://api.cloudinary.com/v1_1/doaodzwor/image/upload', {
        method: 'POST',
        body: data
      });

      const uploadedImage = await res.json();
      
      if (uploadedImage.secure_url) {
        setFormData({ ...formData, photo: uploadedImage.secure_url });
        toast.success("Photo upload aur compress ho gayi! ✅", { id: toastId });
      } else {
        toast.error("Upload fail ho gaya. Settings check karein.", { id: toastId });
      }
    } catch (error) {
      toast.error("Cloudinary connection error.", { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isUploading) {
      toast.error("Pehle photo upload hone dein!");
      return;
    }

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
        toast.success(editingId ? "Data Updated! ✏️" : `${config.userType} Saved! ✅`);
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
      
      {/* Header Section (Dynamic) */}
      <div className="flex justify-between items-center max-w-7xl mx-auto mb-8 bg-white p-5 rounded-xl shadow-md border-b-4 border-indigo-700 transition-all flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-indigo-900">{config.appName} {config.mainEmoji}</h1>
          <p className="text-gray-500 font-bold italic">{config.branchName} | Welcome, {adminName || 'Admin'}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/analytics" className="bg-slate-800 text-white px-5 py-2 rounded-lg font-bold hover:bg-black shadow-lg border-b-4 border-slate-600 transition active:scale-95 flex items-center gap-2">
            <span>📊</span> Analytics
          </Link>

          <Link to="/plans" className="bg-orange-500 text-white px-5 py-2 rounded-lg font-bold hover:bg-orange-600 shadow-lg border-b-4 border-orange-800 transition active:scale-95 flex items-center gap-2">
            <span>📦</span> {config.planLabel}s Manager
          </Link>
          
          <Link to="/fees" className="bg-green-600 text-white px-5 py-2 rounded-lg font-bold hover:bg-green-700 shadow-lg border-b-4 border-green-800 transition flex items-center gap-2">
            <span>💰</span> Fees Dashboard
          </Link>
          
          <button onClick={() => { localStorage.clear(); navigate('/'); }} className="bg-red-500 text-white px-5 py-2 rounded-lg font-bold hover:bg-red-600 shadow-lg border-b-4 border-red-700 transition">
            Logout
          </button>
        </div>
      </div>

      {/* Form Section (Dynamic) */}
      <div className={`max-w-7xl mx-auto bg-white p-6 rounded-2xl shadow-lg mb-8 border-t-8 ${editingId ? 'border-yellow-500 bg-yellow-50' : 'border-indigo-600'}`}>
        <h2 className="text-xl font-black mb-6 text-gray-800 uppercase tracking-wider">
          {editingId ? `✏️ Update ${config.userType}` : `➕ Add New ${config.userType}`}
        </h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input type="text" placeholder={`${config.userType} Name`} className="border-2 p-3 rounded-xl focus:border-indigo-500 outline-none transition" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
          <input type="text" placeholder="Mobile" className="border-2 p-3 rounded-xl focus:border-indigo-500 outline-none" value={formData.mobile} onChange={(e) => setFormData({...formData, mobile: e.target.value})} />
          <input type="text" placeholder="WhatsApp" className="border-2 p-3 rounded-xl focus:border-indigo-500 outline-none" value={formData.whatsapp} onChange={(e) => setFormData({...formData, whatsapp: e.target.value})} />
          
          <div className="flex flex-col border-2 p-2 rounded-xl bg-gray-50 border-dashed border-indigo-200 relative">
            <label className="text-[10px] font-black text-indigo-400 mb-1 uppercase">{config.userType} Photo</label>
            <div className="flex items-center gap-2">
              <input type="file" accept="image/*" className="text-[10px] w-full cursor-pointer" onChange={handlePhotoChange} disabled={isUploading} />
              {formData.photo && <img src={formData.photo} alt="Preview" className="h-10 w-10 rounded-full border-2 border-indigo-500 object-cover shadow-sm" />}
            </div>
            {isUploading && <div className="absolute inset-0 bg-white/80 flex items-center justify-center text-xs font-bold text-indigo-600">Uploading...</div>}
          </div>

          <input type="number" placeholder="Total Fees" className="border-2 p-3 rounded-xl focus:border-indigo-500 outline-none" value={formData.total_fees} onChange={(e) => setFormData({...formData, total_fees: e.target.value})} required />
          <input type="number" placeholder="Paid Fees" className="border-2 p-3 rounded-xl focus:border-indigo-500 outline-none" value={formData.paid_fees} onChange={(e) => setFormData({...formData, paid_fees: e.target.value})} required />
          <input type="number" placeholder="Extra" className="border-2 p-3 rounded-xl focus:border-indigo-500 outline-none" value={formData.extra_fees} onChange={(e) => setFormData({...formData, extra_fees: e.target.value})} />
          
          <button type="submit" disabled={isUploading} className={`text-white font-black py-3 rounded-xl shadow-xl transition-all ${isUploading ? 'bg-gray-400 cursor-not-allowed' : editingId ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-indigo-600 hover:bg-indigo-800'}`}>
            {isUploading ? 'WAIT...' : editingId ? "SAVE CHANGES" : `REGISTER ${config.userType.toUpperCase()}`}
          </button>
        </form>
      </div>

      {/* Search & Filter (Dynamic) */}
      <div className="max-w-7xl mx-auto flex flex-wrap gap-4 items-center justify-between mb-4">
        <input 
          type="text" 
          placeholder={`🔍 Search ${config.userType}...`} 
          className="border-2 p-3 rounded-2xl w-full max-w-md shadow-sm outline-none focus:border-indigo-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <label className="flex items-center space-x-3 bg-red-100 text-red-700 px-6 py-3 rounded-2xl font-black cursor-pointer hover:bg-red-200 transition shadow-sm border-b-4 border-red-300">
          <input type="checkbox" className="h-5 w-5 rounded" checked={showPendingOnly} onChange={(e) => setShowPendingOnly(e.target.checked)} />
          <span>DUES PENDING ONLY</span>
        </label>
      </div>

      {/* Data Table (Dynamic) */}
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
        <table className="w-full text-left">
          <thead className="bg-slate-800 text-white">
            <tr>
              <th className="p-4 text-xs font-black uppercase">Identity</th>
              <th className="p-4 text-xs font-black uppercase">Name</th>
              <th className="p-4 text-xs font-black uppercase text-center">Manage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredStudents.map(s => (
              <tr key={s.id} className="hover:bg-indigo-50/50 transition-colors">
                <td className="p-4">
                  {s.photo ? (
                    <img src={s.photo} alt={config.userType} className="h-14 w-14 rounded-2xl object-cover border-2 border-white shadow-md" />
                  ) : (
                    <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-400 border border-slate-200 uppercase">No Photo</div>
                  )}
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-800 text-lg uppercase">{s.name}</span>
                    {s.has_active_plan && (
                      <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-[9px] px-2 py-0.5 rounded-full font-black shadow-sm animate-pulse border border-yellow-200">
                        PRO {config.userType.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-bold text-slate-500 mt-1">📱 {s.mobile || 'N/A'}</div>
                </td>
                <td className="p-4">
                   <div className="flex gap-2 justify-center flex-wrap">
                      <Link to={`/student/${s.id}`} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-black hover:bg-indigo-700 transition text-[10px] shadow-md">
                        PROFILE
                      </Link>
                      <button onClick={() => handleEdit(s)} className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg font-black hover:bg-amber-200 transition text-[10px]">EDIT</button>
                      <a href={`https://wa.me/91${s.whatsapp}?text=Namaste%20${s.name}`} target="_blank" rel="noreferrer" className="bg-green-100 text-green-700 px-3 py-1.5 rounded-lg font-black text-[10px]">NOTICE</a>
                      <button onClick={() => handleDelete(s.id)} className="bg-red-100 text-red-700 px-3 py-1.5 rounded-lg font-black hover:bg-red-200 transition text-[10px]">REMOVE</button>
                   </div>
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
