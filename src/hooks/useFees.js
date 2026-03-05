import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

export const useFees = () => {
  const [feesHistory, setFeesHistory] = useState([]);
  const API_URL = "https://library-api.raghuveerbhati525.workers.dev";
  const token = localStorage.getItem('adminToken');

  // Callback hook taaki baar-baar function re-render na ho
  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/fees/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFeesHistory(data);
      }
    } catch (error) {
      toast.error("Fees history load nahi ho payi");
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchHistory();
  }, [token, fetchHistory]);

  return { feesHistory, fetchHistory };
};
