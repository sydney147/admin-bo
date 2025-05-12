import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import axios from 'axios';
import './Login.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false); // Added loading state
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        localStorage.setItem('userId', user.uid);
        const success = await fetchShopId(user.uid);
        if (success) navigate('/home');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const fetchShopId = async (userId) => {
    try {
      const res = await axios.get('https://fastapi-service-830671346894.asia-southeast1.run.app/shops', {
        headers: { Accept: 'application/json' }
      });

      if (!Array.isArray(res.data)) return false;

      const shop = res.data.find((s) => s.ownerId === userId);
      if (shop) {
        localStorage.setItem('shopId', shop.shopId);
        localStorage.setItem('storeName', shop.storeName);
        localStorage.setItem('userId', userId);
        return true;
      } else {
        setError('No matching shop found for this user.');
        return false;
      }
    } catch (err) {
      setError('Could not load shop data. Please try again.');
      return false;
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true); // Set loading to true

    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const userId = userCred.user.uid;
      localStorage.setItem('userId', userId);
      const success = await fetchShopId(userId);
      if (success) navigate('/home');
    } catch (err) {
      setError('Invalid email or password.');
    } finally {
      setLoading(false); // Set loading to false after login attempt
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo-section">
          <img src="/images/login-logo.png" alt="Login Logo" className="logo-img" />
          <h1 className="logo-title">Crafters Paradise</h1>
        </div>
        <div className="login-form-section">
          <div className="login-box">
            <h2>Login</h2>
            <form onSubmit={handleLogin}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
              />
              <button type="submit">Login</button>
              {error && <p>{error}</p>}
            </form>
          </div>
        </div>
      </div>

      {/* Loading Dialog */}
      {loading && (
        <div className="loading-dialog">
          <div className="loading-content">
            <div className="spinner"></div>
            <p>Logging in...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;
