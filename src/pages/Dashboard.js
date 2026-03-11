import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import config from '../config'; 

function Dashboard() {
  const [students, setStudents] = useState([]);
  
  // 🚀 WhatsApp add kar diya gaya hai
  const [formData, setFormData] = useState({ 
    name: '', total_fees: '', paid_fees: '', extra_fees: '', 
    mobile: '', whatsapp: '', email: '', photo: '' 
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); 

  const currentMonthName = new Date().toLocaleString('default', { month: 'short', year: 'numeric' });
  const [formMonth, setFormMonth] = useState(currentMonthName);

  const [isProPlan, setIsProPlan] = useState(false);
  const [planName, setPlanName] = useState('');
  const [planDuration, setPlanDuration] = useState('');
  const [planPrice, setPlanPrice] = useState(''); 

  const [quickPayStudent, setQuickPayStudent] = useState(null);
  const [paymentType, setPaymentType] = useState('ADVANCE'); 
  const [payAmount, setPayAmount] = useState('');
  const [payDiscount, setPayDiscount] = useState(''); // Naya: Pay karte time discount
  const [payMode, setPayMode] = useState('Cash');
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [dueMonthName, setDueMonthName] = useState(''); 

  const [showBillModal, setShowBillModal] = useState(false);
  const [billAmount, setBillAmount] = useState('');
  const [billMonthTarget, setBillMonthTarget] = useState(currentMonthName);
  const [isBilling, setIsBilling] = useState(false); 

  const navigate = useNavigate();
  const API_URL = config.apiUrl;
  const token = localStorage.getItem('adminToken');
  const adminName = localStorage.getItem('adminName');

  const getMonthOptions = () => {
    const options = [];
    const d = new Date();
    for(let i = -1; i < 11; i++) {
      const nd = new Date(d.getFullYear(), d.getMonth() + i, 1);
      options.push(nd.toLocaleString('default', { month: 'short', year: 'numeric' }));
    }
    return options;
  };
  const monthOptions = getMonthOptions();

  const toggleMonth = (month) => {
    if (selectedMonths.includes(month)) {
      setSelectedMonths(selectedMonths.filter(m => m !== month));
    } else {
      setSelectedMonths([...selectedMonths, month]);
    }
  };

  const fetchStudents = () => {
    fetch(`${API_URL}/api/students`, {
      headers: { 'Authorization': `Bearer ${token}` }
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
        data.append('upload_preset', 'gym_preset'); 
        
        const cleanName = formData.name ? formData.name.replace(/[^a-zA-Z0-9]/g, '_') : 'member';
        data.append('public_id', `${cleanName}_${Date.now()}`);

        try {
          const res = await fetch('https://api.cloudinary.com/v1_1/doaodzwor/image/upload', { 
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isUploading) return toast.error("Pehle photo upload hone dein!");
    if (isSubmitting) return; 

    setIsSubmitting(true);
    const total = isProPlan ? Number(planPrice) : (Number(formData.total_fees) || 0);
    const paid = editingId ? Number(formData.paid_fees) : (isProPlan ? Number(planPrice) : (Number(formData.paid_fees) || 0));
    const disc = Number(formData.extra_fees) || 0;
    
    // DB DB mein DBdue ko maintain karne ke liye
    const dbDue = total - paid - disc;
    
    try {
      const url = editingId ? `${API_URL}/api/student/update/${editingId}` : `${API_URL}/api/student/add`;
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...formData, total_fees: total, paid_fees: paid, extra_fees: disc, due_fees: dbDue })
      });
      
      const resultData = await response.json();

      if (response.ok) {
        let studentIdForPlan = editingId || resultData.studentId;

        if (!editingId && studentIdForPlan) {
            if (!isProPlan) {
                // 1. Bill
                await fetch(`${API_URL}/api/fees/add`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({
                        student_id: studentIdForPlan, amount: total, paid_on: new Date().toISOString().split('T')[0],
                        mode: 'System', description: 'Initial Registration Billed', status: 'Billed', month: formMonth 
                    })
                });
                
                // 2. Paid Amount
                if (paid > 0) {
                    await fetch(`${API_URL}/api/fees/add`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({
                            student_id: studentIdForPlan, amount: paid, paid_on: new Date().toISOString().split('T')[0],
                            mode: 'Cash', description: 'Initial Payment', status: 'Paid', month: formMonth 
                        })
                    });
                }

                // 3. Discount Amount (Ye Ledger mein discount show karega)
                if (disc > 0) {
                    await fetch(`${API_URL}/api/fees/add`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({
                            student_id: studentIdForPlan, amount: disc, paid_on: new Date().toISOString().split('T')[0],
                            mode: 'Discount', description: 'One-Time Discount', status: 'Paid', month: formMonth 
                        })
                    });
                }
            }
        }

        setFormData({ name: '', total_fees: '', paid_fees: '', extra_fees: '', mobile: '', whatsapp: '', email: '', photo: '' });
        setEditingId(null); 
        setIsProPlan(false); 
        toast.success(editingId ? "Data Updated! ✏️" : `Saved & Activated! 📦✅`);
        fetchStudents(); 
      }
    } catch (error) { 
        toast.error("Network problem."); 
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleQuickPay = async (e) => {
    e.preventDefault();
    const payAmt = Number(payAmount) || 0;
    const discAmt = Number(payDiscount) || 0;
    
    if(payAmt <= 0 && discAmt <= 0) return toast.error("Koi amount daalein!");

    const liveDue = Number(quickPayStudent.total_fees) - Number(quickPayStudent.paid_fees) - Number(quickPayStudent.extra_fees || 0);
    const totalReducing = payAmt + discAmt;
    
    if(paymentType === 'DUE' && totalReducing > liveDue) {
        return toast.error(`Aap ₹${liveDue} se zyada settle nahi kar sakte!`);
    }

    const finalMonths = paymentType === 'DUE' ? dueMonthName : (selectedMonths.length > 0 ? selectedMonths.join(', ') : currentMonthName);
    const desc = paymentType === 'DUE' ? "Cleared Pending Due" : "Advance / Regular Fees";

    const tid = toast.loading("Entry save ho rahi hai...");
    
    try {
      if (payAmt > 0) {
          await fetch(`${API_URL}/api/fees/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
              student_id: quickPayStudent.id, amount: payAmt, paid_on: new Date().toISOString().split('T')[0],
              mode: payMode, description: desc, status: "Paid", month: finalMonths
            })
          });
      }

      if (discAmt > 0) {
          await fetch(`${API_URL}/api/fees/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
              student_id: quickPayStudent.id, amount: discAmt, paid_on: new Date().toISOString().split('T')[0],
              mode: 'Discount', description: "Special Discount", status: "Paid", month: finalMonths
            })
          });
      }

      const newPaid = Number(quickPayStudent.paid_fees) + payAmt;
      const newDisc = Number(quickPayStudent.extra_fees || 0) + discAmt;

      await fetch(`${API_URL}/api/student/update/${quickPayStudent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...quickPayStudent, paid_fees: newPaid, extra_fees: newDisc })
      });

      toast.success(`Entry Successful! 🎉`, { id: tid });
      
      setQuickPayStudent(null);
      setPayAmount('');
      setPayDiscount('');
      setSelectedMonths([]); 
      setDueMonthName('');
      fetchStudents();
    } catch (error) {
      toast.error("Error aayi hai.", { id: tid });
    }
  };

  const handleDelete = async (id) => {
    if(window.confirm("Student delete ho jayega hamesha ke liye!")) {
      const tid = toast.loading("Database se delete ho raha hai... 🗑️");
      try {
        const res = await fetch(`${API_URL}/api/student/delete/${id}`, { 
          method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          fetchStudents();
          toast.success("Hata diya gaya! ✅", { id: tid });
        }
      } catch (error) {
         toast.error("Network issue.", { id: tid });
      }
    }
  };

  const handleEdit = (student) => {
    setEditingId(student.id);
    setIsProPlan(false); 
    setFormData({
      name: student.name, total_fees: student.total_fees, paid_fees: student.paid_fees,
      extra_fees: student.extra_fees || '', mobile: student.mobile || '',
      whatsapp: student.whatsapp || '', email: student.email || '', photo: student.photo || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGenerateBills = async (e) => {
    e.preventDefault();
    if (isBilling) return; 

    const amt = Number(billAmount);
    if(amt <= 0) return toast.error("Fees amount dalein!");

    setIsBilling(true);
    const tid = toast.loading("Generating Bills...");
    try {
        const res = await fetch(`${API_URL}/api/fees/generate-monthly`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ amount: amt, targetMonth: billMonthTarget })
        });
        const data = await res.json();
        if (res.ok) {
            toast.success(data.message, { id: tid });
            setShowBillModal(false);
            setBillAmount('');
            fetchStudents(); 
        }
    } catch (error) {
        toast.error("Network Problem.", { id: tid });
    } finally {
        setIsBilling(false);
    }
  };

  const filteredStudents = students.filter(s => {
    const searchLow = searchTerm.toLowerCase();
    const matchNameOrMobile = (s.name?.toLowerCase().includes(searchLow)) || (s.mobile?.includes(searchLow));
    const liveDue = Number(s.total_fees) - Number(s.paid_fees) - Number(s.extra_fees || 0);
    return matchNameOrMobile && (showPendingOnly ? (liveDue > 0) : true);
  });

  const totalActive = students.length;
  const totalDuesPending = students.reduce((sum, s) => {
      const liveDue = Number(s.total_fees) - Number(s.paid_fees) - Number(s.extra_fees || 0);
      return sum + (liveDue > 0 ? liveDue : 0);
  }, 0);
  const totalRevenue = students.reduce((sum, s) => sum + Number(s.paid_fees || 0), 0);
  const currentDuePreview = isProPlan ? 0 : ((Number(formData.total_fees) || 0) - (Number(formData.paid_fees) || 0) - (Number(formData.extra_fees) || 0));

  return (
    <div className="p-4 bg-slate-100 min-h-screen font-sans relative">
      <div className="flex justify-between items-center max-w-7xl mx-auto mb-6 bg-white p-5 rounded-2xl shadow-sm border-b-4 border-indigo-600 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-indigo-900 tracking-tight">{config.appName} {config.mainEmoji}</h1>
          <p className="text-gray-500 font-bold text-sm uppercase tracking-widest">{config.branchName} | Admin: {adminName}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowBillModal(true)} className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-xl font-black border border-indigo-200 hover:bg-indigo-200 transition text-sm shadow-sm flex items-center gap-1">
             🗓️ Auto-Bill (Month)
          </button>
          <button onClick={() => { localStorage.clear(); navigate('/'); }} className="bg-red-50 text-red-600 px-4 py-2 rounded-xl font-bold hover:bg-red-100 transition text-sm border border-red-200">Logout</button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border-l-8 border-indigo-500 flex justify-between items-center">
          <div><p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total Active</p><h3 className="text-3xl font-black text-slate-800">{totalActive}</h3></div><div className="text-4xl">👥</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border-l-8 border-green-500 flex justify-between items-center">
          <div><p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total Collection</p><h3 className="text-3xl font-black text-green-600">₹{totalRevenue}</h3></div><div className="text-4xl">📈</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border-l-8 border-red-500 flex justify-between items-center bg-red-50">
          <div><p className="text-xs font-black text-red-400 uppercase tracking-widest mb-1">Dues Pending</p><h3 className="text-3xl font-black text-red-600">₹{totalDuesPending}</h3></div><div className="text-4xl animate-pulse">⚠️</div>
        </div>
      </div>

      <div className={`max-w-7xl mx-auto bg-white p-6 rounded-2xl shadow-lg mb-8 border-t-8 ${editingId ? 'border-amber-400 bg-amber-50' : 'border-indigo-600'}`}>
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-wider">{editingId ? `✏️ Update Info` : `➕ New Registration`}</h2>
            <div className="bg-slate-800 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-inner">Live Due: <span className={currentDuePreview > 0 ? 'text-red-400' : 'text-green-400'}>₹{currentDuePreview}</span></div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input type="text" placeholder="Full Name" className="border-2 p-3 rounded-xl focus:border-indigo-500 outline-none font-bold" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
          <input type="text" placeholder="Mobile No." className="border-2 p-3 rounded-xl focus:border-indigo-500 outline-none font-bold" value={formData.mobile} onChange={(e) => setFormData({...formData, mobile: e.target.value})} />
          {/* 🚀 WHATSAPP BOX WAPAS */}
          <input type="text" placeholder="WhatsApp No." className="border-2 p-3 rounded-xl focus:border-indigo-500 outline-none font-bold" value={formData.whatsapp} onChange={(e) => setFormData({...formData, whatsapp: e.target.value})} />
          
          <div className="flex items-center gap-3 border-2 p-2 rounded-xl bg-slate-50 border-dashed border-indigo-200 relative col-span-1 md:col-span-2">
            <input type="file" accept="image/*" className="text-xs w-full cursor-pointer" onChange={handlePhotoChange} disabled={isUploading} />
            {formData.photo && <img src={formData.photo} alt="Preview" className="h-10 w-10 rounded-full border-2 border-indigo-500 object-cover" />}
          </div>

          {!isProPlan && (
            <>
              <div className="flex flex-col"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Base Monthly Fee (₹)</label><input type="number" className="border-2 p-3 rounded-xl focus:border-indigo-500 outline-none font-bold" value={formData.total_fees} onChange={(e) => setFormData({...formData, total_fees: e.target.value})} required={!isProPlan} /></div>
              
              {!editingId && (
              <div className="flex flex-col"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Paid Amount (₹)</label><input type="number" className="border-2 p-3 rounded-xl focus:border-indigo-500 outline-none font-bold text-green-700" value={formData.paid_fees} onChange={(e) => setFormData({...formData, paid_fees: e.target.value})} required={!isProPlan} /></div>
              )}
              
              <div className="flex flex-col">
                <label className="text-[9px] font-black text-amber-500 uppercase ml-1">One-Time Discount (₹)</label>
                <input type="number" placeholder="e.g. 200" className="border-2 p-3 rounded-xl focus:border-amber-500 outline-none font-bold text-amber-600 bg-amber-50" value={formData.extra_fees} onChange={(e) => setFormData({...formData, extra_fees: e.target.value})} />
              </div>

              {!editingId && (
              <div className="flex flex-col md:col-span-2">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Joining Month</label>
                <select className="border-2 p-3 rounded-xl focus:border-indigo-500 outline-none font-bold text-slate-700" value={formMonth} onChange={(e) => setFormMonth(e.target.value)}>{monthOptions.map(m => <option key={m} value={m}>{m}</option>)}</select>
              </div>
              )}
            </>
          )}
          
          <button type="submit" disabled={isUploading || isSubmitting} className={`md:col-span-5 text-white font-black py-4 mt-2 rounded-xl shadow-lg transition-all uppercase tracking-widest ${(isUploading || isSubmitting) ? 'bg-slate-400 cursor-not-allowed' : editingId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
            {isSubmitting ? "Processing... ⏳" : editingId ? "Save Changes" : `Register & Save`}
          </button>
          
          {editingId && (
             <button type="button" onClick={() => { setEditingId(null); setFormData({ name: '', total_fees: '', paid_fees: '', extra_fees: '', mobile: '', whatsapp: '', photo: '' }); }} className="md:col-span-5 bg-slate-200 text-slate-700 font-black py-2 rounded-xl hover:bg-slate-300 uppercase tracking-widest text-sm">
                 Cancel Edit
             </button>
          )}
        </form>
      </div>

      <div className="max-w-7xl mx-auto flex flex-wrap gap-4 items-center justify-between mb-4 bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
        <input type="text" placeholder={`🔍 Search Name/Mobile...`} className="bg-slate-50 border-none p-3 rounded-xl w-full max-w-md font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        <label className="flex items-center space-x-2 bg-red-50 text-red-600 px-5 py-2.5 rounded-xl font-black cursor-pointer hover:bg-red-100 transition border border-red-100"><input type="checkbox" className="h-4 w-4 rounded accent-red-600" checked={showPendingOnly} onChange={(e) => setShowPendingOnly(e.target.checked)} /><span className="text-xs uppercase tracking-widest">Show Defaulters</span></label>
      </div>

      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 mb-20">
        <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-800 text-slate-300">
                <tr><th className="p-4 text-[10px] font-black uppercase tracking-widest">Profile</th><th className="p-4 text-[10px] font-black uppercase tracking-widest">Status</th><th className="p-4 text-[10px] font-black uppercase tracking-widest text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
                {filteredStudents.map(s => {
                const liveDue = Number(s.total_fees) - Number(s.paid_fees) - Number(s.extra_fees || 0);

                return (
                <tr key={s.id} className={`transition-colors ${liveDue > 0 ? 'bg-red-50/30 hover:bg-red-50' : 'hover:bg-slate-50'}`}>
                    <td className="p-4 flex items-center gap-4">
                    {s.photo ? <img src={s.photo} alt="user" className="h-12 w-12 rounded-full object-cover border-2 border-white shadow-sm" /> : <div className="h-12 w-12 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">N/A</div>}
                    <div><div className="font-black text-slate-800 text-sm uppercase flex items-center gap-2">{s.name}</div><div className="text-[10px] font-bold text-slate-500 mt-0.5">📞 {s.mobile || 'No Number'}</div></div>
                    </td>
                    <td className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                            {liveDue > 0 ? (
                                <span className="bg-red-100 text-red-700 text-[9px] px-2 py-0.5 rounded-md font-black uppercase border border-red-200 shadow-sm animate-pulse">⚠️ Due: ₹{liveDue}</span>
                            ) : liveDue < 0 ? (
                                <span className="bg-blue-100 text-blue-700 text-[9px] px-2 py-0.5 rounded-md font-black uppercase border border-blue-200 shadow-sm">⭐ Adv: ₹{Math.abs(liveDue)}</span>
                            ) : (
                                <span className="bg-green-100 text-green-700 text-[9px] px-2 py-0.5 rounded-md font-black uppercase border border-green-200 shadow-sm">✅ Cleared</span>
                            )}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Base: ₹{s.total_fees} | Paid: ₹{s.paid_fees}
                            {s.extra_fees > 0 && <span className="ml-2 text-amber-500">| Dis: ₹{s.extra_fees}</span>}
                        </div>
                    </td>
                    <td className="p-4 text-right">
                    <div className="flex gap-1.5 justify-end">
                        {liveDue > 0 && <button onClick={() => { setQuickPayStudent({...s, due_fees: liveDue}); setPaymentType('DUE'); setPayAmount(liveDue); }} className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg font-black transition text-[10px] uppercase shadow-md">⚠️ Pay Due</button>}
                        {!s.has_active_plan && <button onClick={() => { setQuickPayStudent(s); setPaymentType('ADVANCE'); setSelectedMonths([currentMonthName]); }} className="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-black transition text-[10px] uppercase shadow-md">⏩ Advance</button>}
                        
                        <Link to={`/student/${s.id}`} className="bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg font-black hover:bg-slate-200 transition text-[10px]">Profile</Link>
                        <button onClick={() => handleEdit(s)} className="bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-lg font-black hover:bg-amber-100 transition text-[10px]">✏️ Edit</button>
                        <button onClick={() => handleDelete(s.id)} className="bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg font-black hover:bg-red-100 transition text-[10px]">🗑️</button>
                    </div>
                    </td>
                </tr>
                );
                })}
            </tbody>
            </table>
        </div>
      </div>

      {quickPayStudent && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl transform transition-all border-t-8 ${paymentType === 'DUE' ? 'border-orange-500' : 'border-indigo-500'}`}>
            <h3 className={`text-xl font-black uppercase text-center mb-1 ${paymentType === 'DUE' ? 'text-orange-600' : 'text-indigo-600'}`}>{paymentType === 'DUE' ? '⚠️ Clear Pending Dues' : '⏩ Pay Advance Fees'}</h3>
            <p className="text-center text-xs font-bold text-slate-400 mb-4">Payment for <span className="text-slate-800">{quickPayStudent.name}</span></p>
            
            <form onSubmit={handleQuickPay} className="space-y-4">
              {paymentType === 'DUE' ? (
                <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Due of Which Month?</label><input type="text" className="w-full border-2 border-slate-200 p-3 rounded-xl focus:border-orange-500 outline-none font-bold text-slate-700" value={dueMonthName} onChange={(e) => setDueMonthName(e.target.value)} placeholder="e.g. Jan 2026" required /></div>
              ) : (
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Select Paying Months</label>
                  <div className="flex flex-wrap gap-2 bg-slate-50 p-3 rounded-xl border-2 border-slate-100 max-h-40 overflow-y-auto">
                    {monthOptions.map(month => (
                      <span key={month} onClick={() => toggleMonth(month)} className={`cursor-pointer px-3 py-1.5 rounded-md text-[10px] font-black uppercase shadow-sm ${selectedMonths.includes(month) ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-slate-500 border-slate-200 border'}`}>{selectedMonths.includes(month) ? '✓ ' : ''}{month}</span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* 🚀 NAYA: Payment popup mein bhi discount field */}
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pay Amt (₹)</label><input type="number" max={paymentType === 'DUE' ? quickPayStudent.due_fees : undefined} className="w-full border-2 border-slate-200 p-3 rounded-xl outline-none font-black text-lg focus:border-indigo-500 text-indigo-600" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} /></div>
                <div><label className="text-[10px] font-black text-amber-500 uppercase tracking-widest ml-1">Discount (₹)</label><input type="number" className="w-full border-2 border-amber-200 p-3 rounded-xl outline-none font-black text-lg focus:border-amber-500 text-amber-600 bg-amber-50" value={payDiscount} onChange={(e) => setPayDiscount(e.target.value)} placeholder="e.g. 50" /></div>
                <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mode</label><select className="w-full border-2 border-slate-200 p-3 rounded-xl focus:border-slate-500 outline-none font-bold text-slate-700 h-[52px]" value={payMode} onChange={(e) => setPayMode(e.target.value)}><option>Cash</option><option>UPI</option><option>Card</option></select></div>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => { setQuickPayStudent(null); setSelectedMonths([]); setDueMonthName(''); setPayDiscount(''); }} className="flex-1 bg-slate-100 text-slate-500 font-black py-3 rounded-xl">Cancel</button>
                <button type="submit" className={`flex-1 text-white font-black py-3 rounded-xl shadow-lg uppercase ${paymentType === 'DUE' ? 'bg-orange-500' : 'bg-indigo-600'}`}>✅ Confirm</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBillModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl transform transition-all border-t-8 border-indigo-500">
             <h3 className="text-xl font-black uppercase text-center mb-1 text-indigo-700">🗓️ Generate New Bills</h3>
             <p className="text-center text-[10px] font-bold text-slate-400 mb-4 uppercase tracking-widest">
                Skipping newly joined students.
             </p>
             <form onSubmit={handleGenerateBills} className="space-y-4">
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Billing Month</label>
                    <select className="w-full border-2 border-slate-200 p-3 rounded-xl focus:border-indigo-500 outline-none font-bold text-slate-700 mt-1 mb-2" value={billMonthTarget} onChange={(e) => setBillMonthTarget(e.target.value)}>
                        {monthOptions.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Standard Bill Amount (₹)</label>
                    <input type="number" className="w-full border-2 border-slate-200 p-3 rounded-xl outline-none font-black text-xl focus:border-indigo-500 text-indigo-700 text-center" value={billAmount} onChange={(e) => setBillAmount(e.target.value)} placeholder="e.g. 800" required autoFocus />
                </div>
                <div className="flex gap-2 pt-2">
                    <button type="button" onClick={() => setShowBillModal(false)} className="flex-1 bg-slate-100 text-slate-500 font-black py-3 rounded-xl">Cancel</button>
                    <button type="submit" disabled={isBilling} className={`flex-1 text-white font-black py-3 rounded-xl shadow-lg uppercase ${isBilling ? 'bg-slate-400' : 'bg-indigo-600'}`}>
                        {isBilling ? 'Wait...' : '🚀 Auto-Bill'}
                    </button>
                </div>
             </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default Dashboard;
