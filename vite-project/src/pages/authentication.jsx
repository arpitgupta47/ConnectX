import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

export default function Authentication() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [formState, setFormState] = useState(0); // 0 = login, 1 = register
  const [showMessage, setShowMessage] = useState(false);

  const navigate = useNavigate();
  const { handleRegister, handleLogin } = useContext(AuthContext);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setShowMessage(false);

    try {
      // 🔥 LOGIN
      if (formState === 0) {
        await handleLogin(username, password);

        // ✅ direct redirect
        navigate('/home');
      }

      // 🔥 REGISTER
      if (formState === 1) {
        const result = await handleRegister(name, username, password);

        setUsername('');
        setPassword('');
        setName('');
        setMessage(result || "Registered successfully");
        setShowMessage(true);

        // switch to login
        setFormState(0);
      }

    } catch (err) {
      const errorMessage =
        err.response?.data?.message || err.message || 'An error occurred';

      setError(errorMessage);
      console.log("AUTH ERROR:", err);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '10px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '400px'
      }}>

        {/* HEADER */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h2 style={{ color: '#333', marginBottom: '10px' }}>
            {formState === 0 ? 'Sign In' : 'Sign Up'}
          </h2>
          <p style={{ color: '#666' }}>
            {formState === 0
              ? 'Welcome back to Syncora!'
              : 'Create your account'}
          </p>
        </div>

        {/* TOGGLE BUTTONS */}
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={() => {
              setFormState(0);
              setError('');
              setMessage('');
            }}
            style={{
              padding: '10px 20px',
              marginRight: '10px',
              background: formState === 0 ? '#667eea' : '#f0f0f0',
              color: formState === 0 ? 'white' : '#333',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Sign In
          </button>

          <button
            onClick={() => {
              setFormState(1);
              setError('');
              setMessage('');
            }}
            style={{
              padding: '10px 20px',
              background: formState === 1 ? '#667eea' : '#f0f0f0',
              color: formState === 1 ? 'white' : '#333',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Sign Up
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleAuth}>
          {formState === 1 && (
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
              required
            />
          )}

          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={inputStyle}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
            required
          />

          {error && <div style={errorStyle}>{error}</div>}

          <button type="submit" style={btnStyle}>
            {formState === 0 ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        {/* SUCCESS MESSAGE */}
        {showMessage && (
          <div style={successStyle}>
            {message}
          </div>
        )}

      </div>
    </div>
  );
}

// 🔥 styles
const inputStyle = {
  width: '100%',
  padding: '12px',
  marginBottom: '15px',
  border: '1px solid #ddd',
  borderRadius: '5px',
  fontSize: '16px'
};

const btnStyle = {
  width: '100%',
  padding: '12px',
  background: '#667eea',
  color: 'white',
  border: 'none',
  borderRadius: '5px',
  fontSize: '16px',
  cursor: 'pointer',
  fontWeight: 'bold'
};

const errorStyle = {
  color: 'red',
  marginBottom: '10px',
  textAlign: 'center'
};

const successStyle = {
  marginTop: '15px',
  padding: '10px',
  background: '#4caf50',
  color: 'white',
  borderRadius: '5px',
  textAlign: 'center'
};
