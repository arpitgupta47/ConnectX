import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

// Floating orb background
function Orbs() {
    return (
        <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' }}>
            {[
                { w: 400, h: 400, top: '-10%', left: '-10%', c1: '#667eea', c2: '#764ba2', dur: '18s' },
                { w: 300, h: 300, top: '60%', right: '-5%', c1: '#f472b6', c2: '#a78bfa', dur: '22s' },
                { w: 250, h: 250, top: '30%', left: '60%', c1: '#34d399', c2: '#667eea', dur: '15s' },
            ].map((o, i) => (
                <div key={i} style={{
                    position: 'absolute', width: o.w, height: o.h,
                    top: o.top, left: o.left, right: o.right,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${o.c1}33, ${o.c2}11)`,
                    filter: 'blur(60px)',
                    animation: `orbFloat ${o.dur} ease-in-out infinite alternate`,
                    animationDelay: `${i * 2}s`
                }} />
            ))}
        </div>
    );
}

// Password strength meter
function PasswordStrength({ password }) {
    const checks = [
        { label: 'At least 8 characters', ok: password.length >= 8 },
        { label: 'Uppercase letter', ok: /[A-Z]/.test(password) },
        { label: 'Number', ok: /[0-9]/.test(password) },
        { label: 'Special character', ok: /[^A-Za-z0-9]/.test(password) },
    ];
    const score = checks.filter(c => c.ok).length;
    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e'];
    const labels = ['Weak', 'Fair', 'Good', 'Strong'];
    if (!password) return null;
    return (
        <div style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
                {[0,1,2,3].map(i => (
                    <div key={i} style={{ height: '4px', flex: 1, borderRadius: '2px', background: i < score ? colors[score-1] : 'rgba(255,255,255,0.1)', transition: 'background 0.3s' }} />
                ))}
            </div>
            <div style={{ fontSize: '12px', color: score > 0 ? colors[score-1] : '#666', fontWeight: '600' }}>{score > 0 ? labels[score-1] : ''}</div>
        </div>
    );
}

export default function Authentication() {
    const [formState, setFormState] = useState(0); // 0=login, 1=register
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [shake, setShake] = useState(false);
    const [forgotMode, setForgotMode] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotSent, setForgotSent] = useState(false);
    const [focusedField, setFocusedField] = useState('');

    const navigate = useNavigate();
    const { handleRegister, handleLogin } = useContext(AuthContext);

    // Load remembered username
    useEffect(() => {
        const saved = localStorage.getItem('cx_remember');
        if (saved) { setUsername(saved); setRememberMe(true); }
    }, []);

    const switchForm = (s) => {
        setFormState(s); setError(''); setSuccess('');
        setName(''); setPassword(''); setForgotMode(false);
    };

    const handleAuth = async (e) => {
        e.preventDefault();
        setError(''); setSuccess(''); setLoading(true);
        try {
            if (formState === 0) {
                await handleLogin(username, password);
                if (rememberMe) localStorage.setItem('cx_remember', username);
                else localStorage.removeItem('cx_remember');
                navigate('/home');
            } else {
                if (!name.trim()) throw new Error('Full name is required');
                if (password.length < 6) throw new Error('Password must be at least 6 characters');
                const result = await handleRegister(name, username, password);
                setSuccess(result || 'Account created! Please sign in.');
                setFormState(0);
                setPassword('');
            }
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Something went wrong';
            setError(msg);
            setShake(true);
            setTimeout(() => setShake(false), 600);
        } finally { setLoading(false); }
    };

    const handleForgot = (e) => {
        e.preventDefault();
        if (!forgotEmail.trim()) return;
        // Simulate — real implementation needs backend email endpoint
        setTimeout(() => setForgotSent(true), 800);
    };

    const inputStyle = (field) => ({
        width: '100%', padding: '14px 16px',
        background: focusedField === field ? 'rgba(102,126,234,0.08)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${focusedField === field ? 'rgba(102,126,234,0.7)' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: '12px', color: 'white', fontSize: '15px', outline: 'none',
        transition: 'all 0.25s', boxSizing: 'border-box',
        boxShadow: focusedField === field ? '0 0 0 3px rgba(102,126,234,0.15)' : 'none',
    });

    return (
        <div style={{ minHeight: '100vh', background: '#0a0a14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: "'Inter', sans-serif", position: 'relative', overflow: 'hidden' }}>
            <Orbs />

            <div style={{
                position: 'relative', zIndex: 1, width: '100%', maxWidth: '440px',
                animation: shake ? 'shake 0.5s ease' : 'fadeUp 0.5s ease',
            }}>
                {/* LOGO */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{ width: '52px', height: '52px', background: 'linear-gradient(135deg,#667eea,#764ba2)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', margin: '0 auto 12px' }}>📡</div>
                    <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '800', background: 'linear-gradient(90deg,#667eea,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>ConnectX</h1>
                    <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '14px' }}>Connect. Collaborate. Create.</p>
                </div>

                {/* CARD */}
                <div style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '36px', boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}>

                    {/* FORGOT PASSWORD MODE */}
                    {forgotMode ? (
                        <>
                            <button onClick={() => setForgotMode(false)} style={{ background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer', fontSize: '14px', marginBottom: '20px', padding: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                ← Back to Sign In
                            </button>
                            <h2 style={{ color: 'white', margin: '0 0 8px', fontSize: '1.4rem', fontWeight: '700' }}>Reset Password</h2>
                            <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 24px', lineHeight: 1.6 }}>Enter your username and we'll send a reset link to your registered email.</p>
                            {!forgotSent ? (
                                <form onSubmit={handleForgot}>
                                    <input type="text" placeholder="Your username" value={forgotEmail}
                                        onChange={e => setForgotEmail(e.target.value)}
                                        style={inputStyle('forgot')}
                                        onFocus={() => setFocusedField('forgot')} onBlur={() => setFocusedField('')}
                                    />
                                    <button type="submit" style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg,#667eea,#764ba2)', border: 'none', color: 'white', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', marginTop: '16px' }}>
                                        Send Reset Link
                                    </button>
                                </form>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                    <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📧</div>
                                    <p style={{ color: '#4ade80', fontWeight: '600' }}>Reset link sent!</p>
                                    <p style={{ color: '#64748b', fontSize: '14px' }}>Check your registered email address.</p>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            {/* TAB SWITCHER */}
                            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '4px', marginBottom: '28px', position: 'relative' }}>
                                <div style={{ position: 'absolute', top: '4px', bottom: '4px', left: formState === 0 ? '4px' : 'calc(50% + 2px)', width: 'calc(50% - 6px)', background: 'linear-gradient(135deg,#667eea,#764ba2)', borderRadius: '9px', transition: 'left 0.3s cubic-bezier(0.4,0,0.2,1)', boxShadow: '0 4px 15px rgba(102,126,234,0.4)' }} />
                                {['Sign In', 'Sign Up'].map((label, i) => (
                                    <button key={i} onClick={() => switchForm(i)}
                                        style={{ flex: 1, padding: '10px', background: 'transparent', border: 'none', color: 'white', fontSize: '14px', fontWeight: '600', cursor: 'pointer', position: 'relative', zIndex: 1, transition: 'color 0.3s' }}>
                                        {label}
                                    </button>
                                ))}
                            </div>

                            {/* MESSAGES */}
                            {error && (
                                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', color: '#f87171', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    ⚠️ {error}
                                </div>
                            )}
                            {success && (
                                <div style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', color: '#4ade80', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    ✅ {success}
                                </div>
                            )}

                            {/* FORM */}
                            <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                {formState === 1 && (
                                    <div>
                                        <label style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Full Name</label>
                                        <input type="text" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)}
                                            style={inputStyle('name')} onFocus={() => setFocusedField('name')} onBlur={() => setFocusedField('')} required />
                                    </div>
                                )}

                                <div>
                                    <label style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Username</label>
                                    <input type="text" placeholder="your_username" value={username} onChange={e => setUsername(e.target.value)}
                                        style={inputStyle('user')} onFocus={() => setFocusedField('user')} onBlur={() => setFocusedField('')} required />
                                </div>

                                <div>
                                    <label style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Password</label>
                                    <div style={{ position: 'relative' }}>
                                        <input type={showPass ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)}
                                            style={{ ...inputStyle('pass'), paddingRight: '48px' }}
                                            onFocus={() => setFocusedField('pass')} onBlur={() => setFocusedField('')} required />
                                        <button type="button" onClick={() => setShowPass(p => !p)}
                                            style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#64748b' }}>
                                            {showPass ? '🙈' : '👁️'}
                                        </button>
                                    </div>
                                    {formState === 1 && <PasswordStrength password={password} />}
                                </div>

                                {/* REMEMBER ME + FORGOT */}
                                {formState === 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#94a3b8', fontSize: '14px' }}>
                                            <div onClick={() => setRememberMe(p => !p)} style={{ width: '18px', height: '18px', borderRadius: '5px', border: `2px solid ${rememberMe ? '#667eea' : 'rgba(255,255,255,0.2)'}`, background: rememberMe ? '#667eea' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0 }}>
                                                {rememberMe && <span style={{ color: 'white', fontSize: '11px', fontWeight: '700' }}>✓</span>}
                                            </div>
                                            Remember me
                                        </label>
                                        <button type="button" onClick={() => setForgotMode(true)}
                                            style={{ background: 'none', border: 'none', color: '#a78bfa', fontSize: '14px', cursor: 'pointer', fontWeight: '600' }}>
                                            Forgot password?
                                        </button>
                                    </div>
                                )}

                                {/* SUBMIT */}
                                <button type="submit" disabled={loading}
                                    style={{ width: '100%', padding: '15px', background: loading ? 'rgba(102,126,234,0.4)' : 'linear-gradient(135deg,#667eea,#764ba2)', border: 'none', color: 'white', borderRadius: '12px', fontSize: '16px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'opacity 0.2s', boxShadow: '0 8px 24px rgba(102,126,234,0.35)' }}>
                                    {loading ? (
                                        <><div style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Processing...</>
                                    ) : (
                                        formState === 0 ? '🚀 Sign In' : '✨ Create Account'
                                    )}
                                </button>
                            </form>

                            <p style={{ textAlign: 'center', color: '#64748b', fontSize: '13px', margin: '20px 0 0' }}>
                                {formState === 0 ? "Don't have an account? " : "Already have an account? "}
                                <button onClick={() => switchForm(formState === 0 ? 1 : 0)} style={{ background: 'none', border: 'none', color: '#a78bfa', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}>
                                    {formState === 0 ? 'Sign Up free' : 'Sign In'}
                                </button>
                            </p>
                        </>
                    )}
                </div>
            </div>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                @keyframes orbFloat { from{transform:translate(0,0) scale(1)} to{transform:translate(30px,20px) scale(1.05)} }
                @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
                @keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-8px)} 40%,80%{transform:translateX(8px)} }
                @keyframes spin { to{transform:rotate(360deg)} }
                input::placeholder { color: #475569; }
            `}</style>
        </div>
    );
}
