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
      if (formState === 0) {
        const result = await handleLogin(username, password);
        setMessage(result);
        setShowMessage(true);
        setTimeout(() => navigate('/home'), 1200);
      }

      if (formState === 1) {
        const result = await handleRegister(name, username, password);
        setUsername('');
        setPassword('');
        setName('');
        setMessage(result);
        setShowMessage(true);
        setFormState(0);
      }
    } catch (err) {
      console.log(err);
      const errorMessage = err.response?.data?.message || 'An error occurred';
      setError(errorMessage);
      setShowMessage(false);
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
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h2 style={{ color: '#333', marginBottom: '10px', fontSize: '28px' }}>
            {formState === 0 ? 'Sign In' : 'Sign Up'}
          </h2>
          <p style={{ color: '#666', fontSize: '16px' }}>
            {formState === 0 ? 'Welcome back to Syncora!' : 'Create your account'}
          </p>
        </div>

        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={() => {
              setFormState(0);
              setError('');
              setShowMessage(false);
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
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setFormState(1);
              setError('');
              setShowMessage(false);
              setMessage('');
            }}
            style={{
              padding: '10px 20px',
              background: formState === 1 ? '#667eea' : '#f0f0f0',
              color: formState === 1 ? 'white' : '#333',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleAuth}>
          {formState === 1 && (
            <div style={{ marginBottom: '15px' }}>
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
                required
              />
            </div>
          )}

          <div style={{ marginBottom: '15px' }}>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                fontSize: '16px',
                boxSizing: 'border-box',
                outline: 'none'
              }}
              required
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                fontSize: '16px',
                boxSizing: 'border-box',
                outline: 'none'
              }}
              required
            />
          </div>

          {error && (
            <div style={{
              color: 'red',
              marginBottom: '15px',
              padding: '10px',
              background: '#ffe6e6',
              borderRadius: '5px',
              textAlign: 'center',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '12px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              fontSize: '16px',
              cursor: 'pointer',
              fontWeight: 'bold',
              transition: 'background 0.3s'
            }}
            onMouseOver={(e) => e.target.style.background = '#5a6fd8'}
            onMouseOut={(e) => e.target.style.background = '#667eea'}
          >
            {formState === 0 ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        {showMessage && (
          <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: '#4caf50',
            color: 'white',
            padding: '15px 20px',
            borderRadius: '5px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            zIndex: 1000,
            fontSize: '14px'
          }}>
            {message}
            <button
              onClick={() => setShowMessage(false)}
              style={{
                marginLeft: '10px',
                background: 'transparent',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                fontSize: '18px',
                fontWeight: 'bold'
              }}
            >
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  );
}