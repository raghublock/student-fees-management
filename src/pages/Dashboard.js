import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import config from '../config'; 

function Dashboard() {
  const [students, setStudents] = useState([]);
  
  // Form ke liye
  const [formData, setFormData] = useState({ 
    name: '', total_fees: '', paid_fees: '', extra_fees: '', 
    mobile: '', whatsapp: '', email: '', photo: '' 
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // 💰 Quick Pay Popup ke liye Naya State
  const [quickPayStudent, setQuickPayStudent] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('Cash');

  const navigate = useNavigate();
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

  // ☁️ Photo Upload (Compression ke sath)
  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const toastId = toast.loading("Photo Compress aur Upload ho rahi hai... ⏳");

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400; 
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6); 

        const data = new FormData();
        data.append('file', compressedBase64); 
        data.append('upload_preset', 'gym_preset'); // Apna preset
        
        const cleanName = formData.name ? formData.name.replace(/[^a-zA-Z0-9]/g, '_') : 'member';
        data.append('public_id', `${cleanName}_${Date.now()}`);

        try {
          const res = await fetch('https://api.cloudinary.com/v1_1/doaodzwor/image/upload', { // Apna Cloud Name
            method: 'POST', body: data
          });
          const uploadedImage = await res.json();
          if (uploadedImage.secure_url) {
            setFormData(prev => ({ ...prev, photo: uploadedImage.secure_url }));
            toast.success("Photo Uploaded! ✅", { id: toastId });
          } else {
            toast.error("Upload fail ho gaya.", { id: toastId });
          }
        } catch (error) {
          toast.error("Cloudinary error.", { id: toastId });
        } finally {
          setIsUploading(false);
        }
      };
    };
  };

  // 📝 Naya Member Add / Edit karna
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isUploading) return toast.error("Pehle photo upload hone dein!");

    const total = Number(formData.total_fees) || 0;
    const paid = Number(formData.paid_fees) || 0;
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
    } catch (error) { toast.error("Network problem."); }
  };

  // 💰 QUICK PAY FEATURE (Bina page badle fees jama)
  const handleQuickPay = async (e) => {
    e.preventDefault();
    const payAmt = Number(payAmount);
    if(payAmt <= 0 || payAmt > quickPayStudent.due_fees) {
      return toast.error("Sahi amount daalein!");
    }

    const tid = toast.loading("Fees jama ho rahi hai...");
    
    try {
      // 1. History Ledger mein add karna
      await fetch(`${API_URL}/api/fees/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          student_id: quickPayStudent.id,
          amount: payAmt,
          paid_on: new Date().toISOString().split('T')[0],
          mode: payMode,
          description: "Quick Pay Dashboard",
          status: "Paid",
          month: new Date().toLocaleString('default', { month: 'short', year: 'numeric' })
        })
      });

      // 2. Student ka main record update karna (Due kam karna, Paid badhana)
      const newPaid = Number(quickPayStudent.paid_fees) + payAmt;
      const newDue = Number(quickPayStudent.due_fees) - payAmt;
      
      await fetch(`${API_URL}/api/student/update/${quickPayStudent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...quickPayStudent, paid_fees: newPaid, due_fees: newDue })
      });

      toast.success(`₹${payAmt} Jama ho gaye! 🎉`, { id: tid });
      setQuickPayStudent(null);
      setPayAmount('');
      fetchStudents();
    } catch (error) {
      toast.error("Fees jama karne mein error.", { id: tid });
    }
  };

  const handleDelete = async (id) => {
    if(window.confirm("Kripya confirm karein. Data hamesha ke liye delete ho jayega!")) {
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
      name: student.name, total_fees: student.total_fees, paid_fees: student.paid_fees,
      extra_fees: student.extra_fees || '', mobile: student.mobile || '',
      whatsapp: student.whatsapp || '', email: student.email || '', photo: student.photo || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 🔍 Smart Search (Name aur Mobile dono se search karega)
  const filteredStudents = students.filter(s => {
    const searchLow = searchTerm.toLowerCase();
    const matchNameOrMobile = (s.name?.toLowerCase().includes(searchLow)) || (s.mobile?.includes(searchLow));
    const matchPending = showPendingOnly ? (s.due_fees > 0) : true;
    return matchNameOrMobile && matchPending;
  });

  // 📊 Jadoo Dabbe (Summary Calculations)
  const totalActive = students.length;
  const totalDuesPending = students.reduce((sum, s) => sum + Number(s.due_fees || 0), 0);
  const totalRevenue = students.reduce((sum, s) => sum + Number(s.paid_fees || 0), 0);

  // 🧮 Auto-Calculator Form ke liye
  const currentDuePreview = (Number(formData.total_fees) || 0) - (Number(formData.paid_fees) || 0);

  return (
    <div className="p-4 bg-slate-100 min-h-screen font-sans relative">
      
      {/* Naya Header Section */}
      <div className="flex justify-between items-center max-w-7xl mx-auto mb-6 bg-white p-5 rounded-2xl shadow-sm border-b-4 border-indigo-600 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-indigo-900 tracking-tight">{config.appName} {config.mainEmoji}</h1>
          <p className="text-gray-500 font-bold text-sm uppercase tracking-widest">{config.branchName} | Admin: {adminName}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/analytics" className="bg-slate-800 text-white px-4 py-2 rounded-xl font-bold hover:bg-black shadow-md transition text-sm">📊 Analytics</Link>
          <Link to="/plans" className="bg-orange-500 text-white px-4 py-2 rounded-xl font-bold hover:bg-orange-600 shadow-md transition text-sm">📦 Plans</Link>
          {/* Fees button ko hata diya kyunki sab yahin aa gaya! */}
          <button onClick={() => { localStorage.clear(); navigate('/'); }} className="bg-red-50 text-red-600 px-4 py-2 rounded-xl font-bold hover:bg-red-100 transition text-sm border border-red-200">Logout</button>
        </div>
      </div>

      {/* 📊 3 JADOO DABBE (Summary Cards) */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border-l-8 border-indigo-500 flex justify-between items-center">
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total {config.userType}s</p>
            <h3 className="text-3xl font-black text-slate-800">{totalActive}</h3>
          </div>
          <div className="text-4xl">👥</div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border-l-8 border-green-500 flex justify-between items-center">
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total Collection</p>
            <h3 className="text-3xl font-black text-green-600">₹{totalRevenue}</h3>
          </div>
          <div className="text-4xl">📈</div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border-l-8 border-red-500 flex justify-between items-center bg-red-50">
          <div>
            <p className="text-xs font-black text-red-400 uppercase tracking-widest mb-1">Dues Pending</p>
            <h3 className="text-3xl font-black text-red-600">₹{totalDuesPending}</h3>
          </div>
          <div className="text-4xl animate-pulse">⚠️</div>
        </div>
      </div>

      {/* 📝 Smart Form Section */}
      <div className={`max-w-7xl mx-auto bg-white p-6 rounded-2xl shadow-lg mb-8 border-t-8 ${editingId ? 'border-amber-400 bg-amber-50' : 'border-indigo-600'}`}>
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-wider">
            {editingId ? `✏️ Update ${config.userType}` : `➕ New Registration`}
            </h2>
            {/* Auto-Calculator Display */}
            <div className="bg-slate-800 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-inner">
                Calculated Due: <span className={currentDuePreview > 0 ? 'text-red-400' : 'text-green-400'}>₹{currentDuePreview}</span>
            </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input type="text" placeholder="Full Name" className="border-2 p-3 rounded-xl focus:border-indigo-500 outline-none font-bold" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
          <input type="text" placeholder="Mobile No." className="border-2 p-3 rounded-xl focus:border-indigo-500 outline-none font-bold" value={formData.mobile} onChange={(e) => setFormData({...formData, mobile: e.target.value})} />
          <input type="text" placeholder="WhatsApp No." className="border-2 p-3 rounded-xl focus:border-indigo-500 outline-none font-bold" value={formData.whatsapp} onChange={(e) => setFormData({...formData, whatsapp: e.target.value})} />
          
          <div className="col-span-1 md:col-span-2 flex items-center gap-3 border-2 p-2 rounded-xl bg-slate-50 border-dashed border-indigo-200 relative">
            <input type="file" accept="image/*" className="text-xs w-full cursor-pointer" onChange={handlePhotoChange} disabled={isUploading} />
            {formData.photo && <img src={formData.photo} alt="Preview" className="h-10 w-10 rounded-full border-2 border-indigo-500 object-cover" />}
            {isUploading && <span className="absolute right-2 text-xs font-bold text-indigo-600">Uploading...</span>}
          </div>

          <input type="number" placeholder="Total Fees (₹)" className="border-2 p-3 rounded-xl focus:border-indigo-500 outline-none font-bold" value={formData.total_fees} onChange={(e) => setFormData({...formData, total_fees: e.target.value})} required />
          <input type="number" placeholder="Paid Now (₹)" className="border-2 p-3 rounded-xl focus:border-indigo-500 outline-none font-bold text-green-700" value={formData.paid_fees} onChange={(e) => setFormData({...formData, paid_fees: e.target.value})} required />
          
          <button type="submit" disabled={isUploading} className={`md:col-span-3 text-white font-black py-3 rounded-xl shadow-lg transition-all uppercase tracking-widest ${isUploading ? 'bg-slate-400' : editingId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
            {editingId ? "Save Changes" : `Register ${config.userType}`}
          </button>
        </form>
      </div>

      {/* 🔍 Smart Search Bar */}
      <div className="max-w-7xl mx-auto flex flex-wrap gap-4 items-center justify-between mb-4 bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
        <input 
          type="text" 
          placeholder={`🔍 Search by Name or Mobile...`} 
          className="bg-slate-50 border-none p-3 rounded-xl w-full max-w-md font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100"
          value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
        />
        <label className="flex items-center space-x-2 bg-red-50 text-red-600 px-5 py-2.5 rounded-xl font-black cursor-pointer hover:bg-red-100 transition border border-red-100">
          <input type="checkbox" className="h-4 w-4 rounded accent-red-600" checked={showPendingOnly} onChange={(e) => setShowPendingOnly(e.target.checked)} />
          <span className="text-xs uppercase tracking-widest">Show Defaulters (Dues)</span>
        </label>
      </div>

      {/* 🚦 Traffic Light Data Table */}
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 mb-20">
        <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-800 text-slate-300">
                <tr>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest">Profile</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest">Account Status</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-right">Quick Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
                {filteredStudents.map(s => (
                // 🚦 Color Coding: Laal rang agar due hai, warna regular
                <tr key={s.id} className={`transition-colors ${s.due_fees > 0 ? 'bg-red-50/30 hover:bg-red-50' : 'hover:bg-slate-50'}`}>
                    
                    {/* Identity Column */}
                    <td className="p-4 flex items-center gap-4">
                    {s.photo ? (
                        <img src={s.photo} alt="user" className="h-12 w-12 rounded-full object-cover border-2 border-white shadow-sm" />
                    ) : (
                        <div className="h-12 w-12 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">N/A</div>
                    )}
                    <div>
                        <div className="font-black text-slate-800 text-sm uppercase">{s.name}</div>
                        <div className="text-[10px] font-bold text-slate-500 mt-0.5">📞 {s.mobile || 'No Number'}</div>
                    </div>
                    </td>
                    
                    {/* Status & Fees Column */}
                    <td className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                            {s.due_fees > 0 
                                ? <span className="bg-red-100 text-red-700 text-[9px] px-2 py-0.5 rounded-md font-black uppercase border border-red-200 shadow-sm animate-pulse">⚠️ Due: ₹{s.due_fees}</span>
                                : <span className="bg-green-100 text-green-700 text-[9px] px-2 py-0.5 rounded-md font-black uppercase border border-green-200 shadow-sm">✅ Cleared</span>
                            }
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Total: ₹{s.total_fees} | Paid: ₹{s.paid_fees}
                        </div>
                    </td>
                    
                    {/* One-Click Action Buttons */}
                    <td className="p-4 text-right">
                    <div className="flex gap-1.5 justify-end">
                        {/* 💰 Quick Pay Button (Agar due hai tabhi primary color dikhega) */}
                        <button 
                            onClick={() => setQuickPayStudent(s)} 
                            disabled={s.due_fees <= 0}
                            className={`${s.due_fees > 0 ? 'bg-green-500 hover:bg-green-600 text-white shadow-md' : 'bg-slate-100 text-slate-400 cursor-not-allowed'} px-3 py-1.5 rounded-lg font-black transition text-[10px] uppercase flex items-center gap-1`}
                        >
                            💰 Pay
                        </button>

                        {/* 💬 Smart WhatsApp Reminder */}
                        <a 
                            href={s.due_fees > 0 
                                ? `https://wa.me/91${s.whatsapp}?text=Namaste%20${s.name},%20Aapki%20${config.appName}%20ki%20%E2%82%B9${s.due_fees}%20fees%20due%20hai.%20Kripya%20jama%20karwayein.` 
                                : `https://wa.me/91${s.whatsapp}?text=Namaste%20${s.name},%20Welcome%20to%20${config.appName}!`
                            } 
                            target="_blank" rel="noreferrer" 
                            className="bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg font-black hover:bg-green-100 transition text-[10px] flex items-center"
                        >
                            💬 WA
                        </a>

                        <Link to={`/student/${s.id}`} className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-lg font-black hover:bg-indigo-100 transition text-[10px]">👁️ View</Link>
                        <button onClick={() => handleEdit(s)} className="bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-lg font-black hover:bg-amber-100 transition text-[10px]">✏️ Edit</button>
                        <button onClick={() => handleDelete(s.id)} className="bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg font-black hover:bg-red-100 transition text-[10px]">🗑️</button>
                    </div>
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
      </div>

      {/* 💰 QUICK PAY MODAL POPUP */}
      {quickPayStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl transform transition-all border-t-8 border-green-500">
            <h3 className="text-xl font-black text-slate-800 uppercase text-center mb-1">Quick Pay</h3>
            <p className="text-center text-xs font-bold text-slate-400 mb-6">Receiving fees for <span className="text-indigo-600">{quickPayStudent.name}</span></p>
            
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-center font-black text-lg mb-4 border border-red-100">
                Pending Due: ₹{quickPayStudent.due_fees}
            </div>

            <form onSubmit={handleQuickPay} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Paying Amount (₹)</label>
                <input 
                    type="number" 
                    max={quickPayStudent.due_fees} 
                    className="w-full border-2 border-slate-200 p-3 rounded-xl focus:border-green-500 outline-none font-black text-green-700 text-lg" 
                    value={payAmount} 
                    onChange={(e) => setPayAmount(e.target.value)} 
                    required autoFocus
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Mode</label>
                <select className="w-full border-2 border-slate-200 p-3 rounded-xl focus:border-green-500 outline-none font-bold text-slate-700" value={payMode} onChange={(e) => setPayMode(e.target.value)}>
                    <option>Cash</option>
                    <option>UPI</option>
                    <option>Card</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setQuickPayStudent(null)} className="flex-1 bg-slate-100 text-slate-500 font-black py-3 rounded-xl hover:bg-slate-200 transition">Cancel</button>
                <button type="submit" className="flex-1 bg-green-500 text-white font-black py-3 rounded-xl hover:bg-green-600 shadow-lg transition">✅ Accept ₹{payAmount || 0}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default Dashboard;
