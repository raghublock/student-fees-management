import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

function PlanPurchase() {
  const [students, setStudents] = useState([]);
  const [plans, setPlans] = useState([]);
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    student_id: '',
    plan_name: '', 
    duration_months: 1,
    price: '',
    start_date: new Date().toISOString().split('T')[0] // Default aaj ki date
  });

  const API_URL = "https://library-api.raghuveerbhati525.workers.dev";
  const token = localStorage.getItem('adminToken');

  const fetchData = async () => {
    try {
      const resStudents = await fetch(`${API_URL}/api/students`, { 
        headers: { 'Authorization': `Bearer ${token}` } 
      });
      const dataStudents = await resStudents.json();
      setStudents(Array.isArray(dataStudents) ? dataStudents : []);
      
      const resPlans = await fetch(`${API_URL}/api/plans/history`, { 
        headers: { 'Authorization': `Bearer ${token}` } 
      });
      const dataPlans = await resPlans.json();
      setPlans(Array.isArray(dataPlans) ? dataPlans : []);
    } catch (err) {
      toast.error("Data load nahi ho pa raha.");
    }
  };

  useEffect(() => {
    if (!token) navigate('/');
    else fetchData();
  }, [token, navigate]);

  const handleDeletePlan = async (id) => {
    if(window.confirm("Kya aap is plan ko cancel/delete karna chahte hain?")) {
      try {
        const res = await fetch(`${API_URL}/api/plans/delete/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if(res.ok) {
          toast.success("Plan Removed! 🗑️");
          fetchData(); 
        }
      } catch (err) {
        toast.error("Network Error.");
      }
    }
  };

  const handlePurchase = async (e) => {
    e.preventDefault();
    const loadingToast = toast.loading("Plan activate ho raha hai...");
    try {
      const res = await fetch(`${API_URL}/api/plans/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      if(res.ok) {
        toast.success("Plan Activated! ✅", { id: loadingToast });
        setFormData({
          student_id: '', plan_name: '', duration_months: 1, price: '',
          start_date: new Date().toISOString().split('T')[0]
        });
        fetchData();
      }
    } catch (err) {
      toast.error("Network Error.", { id: loadingToast });
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      <div className="flex justify-between items-center max-w-7xl mx-auto mb-8 bg-white p-5 rounded-xl shadow-md border-b-4 border-orange-600">
        <div>
          <h1 className="text-3xl font-black text-orange-700 uppercase tracking-tighter">📦 Purchase Library Plan</h1>
          <p className="text-gray-500 font-bold text-xs uppercase italic">Laxmi Library | Bikaner Branch</p>
        </div>
        <Link to="/dashboard" className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-black shadow-lg hover:bg-indigo-700 transition flex items-center gap-2">
          ← Back to Dashboard
        </Link>
      </div>
      
      <div className="max-w-7xl mx-auto bg-white p-8 rounded-2xl shadow-xl mb-10 border-t-8 border-orange-500">
        <h2 className="text-lg font-black mb-6 text-slate-700 uppercase">Naya Plan Details Bharein</h2>
        <form onSubmit={handlePurchase} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Student Select Karein</label>
            <select className="border-2 p-3 rounded-xl focus:border-orange-500 outline-none font-bold text-slate-700" value={formData.student_id} onChange={(e) => setFormData({...formData, student_id: e.target.value})} required>
              <option value="">-- Choose Student --</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Plan Name (Shift)</label>
            <input type="text" placeholder="e.g. Morning Shift" className="border-2 p-3 rounded-xl focus:border-orange-500 outline-none font-bold" value={formData.plan_name} onChange={(e) => setFormData({...formData, plan_name: e.target.value})} required />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Plan Start Date 📅</label>
            <input type="date" className="border-2 p-3 rounded-xl focus:border-orange-500 outline-none font-bold bg-orange-50" value={formData.start_date} onChange={(e) => setFormData({...formData, start_date: e.target.value})} required />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Duration (Months)</label>
            <input type="number" placeholder="Months" className="border-2 p-3 rounded-xl focus:border-orange-500 outline-none font-bold" value={formData.duration_months} onChange={(e) => setFormData({...formData, duration_months: e.target.value})} required />
          </div>
          
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Price (₹)</label>
            <input type="number" placeholder="Total Price" className="border-2 p-3 rounded-xl focus:border-orange-500 outline-none font-bold" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} required />
          </div>

          <div className="flex items-end">
            <button type="submit" className="w-full bg-orange-600 text-white font-black py-4 rounded-xl hover:bg-orange-700 shadow-xl transition-all uppercase tracking-widest active:scale-95">
              Activate Plan Now 🚀
            </button>
          </div>
        </form>
      </div>

      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100">
        <div className="bg-slate-800 p-4"><h3 className="text-white font-black uppercase tracking-wider">Plan History 📜</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black tracking-widest">
              <tr>
                <th className="p-4 border-b">Student</th>
                <th className="p-4 border-b">Plan</th>
                <th className="p-4 border-b">Expiry Date</th>
                <th className="p-4 border-b">Price</th>
                <th className="p-4 border-b text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {plans.map(p => (
                <tr key={p.id} className="hover:bg-orange-50/50">
                  <td className="p-4 font-black text-slate-800 uppercase">{p.student_name}</td>
                  <td className="p-4"><span className="font-bold text-slate-600">{p.plan_name}</span></td>
                  <td className="p-4"><span className="text-red-500 font-black px-3 py-1 bg-red-50 rounded-lg text-xs italic">⌛ {p.expiry_date}</span></td>
                  <td className="p-4"><span className="text-green-700 font-black">₹{p.price}</span></td>
                  <td className="p-4 text-center">
                    <button onClick={() => handleDeletePlan(p.id)} className="bg-red-100 text-red-600 px-4 py-2 rounded-xl font-black text-[10px] hover:bg-red-600 hover:text-white transition-all">Delete</button>
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

export default PlanPurchase;
