import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

function PlanPurchase() {
  const [students, setStudents] = useState([]);
  const [plans, setPlans] = useState([]);
  const [formData, setFormData] = useState({
    student_id: '',
    plan_name: '',
    duration_months: 1,
    price: '',
    start_date: new Date().toISOString().split('T')[0]
  });

  const API_URL = "https://library-api.raghuveerbhati525.workers.dev";
  const token = localStorage.getItem('adminToken');

  const fetchPlans = () => {
    fetch(`${API_URL}/api/plans/history`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json()).then(data => setPlans(Array.isArray(data) ? data : []));
  };

  useEffect(() => {
    fetch(`${API_URL}/api/students`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json()).then(data => setStudents(data));
    fetchPlans();
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
      setFormData({ ...formData, student_id: '', plan_name: '', price: '' });
      fetchPlans();
    }
  };

  const handleDeletePlan = async (id) => {
    if(window.confirm("Plan delete karein?")) {
      const res = await fetch(`${API_URL}/api/plans/delete/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if(res.ok) {
        toast.success("Plan Deleted! 🗑️");
        fetchPlans();
      }
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Header with Back Button */}
      <div className="flex justify-between items-center max-w-7xl mx-auto mb-6 bg-white p-4 rounded-lg shadow-sm border-b-4 border-orange-600">
        <h1 className="text-2xl font-black text-orange-700 uppercase">📦 Plan Purchase</h1>
        <Link to="/dashboard" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold shadow-md hover:bg-blue-700">
          ← Back to Dashboard
        </Link>
      </div>

      <form onSubmit={handlePurchase} className="bg-white p-6 rounded-xl shadow-lg grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 border-t-8 border-orange-500">
        <select className="border-2 p-3 rounded-lg" value={formData.student_id} onChange={(e) => setFormData({...formData, student_id: e.target.value})} required>
          <option value="">-- Select Student --</option>
          {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input type="text" placeholder="Plan Name (e.g. Morning)" className="border-2 p-3 rounded-lg" value={formData.plan_name} onChange={(e) => setFormData({...formData, plan_name: e.target.value})} required />
        <input type="number" placeholder="Price (₹)" className="border-2 p-3 rounded-lg" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} required />
        <button type="submit" className="bg-orange-600 text-white font-black py-3 rounded-lg shadow-md md:col-span-3 uppercase">Activate Plan</button>
      </form>

      <div className="bg-white rounded-xl shadow-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-800 text-white">
            <tr>
              <th className="p-4">Student</th>
              <th className="p-4">Plan Details</th>
              <th className="p-4">Expiry</th>
              <th className="p-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {plans.map(p => (
              <tr key={p.id} className="hover:bg-orange-50">
                <td className="p-4 font-black">{p.student_name}</td>
                <td className="p-4 text-sm">{p.plan_name} (₹{p.price})</td>
                <td className="p-4 text-red-600 font-bold">{p.expiry_date}</td>
                <td className="p-4 text-center">
                  <button onClick={() => handleDeletePlan(p.id)} className="bg-red-100 text-red-700 px-3 py-1 rounded font-black text-xs hover:bg-red-200">DELETE</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
export default PlanPurchase;
