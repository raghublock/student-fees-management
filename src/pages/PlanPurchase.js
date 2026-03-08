import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

function PlanPurchase() {
  const [students, setStudents] = useState([]);
  const [plans, setPlans] = useState([]);
  const [formData, setFormData] = useState({
    student_id: '',
    plan_name: '', // e.g., "Full Day", "Morning Shift"
    duration_months: 1,
    price: '',
    start_date: new Date().toISOString().split('T')[0]
  });

  const API_URL = "https://library-api.raghuveerbhati525.workers.dev";
  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    // Students list fetch karein dropdown ke liye
    fetch(`${API_URL}/api/students`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json()).then(data => setStudents(data));
    
    // Purchase history fetch karein
    fetch(`${API_URL}/api/plans/history`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json()).then(data => setPlans(data));
  }, []);

  const handlePurchase = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_URL}/api/plans/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(formData)
    });
    if(res.ok) {
      toast.success("Plan Activated! ✅");
      // Refresh list
    }
  };

  return (
    <div className="p-6 bg-slate-100 min-h-screen">
      <h1 className="text-3xl font-bold text-indigo-900 mb-6 border-b-4 border-indigo-600 pb-2">📦 Purchase Library Plan</h1>
      
      {/* Plan Purchase Form */}
      <form onSubmit={handlePurchase} className="bg-white p-6 rounded-xl shadow-lg grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 border-t-8 border-orange-500">
        <select className="border p-3 rounded-lg" value={formData.student_id} onChange={(e) => setFormData({...formData, student_id: e.target.value})} required>
          <option value="">-- Student Select Karein --</option>
          {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        <input type="text" placeholder="Plan Name (e.g. 10AM-6PM Shift)" className="border p-3 rounded-lg" value={formData.plan_name} onChange={(e) => setFormData({...formData, plan_name: e.target.value})} required />
        
        <input type="number" placeholder="Months (e.g. 3)" className="border p-3 rounded-lg" value={formData.duration_months} onChange={(e) => setFormData({...formData, duration_months: e.target.value})} />
        
        <input type="number" placeholder="Price (₹)" className="border p-3 rounded-lg" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} required />
        
        <input type="date" className="border p-3 rounded-lg" value={formData.start_date} onChange={(e) => setFormData({...formData, start_date: e.target.value})} />

        <button type="submit" className="bg-orange-600 text-white font-bold py-3 rounded-lg hover:bg-orange-700 shadow-md">Activate Plan</button>
      </form>

      {/* Active Plans Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-indigo-900 text-white">
            <tr>
              <th className="p-4">Student</th>
              <th className="p-4">Plan</th>
              <th className="p-4">Expiry</th>
              <th className="p-4">Amount</th>
            </tr>
          </thead>
          <tbody>
            {plans.map(p => (
              <tr key={p.id} className="border-b">
                <td className="p-4 font-bold">{p.student_name}</td>
                <td className="p-4">{p.plan_name} ({p.duration_months} Month)</td>
                <td className="p-4 text-red-600 font-bold">{p.expiry_date}</td>
                <td className="p-4 text-green-700 font-black">₹{p.price}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
export default PlanPurchase;
