import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Lock, LogOut, Wallet, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';



function App() {
  // --- 1. STATE MANAGEMENT ---
  const [currentUser, setCurrentUser] = useState(null);
  const [user, setUser] = useState({ wallet_balance: 0, locked_balance: 0 });
  const [circles, setCircles] = useState([]);
  const [history, setHistory] = useState([]);

  // If we are in production (live), use the live link. If not, use localhost.
const API_URL = process.env.NODE_ENV === 'production' 
    ? 'https://your-backend-name.onrender.com' // We will update this later!
    : API_URL + '';
  
  // UI State
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [activeFilter, setActiveFilter] = useState('all');

  // --- 2. DATA LOADING ---
  const refreshData = useCallback(() => {
    if (!currentUser) return;
    axios.get(`http://localhost:5000/user/${currentUser.id}`)
      .then(res => setUser(res.data))
      .catch(err => console.error(err));
      
    axios.get(API_URL + '/circles')
      .then(res => setCircles(res.data))
      .catch(err => console.error(err));

    axios.get(`http://localhost:5000/history/${currentUser.id}`)
      .then(res => setHistory(res.data))
      .catch(err => console.error(err));
  }, [currentUser]);

  // Load user from storage on app start
  useEffect(() => {
    const savedUser = localStorage.getItem('cashflow_user');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  // Fetch data when user logs in
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // --- 3. ACTIONS ---
  const handleAuth = async (e) => {
    e.preventDefault();
    const endpoint = isRegistering ? '/auth/register' : '/auth/login';
    try {
      const res = await axios.post(`http://localhost:5000${endpoint}`, formData);
      localStorage.setItem('cashflow_user', JSON.stringify(res.data));
      setCurrentUser(res.data);
    } catch (err) {
      alert(err.response?.data?.error || "Authentication failed");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('cashflow_user');
    setCurrentUser(null);
    setHistory([]);
    setUser({ wallet_balance: 0, locked_balance: 0 });
  };

  const handleQuickFund = async () => {
    try {
      await axios.post(API_URL + '/fund-test', { userId: currentUser.id, amount: 5000 });
      refreshData();
      alert("Wallet funded! ₦5,000 added.");
    } catch (err) { alert("Funding failed"); }
  };

  const handleWithdraw = async () => {
    const amount = prompt("Enter amount to withdraw:");
    if (!amount) return;

    try {
      const res = await axios.post(API_URL + '/withdraw', { 
        userId: currentUser.id, 
        amount: parseFloat(amount) 
      });
      alert("✅ " + res.data.message);
      refreshData();
    } catch (err) {
      alert("❌ " + (err.response?.data?.error || "Withdrawal failed"));
    }
  };

  const handleJoinCircle = async (circleId, amount) => {
    try {
      await axios.post(API_URL + '/join-circle', { userId: currentUser.id, circleId, amount });
      refreshData();
      alert("Success! You joined the circle.");
    } catch (err) { alert(err.response?.data?.error || "Could not join circle"); }
  };

  // --- 4. RENDER HELPERS ---
  const filteredHistory = history.filter(item => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'payout') return item.status === 'paid_out';
    if (activeFilter === 'contribution') return ['success', 'joined_circle', 'funded', 'withdrawn'].includes(item.status);
    return true;
  });

  // --- 5. SCENE 1: LOGIN SCREEN ---
  if (!currentUser) {
    return (
      <div style={{ maxWidth: '400px', margin: '80px auto', padding: '30px', fontFamily: 'sans-serif' }}>
        <h1 style={{ color: '#0061ff', textAlign: 'center' }}>CashFlow</h1>
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {isRegistering && (
            <input 
              placeholder="Name" 
              value={formData.name}
              onChange={e=>setFormData({...formData, name:e.target.value})} 
              style={{padding:'12px', borderRadius:'8px', border:'1px solid #ddd'}} 
            />
          )}
          <input 
            type="email" placeholder="Email" 
            value={formData.email}
            onChange={e=>setFormData({...formData, email:e.target.value})} 
            style={{padding:'12px', borderRadius:'8px', border:'1px solid #ddd'}} 
          />
          <input 
            type="password" placeholder="Password" 
            value={formData.password}
            onChange={e=>setFormData({...formData, password:e.target.value})} 
            style={{padding:'12px', borderRadius:'8px', border:'1px solid #ddd'}} 
          />
          <button type="submit" style={{padding:'14px', background:'#0061ff', color:'white', border:'none', borderRadius:'8px', fontWeight:'bold', cursor:'pointer'}}>
            {isRegistering ? "Create Account" : "Log In"}
          </button>
        </form>
        <p onClick={() => setIsRegistering(!isRegistering)} style={{textAlign:'center', marginTop:'20px', cursor:'pointer', color:'#666'}}>
          {isRegistering ? "Already have an account? Login" : "New? Create account"}
        </p>
      </div>
    );
  }

  // --- 6. SCENE 2: DASHBOARD ---
  return (
    <div style={{ padding: '20px', maxWidth: '480px', margin: '0 auto', fontFamily: 'sans-serif', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <p style={{ margin: 0, color: '#718096' }}>Welcome back,</p>
          <h2 style={{ margin: 0 }}>{currentUser.name}</h2>
        </div>
        <button onClick={handleLogout} style={{ border: 'none', background: 'none', color: '#e53e3e', cursor:'pointer' }}><LogOut /></button>
      </div>

      {/* WALLET CARD */}
      <div style={{ background: 'linear-gradient(135deg, #0061ff 0%, #60efff 100%)', padding: '25px', borderRadius: '24px', color: 'white', boxShadow: '0 10px 20px rgba(0,97,255,0.2)' }}>
        <p style={{margin:0, opacity:0.8}}>Total Balance</p>
        <h1 style={{fontSize:'36px', margin:'10px 0'}}>₦{Number(user?.wallet_balance || 0).toLocaleString()}</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleQuickFund} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: 'rgba(255,255,255,0.2)', color: 'white', cursor:'pointer' }}>+ Fund</button>
          <button onClick={handleWithdraw} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: 'white', color: '#0061ff', fontWeight: 'bold', cursor:'pointer' }}>Withdraw</button>
        </div>
      </div>

      {/* LOCKED BALANCE */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '20px', color: '#4a5568', padding: '0 5px' }}>
        <Lock size={16} color="#718096" /> 
        <span style={{ fontSize: '14px', fontWeight: '500' }}>
          Locked Savings: <span style={{ color: '#2d3748' }}>₦{Number(user?.locked_balance || 0).toLocaleString()}</span>
        </span>
      </div>

      {/* CIRCLES LIST */}
      <h3 style={{ marginTop: '30px' }}>Active Savings Circles</h3>
      {circles.map(c => {
        const goal = 10000;
        const progress = Math.min((c.current_savings / goal) * 100, 100);
        return (
          <div key={c.id} style={{ background: 'white', padding: '20px', borderRadius: '20px', marginBottom: '15px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <strong>{c.name}</strong>
              <span style={{ color: '#0061ff', fontWeight: 'bold' }}>₦{c.contribution_amount}</span>
            </div>
            <div style={{ width: '100%', height: '10px', backgroundColor: '#edf2f7', borderRadius: '5px', overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', backgroundColor: '#0061ff', transition: 'width 0.8s ease-in-out' }}></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '8px', color: '#718096' }}>
              <span>Progress: {Math.round(progress)}%</span>
              <span>₦{Number(c.current_savings || 0).toLocaleString()} / ₦{Number(goal).toLocaleString()}</span>
            </div>
            <button onClick={() => handleJoinCircle(c.id, c.contribution_amount)} style={{ width: '100%', marginTop: '15px', padding: '12px', borderRadius: '12px', border: 'none', background: '#ebf4ff', color: '#0061ff', fontWeight: 'bold', cursor:'pointer' }}>Join Circle</button>
          </div>
        );
      })}

      {/* HISTORY & FILTER */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'30px'}}>
        <h3>Activity</h3>
        <div style={{display:'flex', gap:'5px'}}>
          {['all', 'contribution', 'payout'].map(type => (
            <button 
              key={type}
              onClick={() => setActiveFilter(type)}
              style={{
                fontSize:'11px', padding:'5px 10px', borderRadius:'20px', border:'none',
                background: activeFilter === type ? '#0061ff' : '#eee',
                color: activeFilter === type ? 'white' : '#666',
                cursor:'pointer'
              }}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '20px', padding: '10px', marginTop:'10px' }}>
        {filteredHistory.length > 0 ? filteredHistory.map((h, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', borderBottom: '1px solid #f8f9fa' }}>
            <div style={{display:'flex', gap:'12px', alignItems:'center'}}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: h.amount < 0 ? '#fff5f5' : '#f0fff4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {h.amount < 0 ? <ArrowDownCircle size={20} color="#e53e3e"/> : <ArrowUpCircle size={20} color="#48bb78"/>}
              </div>
              <div>
                <div style={{fontWeight:'bold', fontSize:'14px', color:'#2d3748'}}>{h.circle_name || "Wallet Transaction"}</div>
                <div style={{fontSize:'11px', color:'#a0aec0'}}>
                  {new Date(h.created_at).toLocaleDateString()} • {h.status}
                </div>
              </div>
            </div>
            <div style={{ fontWeight: 'bold', color: h.amount < 0 ? '#e53e3e' : '#48bb78' }}>
                {h.amount < 0 ? '-' : '+'}₦{Math.abs(h.amount).toLocaleString()}
            </div>
          </div>
        )) : <p style={{textAlign:'center', color:'#a0aec0', padding:'20px'}}>No activity found</p>}
      </div>

    </div>
  );
}

export default App;