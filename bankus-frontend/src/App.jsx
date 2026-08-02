import React, { useState, useEffect } from 'react';
import './App.css';
import { showSuccess, showError, showConfirm } from './utils/alert';

function App() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLoginView, setIsLoginView] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('client');
  const [errorMsg, setErrorMsg] = useState('');
  const [loggedInUser, setLoggedInUser] = useState(null);

  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [transactionHistory, setTransactionHistory] = useState([]);

  const [showAdminModal, setShowAdminModal] = useState(false);
  const [clientList, setClientList] = useState([]);
  const [editingClient, setEditingClient] = useState(null);
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editBalance, setEditBalance] = useState('');
  const [editStatus, setEditStatus] = useState('');

  const API_BASE_URL = 'https://web-production-a6006.up.railway.app';

  const openLogin = () => {
    setIsLoginView(true);
    setErrorMsg('');
    setShowAuthModal(true);
    setMobileMenuOpen(false);
  };

  const openRegister = () => {
    setIsLoginView(false);
    setErrorMsg('');
    setShowAuthModal(true);
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    setLoggedInUser(null);
    setShowAdminModal(false);
    setShowDepositModal(false);
    setShowWithdrawModal(false);
    setShowTransferModal(false);
    setShowHistoryModal(false);
    showSuccess('Logged out successfully!');
  };

  const fetchClientHistory = async (uname) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/client/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: uname })
      });
      const data = await response.json();
      if (data.success) {
        setTransactionHistory(data.history);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAdminClients = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/clients`);
      const data = await response.json();
      if (data.success) {
        setClientList(data.clients);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username || !password) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    if (!isLoginView && password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    const endpoint = isLoginView 
      ? `${API_BASE_URL}/api/login` 
      : `${API_BASE_URL}/api/register`;

    const payload = isLoginView 
      ? { username, password }
      : { username, password, role };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        if (isLoginView) {
          showSuccess(`Welcome back, ${data.user.username}!`, `${data.user.role.toUpperCase()}`);
          setLoggedInUser(data.user);
          if (data.user.role === 'admin') {
            fetchAdminClients();
          } else {
            fetchClientHistory(data.user.username);
          }
        } else {
          showSuccess('Registration successful!', 'Please log in.');
          setIsLoginView(true);
        }

        setShowAuthModal(false);
        setUsername('');
        setPassword('');
        setConfirmPassword('');
      } else {
        setErrorMsg(data.message || 'Authentication failed.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Cannot connect to Railway server.');
    }
  };

  const handleTransaction = async (type) => {
    if (!amount || Number(amount) <= 0) {
      showError('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    let endpoint = '';
    let payload = { username: loggedInUser.username, amount: Number(amount) };

    if (type === 'deposit') {
      endpoint = `${API_BASE_URL}/api/client/deposit`;
    } else if (type === 'withdraw') {
      endpoint = `${API_BASE_URL}/api/client/withdraw`;
    } else if (type === 'transfer') {
      if (!recipient) {
        showError('Recipient Required', 'Please enter recipient username');
        return;
      }
      endpoint = `${API_BASE_URL}/api/client/transfer`;
      payload = { sender: loggedInUser.username, recipient, amount: Number(amount) };
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();

      if (response.ok) {
        showSuccess('Success', data.message);
        setLoggedInUser({ ...loggedInUser, balance: data.balance !== undefined ? data.balance : loggedInUser.balance });
        setAmount('');
        setRecipient('');
        setShowDepositModal(false);
        setShowWithdrawModal(false);
        setShowTransferModal(false);
        fetchClientHistory(loggedInUser.username);
      } else {
        showError('Transaction Failed', data.message || 'Transaction failed.');
      }
    } catch (err) {
      console.error(err);
      showError('Connection Error', 'Connection error.');
    }
  };

  const handleUpdateClient = async (oldUsername) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/client/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          old_username: oldUsername, 
          new_username: editUsername, 
          new_password: editPassword, 
          balance: Number(editBalance), 
          status: editStatus 
        })
      });
      const data = await response.json();
      if (response.ok) {
        showSuccess('Updated', data.message);
        setEditingClient(null);
        fetchAdminClients();
      } else {
        showError('Update Failed', data.message || 'Failed to update client');
      }
    } catch (err) {
      console.error(err);
      showError('Connection Error', 'Connection error.');
    }
  };

  const handleDeleteClient = async (clientUsername) => {
    showConfirm('Are you sure?', `Are you sure you want to delete ${clientUsername}?`, 'Yes, delete').then(async (result) => {
      if (result.isConfirmed) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/admin/client/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: clientUsername })
          });
          const data = await response.json();
          if (response.ok) {
            showSuccess('Deleted', data.message);
            fetchAdminClients();
          } else {
            showError('Error', data.message);
          }
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  const totalSystemBalance = clientList.reduce((acc, client) => acc + Number(client.balance || 0), 0);
  const activeClientsCount = clientList.filter(client => (client.status || 'Active') === 'Active').length;

  return (
    <div className="app-wrapper">
      <div className="hero-landing">
        <header className="hero-nav">
          <div className="hero-logo">
            <span className="logo-icon">❖</span> Bank<span>Us</span>
          </div>

          {!loggedInUser && (
            <nav className="hero-menu">
              <a href="#about">About us</a>
              <a href="#products">Products</a>
              <a href="#benefits">Benefits</a>
              <a href="#pricing">Pricing</a>
            </nav>
          )}

          <div className="hero-auth-btns">
            {loggedInUser ? (
              <div className="user-profile-badge" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '0.9rem', color: '#34d399', fontWeight: '600' }}>
                  👤 {loggedInUser.username} ({loggedInUser.role.toUpperCase()})
                </span>
                <button className="btn-hero-login" onClick={handleLogout}>Logout</button>
              </div>
            ) : (
              <>
                <button className="btn-hero-login" onClick={openLogin}>Log in</button>
                <button className="btn-hero-start" onClick={openRegister}>Get started</button>
              </>
            )}
            
            {!loggedInUser && (
              <button 
                className="hamburger-btn" 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle Navigation"
              >
                {mobileMenuOpen ? '✕' : '☰'}
              </button>
            )}
          </div>
        </header>

        {!loggedInUser && (
          <div className={`mobile-nav-drawer ${mobileMenuOpen ? 'open' : ''}`}>
            <a href="#about" onClick={() => setMobileMenuOpen(false)}>About us</a>
            <a href="#products" onClick={() => setMobileMenuOpen(false)}>Products</a>
            <a href="#benefits" onClick={() => setMobileMenuOpen(false)}>Benefits</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
          </div>
        )}

        <main className="hero-content">
          <div className="hero-text-side">
            <div className="category-tag">MONEY & FINANCIAL LITERACY</div>
            <h2 className="hero-subtitle">Let's save your bank</h2>
            <p className="hero-description">
              We provide smart financial management tips, real-time fund transfers, and dynamic asset tracking with zero hidden fees.
            </p>
            
            {loggedInUser && (
              <div className="dashboard-controls" style={{ display: 'flex', justifyContent: loggedInUser.role === 'admin' ? 'center' : 'flex-start' }}>
                <div className="client-action-grid" style={loggedInUser.role === 'admin' ? { display: 'flex', justifyContent: 'center', width: '100%', gap: '12px' } : {}}>
                  {loggedInUser.role === 'client' ? (
                    <>
                      <button className="btn-dash-action" onClick={() => setShowDepositModal(true)}>➕ Deposit</button>
                      <button className="btn-dash-action" onClick={() => setShowWithdrawModal(true)}>➖ Withdraw</button>
                      <button className="btn-dash-action history" onClick={() => setShowHistoryModal(true)}>View Transaction History</button>
                      <button className="btn-dash-action history" style={{background: 'rgba(59, 130, 246, 0.2)', borderColor: '#3b82f6'}} onClick={() => setShowTransferModal(true)}>💸 Transfer Funds</button>
                    </>
                  ) : (
                    <>
                      <button className="btn-dash-action admin" onClick={() => setShowAdminModal(true)}>Client Manager</button>
                      <button className="btn-dash-action admin" style={{background: 'rgba(59, 130, 246, 0.2)', borderColor: '#3b82f6'}} onClick={() => {
                        const section = document.getElementById('admin-dashboard-section');
                        if(section) section.scrollIntoView({ behavior: 'smooth' });
                      }}>View Dashboard</button>
                    </>
                  )}
                </div>
              </div>
            )}

            {!loggedInUser && (
              <div className="hero-cta-group" style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '24px' }}>
                <button 
                  className="btn-circle-cta" 
                  onClick={openRegister}
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    background: '#10b981',
                    color: '#0b0f19',
                    border: 'none',
                    fontSize: '1.2rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 0 15px rgba(16, 185, 129, 0.4)',
                    transition: 'transform 0.2s ease, background 0.2s ease'
                  }}
                >→</button>
                <a 
                  href="#about" 
                  className="cta-text-link"
                  style={{
                    color: '#34d399',
                    textDecoration: 'none',
                    fontWeight: '600',
                    fontSize: '0.95rem',
                    letterSpacing: '0.5px',
                    transition: 'color 0.2s ease'
                  }}
                >learn more</a>
              </div>
            )}
          </div>

          <div className="hero-visual-side">
            <div className="card-glowing-backdrop"></div>
            <div className="glass-bank-card">
              <div className="card-top">
                <div className="card-chip"></div>
                <div className="card-brand">Bank<span>Us</span></div>
              </div>
              <div className="card-number" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                <small style={{ fontSize: '0.65rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>Balance</small>
                <span>{loggedInUser && loggedInUser.role === 'client' 
                  ? `₱ ${Number(loggedInUser.balance || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}` 
                  : loggedInUser && loggedInUser.role === 'admin'
                  ? `₱ ${Number(totalSystemBalance).toLocaleString('en-US', {minimumFractionDigits: 2})}`
                  : '5337 •••• •••• 3294'}</span>
              </div>
              <div className="card-bottom">
                <div className="card-holder">
                  <small>Card Holder</small>
                  <strong>{loggedInUser ? loggedInUser.username.toUpperCase() : 'GUEST USER'}</strong>
                </div>
                <div className="card-expiry">
                  <small>{loggedInUser && loggedInUser.role === 'client' ? 'Account Status' : loggedInUser && loggedInUser.role === 'admin' ? 'Total Users' : 'Exp. Date'}</small>
                  <strong>{loggedInUser && loggedInUser.role === 'client' ? (loggedInUser.status || 'Active') : loggedInUser && loggedInUser.role === 'admin' ? `${clientList.length} Accounts` : '08/28'}</strong>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {loggedInUser && loggedInUser.role === 'client' && (
        <section className="content-section dark-alt client-dashboard-panel" style={{ borderTop: '1px solid rgba(16, 185, 129, 0.2)' }}>
          <div className="section-container" style={{ maxWidth: '1100px', margin: '0 auto', textAlign: 'left' }}>
            <div className="section-badge">CLIENT DASHBOARD</div>
            <h2 className="section-title" style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Welcome back, {loggedInUser.username}!</h2>
            <p className="section-desc" style={{ margin: '0 0 24px 0', textAlign: 'left', padding: 0 }}>
              Here is a quick overview of your account activity, financial health, and quick actions.
            </p>

            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '30px' }}>
              <div className="stat-card" style={{ background: 'rgba(31, 41, 55, 0.6)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <span style={{ fontSize: '0.8rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: '600' }}>Total Balance</span>
                <h3 style={{ fontSize: '1.8rem', color: '#10b981', marginTop: '6px' }}>
                  ₱{Number(loggedInUser.balance || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#34d399', marginTop: '4px' }}>✓ Available for transfer & withdrawal</p>
              </div>

              <div className="stat-card" style={{ background: 'rgba(31, 41, 55, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <span style={{ fontSize: '0.8rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: '600' }}>Account Status</span>
                <h3 style={{ fontSize: '1.5rem', color: '#fff', marginTop: '6px' }}>
                  <span className={`status-pill ${(loggedInUser.status || 'Active').toLowerCase()}`} style={{ fontSize: '0.9rem', padding: '4px 12px' }}>
                    {loggedInUser.status || 'Active'}
                  </span>
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '4px' }}>Fully verified banking tier</p>
              </div>

              <div className="stat-card" style={{ background: 'rgba(31, 41, 55, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <span style={{ fontSize: '0.8rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: '600' }}>Total Transactions</span>
                <h3 style={{ fontSize: '1.8rem', color: '#3b82f6', marginTop: '6px' }}>
                  {transactionHistory.length} Recorded
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '4px' }}>Real-time logs synchronized</p>
              </div>
            </div>

            <div className="dashboard-sub-section" style={{ background: 'rgba(31, 41, 55, 0.4)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ fontSize: '1.1rem', color: '#fff' }}>⚡ Recent Activity Snapshot</h4>
                <button 
                  onClick={() => setShowHistoryModal(true)}
                  style={{ background: 'transparent', border: 'none', color: '#10b981', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}
                >
                  View All →
                </button>
              </div>
              
              <div className="table-wrapper" style={{ maxHeight: '200px' }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Date / Time</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactionHistory.length > 0 ? (
                      transactionHistory.slice(0, 3).map((tx, idx) => (
                        <tr key={idx}>
                          <td>{new Date(tx.created_at).toLocaleString()}</td>
                          <td><span className={`type-tag ${tx.type.toLowerCase().replace(' ', '-')}`}>{tx.type}</span></td>
                          <td>₱{Number(tx.amount).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                          <td>{tx.details}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: '15px', color: '#9ca3af' }}>No recent activity found. Make a deposit or transfer to get started!</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </section>
      )}

      {loggedInUser && loggedInUser.role === 'admin' && (
        <section id="admin-dashboard-section" className="content-section dark-alt admin-dashboard-panel" style={{ borderTop: '1px solid rgba(59, 130, 246, 0.2)' }}>
          <div className="section-container" style={{ maxWidth: '1100px', margin: '0 auto', textAlign: 'left' }}>
            <div className="section-badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>ADMINISTRATOR CONTROL CENTER</div>
            <h2 className="section-title" style={{ fontSize: '1.8rem', marginBottom: '8px' }}>System Command Hub</h2>
            <p className="section-desc" style={{ margin: '0 0 24px 0', textAlign: 'left', padding: 0 }}>
              Live metrics, system statistics, and user account management overview for administrator <span style={{ color: '#3b82f6', fontWeight: '600' }}>{loggedInUser.username}</span>.
            </p>

            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '30px' }}>
              <div className="stat-card" style={{ background: 'rgba(31, 41, 55, 0.6)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                <span style={{ fontSize: '0.8rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: '600' }}>Total System Assets</span>
                <h3 style={{ fontSize: '1.5rem', color: '#3b82f6', marginTop: '6px' }}>
                  ₱{Number(totalSystemBalance).toLocaleString('en-US', {minimumFractionDigits: 2})}
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '4px' }}>Combined client balances</p>
              </div>

              <div className="stat-card" style={{ background: 'rgba(31, 41, 55, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <span style={{ fontSize: '0.8rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: '600' }}>Registered Clients</span>
                <h3 style={{ fontSize: '1.8rem', color: '#fff', marginTop: '6px' }}>
                  {clientList.length}
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '4px' }}>Total client accounts</p>
              </div>

              <div className="stat-card" style={{ background: 'rgba(31, 41, 55, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <span style={{ fontSize: '0.8rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: '600' }}>Active Status</span>
                <h3 style={{ fontSize: '1.8rem', color: '#10b981', marginTop: '6px' }}>
                  {activeClientsCount}
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#34d399', marginTop: '4px' }}>Operational accounts</p>
              </div>

              <div className="stat-card" style={{ background: 'rgba(31, 41, 55, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <span style={{ fontSize: '0.8rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: '600' }}>System Health</span>
                <h3 style={{ fontSize: '1.5rem', color: '#10b981', marginTop: '6px' }}>
                  100% OK
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '4px' }}>Database connected</p>
              </div>
            </div>

            <div className="dashboard-sub-section" style={{ background: 'rgba(31, 41, 55, 0.4)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ fontSize: '1.1rem', color: '#fff' }}>👥 Registered Accounts Summary</h4>
                <button 
                  onClick={() => setShowAdminModal(true)}
                  style={{ background: '#3b82f6', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}
                >
                  Open Full Client Manager →
                </button>
              </div>
              
              <div className="table-wrapper" style={{ maxHeight: '220px' }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Balance</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientList.length > 0 ? (
                      clientList.slice(0, 4).map((client) => (
                        <tr key={client.username}>
                          <td><strong>{client.username}</strong></td>
                          <td>₱{Number(client.balance || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                          <td><span className={`status-pill ${(client.status || 'Active').toLowerCase()}`}>{client.status || 'Active'}</span></td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3" style={{ textAlign: 'center', padding: '15px', color: '#9ca3af' }}>No registered client accounts found in the system.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </section>
      )}

      {!loggedInUser && (
        <section id="about" className="content-section">
          <div className="section-container">
            <div className="section-badge">ABOUT BANKUS</div>
            <h2 className="section-title">Next-Gen Digital Banking</h2>
            <p className="section-desc">
              BankUs is built on the mission of driving financial inclusion and transparency. 
              We eliminate outdated banking bureaucracy with fast, secure, and modern digital finance solutions.
            </p>

            <div className="stats-grid">
              <div className="stat-card">
                <h3>2.5M+</h3>
                <p>Active Users</p>
              </div>
              <div className="stat-card">
                <h3>₱500k</h3>
                <p>PDIC Insured / Depositor</p>
              </div>
              <div className="stat-card">
                <h3>99.9%</h3>
                <p>Uptime & Reliability</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {!loggedInUser && (
        <section id="products" className="content-section dark-alt">
          <div className="section-container">
            <div className="section-badge">OUR PRODUCTS</div>
            <h2 className="section-title">Everything you need to grow wealth</h2>

            <div className="products-grid">
              <div className="product-card">
                <div className="product-icon">🏦</div>
                <h3>High-Yield Savings</h3>
                <p>Grow your savings faster with up to 6.0% p.a. daily credited interest without lock-ins.</p>
              </div>

              <div className="product-card">
                <div className="product-icon">💳</div>
                <h3>Virtual & Physical Cards</h3>
                <p>Generate instant virtual cards for secure online shopping or order a physical Visa debit card.</p>
              </div>

              <div className="product-card">
                <div className="product-icon">⚡</div>
                <h3>Instant Transfers</h3>
                <p>Send and receive money instantly across any local bank via InstaPay or QR Ph.</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {!loggedInUser && (
        <section id="benefits" className="content-section">
          <div className="section-container">
            <div className="section-badge">WHY CHOOSE US</div>
            <h2 className="section-title">Built for your financial peace of mind</h2>

            <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginTop: '30px' }}>
              <div className="feature-item" style={{ background: 'rgba(31, 41, 55, 0.4)', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '20px', borderRadius: '14px', textAlign: 'left' }}>
                <div className="feature-icon" style={{ fontSize: '2rem', marginBottom: '10px' }}>🛡️</div>
                <div className="feature-text">
                  <h4 style={{ color: '#fff', marginBottom: '6px' }}>Bank-Grade Security</h4>
                  <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>256-bit encryption, biometric authentication, and AI fraud protection monitor your account 24/7.</p>
                </div>
              </div>
              <div className="feature-item" style={{ background: 'rgba(31, 41, 55, 0.4)', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '20px', borderRadius: '14px', textAlign: 'left' }}>
                <div className="feature-icon" style={{ fontSize: '2rem', marginBottom: '10px' }}>📊</div>
                <div className="feature-text">
                  <h4 style={{ color: '#fff', marginBottom: '6px' }}>Smart Budget Analytics</h4>
                  <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Automatically categorize your spendings and set daily budget thresholds hassle-free.</p>
                </div>
              </div>
              <div className="feature-item" style={{ background: 'rgba(31, 41, 55, 0.4)', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '20px', borderRadius: '14px', textAlign: 'left' }}>
                <div className="feature-icon" style={{ fontSize: '2rem', marginBottom: '10px' }}>💬</div>
                <div className="feature-text">
                  <h4 style={{ color: '#fff', marginBottom: '6px' }}>24/7 Human Support</h4>
                  <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Get instant response from our dedicated customer support team whenever you need help.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {!loggedInUser && (
        <section id="pricing" className="content-section dark-alt">
          <div className="section-container">
            <div className="section-badge">TRANSPARENT RATES</div>
            <h2 className="section-title">Simple accounts, zero hidden fees</h2>

            <div className="pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px', maxWidth: '850px', margin: '30px auto 0' }}>
              <div className="pricing-card" style={{ background: 'rgba(31, 41, 55, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '30px', textAlign: 'center' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '10px' }}>Basic Account</h3>
                <div className="price" style={{ fontSize: '2.5rem', fontWeight: '800', color: '#10b981', marginBottom: '10px' }}>₱0 <span style={{ fontSize: '1rem', color: '#9ca3af' }}>/ month</span></div>
                <p className="pricing-subtitle" style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '20px' }}>Perfect for everyday personal transactions.</p>
                <ul className="pricing-features" style={{ listStyle: 'none', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '25px', color: '#e5e7eb', fontSize: '0.9rem' }}>
                  <li>✓ Zero maintaining balance</li>
                  <li>✓ Free BankUs-to-BankUs transfers</li>
                  <li>✓ Daily transfer limit: ₱50,000</li>
                  <li>✓ Standard 3.5% p.a. Savings Interest</li>
                </ul>
                <button className="btn-outline" onClick={openRegister} style={{ background: 'transparent', border: '1px solid #10b981', color: '#10b981', padding: '10px 20px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', width: '100%' }}>Open Basic</button>
              </div>

              <div className="pricing-card featured" style={{ background: 'rgba(31, 41, 55, 0.8)', border: '1px solid #10b981', borderRadius: '16px', padding: '30px', textAlign: 'center', position: 'relative' }}>
                <div className="featured-tag" style={{ background: '#10b981', color: '#0b0f19', fontSize: '0.7rem', fontWeight: '800', padding: '4px 10px', borderRadius: '20px', display: 'inline-block', marginBottom: '10px' }}>MOST POPULAR</div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '10px' }}>Verified Pro</h3>
                <div className="price" style={{ fontSize: '2.5rem', fontWeight: '800', color: '#10b981', marginBottom: '10px' }}>₱0 <span style={{ fontSize: '1rem', color: '#9ca3af' }}>/ month</span></div>
                <p className="pricing-subtitle" style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '20px' }}>For power users requiring higher transfer limits.</p>
                <ul className="pricing-features" style={{ listStyle: 'none', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '25px', color: '#e5e7eb', fontSize: '0.9rem' }}>
                  <li>✓ Zero maintaining balance</li>
                  <li>✓ 5 Free InstaPay transfers / month</li>
                  <li>✓ Daily transfer limit: ₱500,000</li>
                  <li>✓ High-Yield 6.0% p.a. Savings Interest</li>
                  <li>✓ Free Physical Visa Card</li>
                </ul>
                <button className="btn-primary" onClick={openRegister} style={{ width: '100%', marginTop: '0' }}>Get Verified Pro</button>
              </div>
            </div>
          </div>
        </section>
      )}

      {!loggedInUser && (
        <footer className="app-footer">
          <p>© 2026 BankUs Digital Banking Inc. Regulated by BSP. Deposits insured by PDIC up to ₱500,000.</p>
        </footer>
      )}

      {showAuthModal && (
        <div className="modal-overlay" onClick={() => setShowAuthModal(false)}>
          <div className="card-deck-container" onClick={(e) => e.stopPropagation()}>

            <div className={`modal-card card-stacked ${isLoginView ? 'active-card' : 'behind-card'}`}>
              <button className="modal-close-btn" onClick={() => setShowAuthModal(false)}>✕</button>
              <h2>Welcome Back!</h2>
              <p className="subtitle">Login to access your BankUs account</p>

              {errorMsg && isLoginView && <div className="error-badge">{errorMsg}</div>}

              <form onSubmit={handleAuthSubmit}>
                <div className="input-group">
                  <label>Username</label>
                  <input 
                    type="text" 
                    placeholder="e.g. zhyrus" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label>Password</label>
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn-primary">Log In</button>
              </form>

              <div className="switch-text">
                Don't have an account? <span onClick={() => { setIsLoginView(false); setErrorMsg(''); }}>Create account</span>
              </div>
            </div>

            <div className={`modal-card card-stacked ${!isLoginView ? 'active-card' : 'behind-card'}`}>
              <button className="modal-close-btn" onClick={() => setShowAuthModal(false)}>✕</button>
              <h2>Create Account</h2>
              <p className="subtitle">Join BankUs for smart financial tracking</p>

              {errorMsg && !isLoginView && <div className="error-badge">{errorMsg}</div>}

              <form onSubmit={handleAuthSubmit}>
                <div className="input-group">
                  <label>Username</label>
                  <input 
                    type="text" 
                    placeholder="Enter username" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label>Password</label>
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label>Confirm Password</label>
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn-primary">Sign Up</button>
              </form>

              <div className="switch-text">
                Already have an account? <span onClick={() => { setIsLoginView(true); setErrorMsg(''); }}>Log in</span>
              </div>
            </div>

          </div>
        </div>
      )}

      {showDepositModal && (
        <div className="modal-overlay" onClick={() => setShowDepositModal(false)}>
          <div className="custom-modal-box" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowDepositModal(false)}>✕</button>
            <h3 className="modal-heading">Deposit Funds</h3>
            <div className="input-group">
              <label>Amount (₱)</label>
              <input type="number" placeholder="Enter amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <button className="btn-primary" onClick={() => handleTransaction('deposit')}>Confirm Deposit</button>
          </div>
        </div>
      )}

      {showWithdrawModal && (
        <div className="modal-overlay" onClick={() => setShowWithdrawModal(false)}>
          <div className="custom-modal-box" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowWithdrawModal(false)}>✕</button>
            <h3 className="modal-heading">Withdraw Funds</h3>
            <div className="input-group">
              <label>Amount (₱)</label>
              <input type="number" placeholder="Enter amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <button className="btn-primary" onClick={() => handleTransaction('withdraw')}>Confirm Withdrawal</button>
          </div>
        </div>
      )}

      {showTransferModal && (
        <div className="modal-overlay" onClick={() => setShowTransferModal(false)}>
          <div className="custom-modal-box" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowTransferModal(false)}>✕</button>
            <h3 className="modal-heading">Transfer Funds</h3>
            <div className="input-group">
              <label>Recipient Username</label>
              <input type="text" placeholder="e.g. zhyrus" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
            </div>
            <div className="input-group">
              <label>Amount (₱)</label>
              <input type="number" placeholder="Enter amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <button className="btn-primary" onClick={() => handleTransaction('transfer')}>Send Transfer</button>
          </div>
        </div>
      )}

      {showHistoryModal && (
        <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}>
          <div className="custom-modal-box wide" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowHistoryModal(false)}>✕</button>
            <h3 className="modal-heading">Transaction History</h3>
            <div className="table-wrapper">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Date / Time</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {transactionHistory.length > 0 ? (
                    transactionHistory.map((tx, idx) => (
                      <tr key={idx}>
                        <td>{new Date(tx.created_at).toLocaleString()}</td>
                        <td><span className={`type-tag ${tx.type.toLowerCase().replace(' ', '-')}`}>{tx.type}</span></td>
                        <td>₱{Number(tx.amount).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                        <td>{tx.details}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>No transactions found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showAdminModal && (
        <div className="modal-overlay" onClick={() => setShowAdminModal(false)}>
          <div className="custom-modal-box extra-wide" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowAdminModal(false)}>✕</button>
            <h3 className="modal-heading">Admin Client Manager</h3>
            <div className="table-wrapper">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Password</th>
                    <th>Balance</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clientList.length > 0 ? (
                    clientList.map((client) => (
                      <tr key={client.username}>
                        <td>
                          {editingClient === client.username ? (
                            <input 
                              type="text" 
                              className="inline-input"
                              value={editUsername} 
                              onChange={(e) => setEditUsername(e.target.value)} 
                            />
                          ) : (
                            <strong>{client.username}</strong>
                          )}
                        </td>
                        <td>
                          {editingClient === client.username ? (
                            <input 
                              type="text" 
                              className="inline-input"
                              placeholder="New Password"
                              value={editPassword} 
                              onChange={(e) => setEditPassword(e.target.value)} 
                            />
                          ) : (
                            <span style={{ color: '#9ca3af' }}>••••••••</span>
                          )}
                        </td>
                        <td>
                          {editingClient === client.username ? (
                            <input 
                              type="number" 
                              className="inline-input"
                              value={editBalance} 
                              onChange={(e) => setEditBalance(e.target.value)} 
                            />
                          ) : (
                            `₱${Number(client.balance || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`
                          )}
                        </td>
                        <td>
                          {editingClient === client.username ? (
                            <select 
                              className="inline-select"
                              value={editStatus} 
                              onChange={(e) => setEditStatus(e.target.value)}
                            >
                              <option value="Active">Active</option>
                              <option value="Inactive">Inactive</option>
                              <option value="Dormant">Dormant</option>
                            </select>
                          ) : (
                            <span className={`status-pill ${(client.status || 'Active').toLowerCase()}`}>
                              {client.status || 'Active'}
                            </span>
                          )}
                        </td>
                        <td>
                          {editingClient === client.username ? (
                            <div className="btn-group-sm">
                              <button className="btn-sm save" onClick={() => handleUpdateClient(client.username)}>Save</button>
                              <button className="btn-sm cancel" onClick={() => setEditingClient(null)}>Cancel</button>
                            </div>
                          ) : (
                            <div className="btn-group-sm">
                              <button className="btn-sm edit" onClick={() => {
                                setEditingClient(client.username);
                                setEditUsername(client.username);
                                setEditPassword('');
                                setEditBalance(client.balance);
                                setEditStatus(client.status || 'Active');
                              }}>Edit</button>
                              <button className="btn-sm delete" onClick={() => handleDeleteClient(client.username)}>Delete</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>No clients found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;