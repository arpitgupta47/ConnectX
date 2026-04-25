import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import server from '../environment';

const SERVER_URL = server;

// ── Animated background orbs ──────────────────────────────────────
function Orbs() {
    return (
        <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', width: 500, height: 500, top: '-15%', left: '-10%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(56,189,248,0.1), transparent 70%)', filter: 'blur(60px)', animation: 'orbFloat 20s ease-in-out infinite alternate' }} />
            <div style={{ position: 'absolute', width: 400, height: 400, top: '55%', right: '-8%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(129,140,248,0.1), transparent 70%)', filter: 'blur(60px)', animation: 'orbFloat 16s ease-in-out infinite alternate-reverse' }} />
            <div style={{ position: 'absolute', width: 300, height: 300, top: '35%', left: '55%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(244,114,182,0.07), transparent 70%)', filter: 'blur(50px)', animation: 'orbFloat 24s ease-in-out infinite alternate' }} />
        </div>
    );
}

// ── Password strength ─────────────────────────────────────────────
function PasswordStrength({ password }) {
    if (!password) return null;
    const checks = [
        password.length >= 8,
        /[A-Z]/.test(password),
        /[0-9]/.test(password),
        /[^A-Za-z0-9]/.test(password),
    ];
    const score = checks.filter(Boolean).length;
    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e'];
    const labels = ['Weak', 'Fair', 'Good', 'Strong'];
    return (
        <div style={{ marginTop: '8px' }}>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '5px' }}>
                {[0, 1, 2, 3].map(i => (
                    <div key={i} style={{ height: '3px', flex: 1, borderRadius: '2px', background: i < score ? colors[score - 1] : 'rgba(255,255,255,0.08)', transition: 'background 0.3s' }} />
                ))}
            </div>
            <span style={{ fontSize: '11px', color: colors[score - 1] || '#475569', fontWeight: '600' }}>{labels[score - 1] || ''}</span>
        </div>
    );
}

// ── Logo ──────────────────────────────────────────────────────────
function Logo({ size = 48 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="authLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#818cf8" />
                </linearGradient>
            </defs>
            <path d="M20 2L36 11V29L20 38L4 29V11L20 2Z" fill="url(#authLogoGrad)" opacity="0.15" />
            <path d="M20 2L36 11V29L20 38L4 29V11L20 2Z" stroke="url(#authLogoGrad)" strokeWidth="1.5" fill="none" />
            <rect x="9" y="14" width="15" height="12" rx="2.5" fill="url(#authLogoGrad)" />
            <path d="M24 17L31 13V27L24 23V17Z" fill="url(#authLogoGrad)" />
            <circle cx="12" cy="11" r="1.2" fill="#38bdf8" opacity="0.8" />
            <circle cx="20" cy="8" r="1.2" fill="#818cf8" opacity="0.8" />
            <circle cx="28" cy="11" r="1.2" fill="#38bdf8" opacity="0.8" />
        </svg>
    );
}

// ── Input Field ───────────────────────────────────────────────────
function InputField({ label, type = 'text', placeholder, value, onChange, icon, rightEl, required }) {
    const [focused, setFocused] = useState(false);
    return (
        <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: '#64748b', fontSize: '12px', fontWeight: '600', marginBottom: '7px', letterSpacing: '0.4px', textTransform: 'uppercase' }}>{label}</label>
            <div style={{ position: 'relative' }}>
                {icon && (
                    <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', pointerEvents: 'none', opacity: 0.5 }}>{icon}</span>
                )}
                <input
                    type={type}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    required={required}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    style={{
                        width: '100%',
                        padding: `13px ${rightEl ? '48px' : '16px'} 13px ${icon ? '42px' : '16px'}`,
                        background: focused ? 'rgba(56,189,248,0.06)' : 'rgba(255,255,255,0.04)',
                        border: `1.5px solid ${focused ? 'rgba(56,189,248,0.6)' : 'rgba(255,255,255,0.09)'}`,
                        borderRadius: '12px',
                        color: 'white',
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'all 0.22s',
                        boxSizing: 'border-box',
                        boxShadow: focused ? '0 0 0 3px rgba(56,189,248,0.1)' : 'none',
                        fontFamily: 'inherit',
                    }}
                />
                {rightEl && (
                    <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }}>{rightEl}</div>
                )}
            </div>
        </div>
    );
}

// ── Primary Button ────────────────────────────────────────────────
function PrimaryBtn({ children, onClick, loading, type = 'button', disabled }) {
    return (
        <button type={type} onClick={onClick} disabled={loading || disabled}
            style={{ width: '100%', padding: '14px', background: loading ? 'rgba(56,189,248,0.35)' : 'linear-gradient(135deg, #38bdf8, #818cf8)', border: 'none', color: 'white', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: loading || disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'all 0.2s', boxShadow: loading ? 'none' : '0 6px 24px rgba(56,189,248,0.3)', fontFamily: 'inherit', letterSpacing: '0.2px' }}
            onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 10px 32px rgba(56,189,248,0.45)'; } }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = loading ? 'none' : '0 6px 24px rgba(56,189,248,0.3)'; }}>
            {loading ? (
                <><div style={{ width: '17px', height: '17px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />Please wait...</>
            ) : children}
        </button>
    );
}

// ── Google Button ─────────────────────────────────────────────────
function GoogleBtn({ onClick, loading }) {
    return (
        <button type="button" onClick={onClick} disabled={loading}
            style={{ width: '100%', padding: '13px', background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white', fontSize: '14px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'all 0.2s', fontFamily: 'inherit', opacity: loading ? 0.6 : 1 }}
            onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; } }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}>
            {loading ? (
                <><div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />Signing in...</>
            ) : (
                <>
                    <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
                        <path d="M47.5 24.5C47.5 22.6 47.3 20.8 47 19H24V29.4H37.3C36.7 32.4 35 34.9 32.5 36.6V43H40.3C44.7 38.9 47.5 32.2 47.5 24.5Z" fill="#4285F4"/>
                        <path d="M24 48C30.6 48 36.2 45.8 40.3 43L32.5 36.6C30.3 38.1 27.4 39 24 39C17.6 39 12.2 34.9 10.2 29.2H2.2V35.8C6.3 44 14.5 48 24 48Z" fill="#34A853"/>
                        <path d="M10.2 29.2C9.7 27.7 9.5 26.1 9.5 24.5C9.5 22.9 9.8 21.3 10.2 19.8V13.2H2.2C0.8 16 0 19.2 0 22.5C0 25.8 0.8 29 2.2 31.8L10.2 29.2Z" fill="#FBBC05"/>
                        <path d="M24 10C27.7 10 30.9 11.3 33.5 13.7L40.5 6.7C36.2 2.7 30.6 0 24 0C14.5 0 6.3 4 2.2 12.2L10.2 18.8C12.2 13.1 17.6 10 24 10Z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                </>
            )}
        </button>
    );
}

// ── Alert ─────────────────────────────────────────────────────────
function Alert({ type, msg }) {
    if (!msg) return null;
    const isErr = type === 'error';
    return (
        <div style={{ background: isErr ? 'rgba(239,68,68,0.08)' : 'rgba(74,222,128,0.08)', border: `1px solid ${isErr ? 'rgba(239,68,68,0.25)' : 'rgba(74,222,128,0.25)'}`, borderRadius: '10px', padding: '11px 14px', marginBottom: '18px', color: isErr ? '#f87171' : '#4ade80', fontSize: '13px', display: 'flex', alignItems: 'flex-start', gap: '8px', lineHeight: 1.5 }}>
            {isErr ? '⚠️' : '✅'} {msg}
        </div>
    );
}

// ── Divider ───────────────────────────────────────────────────────
function Divider() {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '18px 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
            <span style={{ color: '#334155', fontSize: '12px', fontWeight: '500', flexShrink: 0 }}>OR</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────
export default function Authentication() {
    const [screen, setScreen] = useState('signin');
    const [shake, setShake] = useState(false);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Sign In
    const [siUsername, setSiUsername] = useState('');
    const [siPassword, setSiPassword] = useState('');
    const [siShowPass, setSiShowPass] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    // Sign Up
    const [suName, setSuName] = useState('');
    const [suUsername, setSuUsername] = useState('');
    const [suEmail, setSuEmail] = useState('');
    const [suPassword, setSuPassword] = useState('');
    const [suShowPass, setSuShowPass] = useState(false);

    // Forgot / OTP
    const [fpEmail, setFpEmail] = useState('');
    const [fpOtp, setFpOtp] = useState('');
    const [fpNewPass, setFpNewPass] = useState('');
    const [fpShowPass, setFpShowPass] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();
    const { handleRegister, handleLogin, handleGoogleLogin } = useContext(AuthContext);

    useEffect(() => {
        const saved = localStorage.getItem('cx_remember');
        if (saved) { setSiUsername(saved); setRememberMe(true); }

        const params = new URLSearchParams(location.search);
        if (params.get("reason") === "session_conflict") {
            setError("Aapka account kisi aur device par login ho gaya hai. Dobara login karein.");
        }
    }, []);

    const reset = () => { setError(''); setSuccess(''); };
    const goTo = (s) => { reset(); setScreen(s); };
    const triggerShake = () => { setShake(true); setTimeout(() => setShake(false), 600); };

    // ── SIGN IN ───────────────────────────────────────────────────
    const handleSignIn = async (e) => {
        e.preventDefault();
        reset(); setLoading(true);
        try {
            await handleLogin(siUsername, siPassword);
            if (rememberMe) localStorage.setItem('cx_remember', siUsername);
            else localStorage.removeItem('cx_remember');
            navigate('/home');
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Login failed');
            triggerShake();
        } finally { setLoading(false); }
    };

    // ── SIGN UP ───────────────────────────────────────────────────
    const handleSignUp = async (e) => {
        e.preventDefault();
        reset();
        if (suPassword.length < 6) { setError('Password must be at least 6 characters'); triggerShake(); return; }
        setLoading(true);
        try {
            const res = await fetch(`${SERVER_URL}/api/v1/users/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: suName, username: suUsername, email: suEmail, password: suPassword }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            setSuccess(data.message || 'Account created! Please sign in.');
            setSuName(''); setSuUsername(''); setSuEmail(''); setSuPassword('');
            setTimeout(() => goTo('signin'), 1500);
        } catch (err) {
            setError(err.message || 'Registration failed');
            triggerShake();
        } finally { setLoading(false); }
    };

    // ── GOOGLE LOGIN/SIGNUP ───────────────────────────────────────
    const handleGoogleClick = async () => {
        reset();
        setGoogleLoading(true);
        try {
            await handleGoogleLogin();
            navigate('/home');
        } catch (err) {
            // User closed popup
            if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
                setError('Google sign-in was cancelled.');
            } else {
                setError(err.response?.data?.message || err.message || 'Google login failed');
            }
            triggerShake();
        } finally { setGoogleLoading(false); }
    };

    // ── SEND OTP ──────────────────────────────────────────────────
    const handleSendOtp = async (e) => {
        e.preventDefault();
        reset();
        if (!fpEmail.trim()) { setError('Please enter your email'); return; }
        setLoading(true);
        try {
            const res = await fetch(`${SERVER_URL}/api/v1/users/send-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: fpEmail }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            setSuccess('OTP sent! Check your email inbox.');
            goTo('otp');
        } catch (err) {
            setError(err.message || 'Failed to send OTP');
            triggerShake();
        } finally { setLoading(false); }
    };

    // ── RESET PASSWORD ────────────────────────────────────────────
    const handleResetPassword = async (e) => {
        e.preventDefault();
        reset();
        if (fpNewPass.length < 6) { setError('Password must be at least 6 characters'); return; }
        setLoading(true);
        try {
            const res = await fetch(`${SERVER_URL}/api/v1/users/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: fpEmail, otp: fpOtp, newPassword: fpNewPass }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            setSuccess(data.message || 'Password reset! Please sign in.');
            setFpOtp(''); setFpNewPass('');
            setTimeout(() => goTo('signin'), 2000);
        } catch (err) {
            setError(err.message || 'Reset failed');
            triggerShake();
        } finally { setLoading(false); }
    };

    const card = {
        position: 'relative', zIndex: 1, width: '100%', maxWidth: '420px',
        animation: shake ? 'shake 0.5s ease' : 'fadeUp 0.5s ease',
    };

    const cardInner = {
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '24px',
        padding: '36px 32px',
        boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
    };

    const showPassBtn = (show, setShow) => (
        <button type="button" onClick={() => setShow(p => !p)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '17px', color: '#475569', padding: 0, lineHeight: 1 }}>
            {show ? '🙈' : '👁️'}
        </button>
    );

    return (
        <div style={{ minHeight: '100vh', background: '#040812', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: "'Sora', 'DM Sans', sans-serif", position: 'relative', overflow: 'hidden' }}>
            <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
            <Orbs />

            <div style={card}>
                <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                        <Logo size={52} />
                    </div>
                    <h1 style={{ margin: 0, fontSize: '1.7rem', fontWeight: '800', background: 'linear-gradient(90deg,#38bdf8,#818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.5px' }}>ConnectX</h1>
                    <p style={{ margin: '5px 0 0', color: '#334155', fontSize: '13px' }}>Connect. Collaborate. Create.</p>
                </div>

                <div style={cardInner}>

                    {/* ── SIGN IN ─────────────────────────── */}
                    {screen === 'signin' && (
                        <>
                            <div style={{ marginBottom: '24px' }}>
                                <h2 style={{ margin: '0 0 4px', fontSize: '1.35rem', fontWeight: '700', color: 'white' }}>Sign in</h2>
                                <p style={{ margin: 0, color: '#334155', fontSize: '13px' }}>
                                    Don't have an account?{' '}
                                    <button onClick={() => goTo('signup')} style={{ background: 'none', border: 'none', color: '#38bdf8', fontWeight: '700', cursor: 'pointer', fontSize: '13px', padding: 0, fontFamily: 'inherit' }}>Sign up</button>
                                </p>
                            </div>

                            <Alert type="error" msg={error} />
                            <Alert type="success" msg={success} />

                            <form onSubmit={handleSignIn}>
                                <InputField label="Username" placeholder="your_username" value={siUsername} onChange={e => setSiUsername(e.target.value)} icon="👤" required />
                                <InputField label="Password" type={siShowPass ? 'text' : 'password'} placeholder="••••••••" value={siPassword} onChange={e => setSiPassword(e.target.value)} icon="🔑" required rightEl={showPassBtn(siShowPass, setSiShowPass)} />

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#475569', fontSize: '13px', userSelect: 'none' }}>
                                        <div onClick={() => setRememberMe(p => !p)} style={{ width: '17px', height: '17px', borderRadius: '5px', border: `2px solid ${rememberMe ? '#38bdf8' : 'rgba(255,255,255,0.15)'}`, background: rememberMe ? '#38bdf8' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0, cursor: 'pointer' }}>
                                            {rememberMe && <span style={{ color: 'white', fontSize: '10px', fontWeight: '800' }}>✓</span>}
                                        </div>
                                        Remember me
                                    </label>
                                    <button type="button" onClick={() => goTo('forgot')} style={{ background: 'none', border: 'none', color: '#818cf8', fontSize: '13px', cursor: 'pointer', fontWeight: '600', padding: 0, fontFamily: 'inherit' }}>
                                        Forgot password?
                                    </button>
                                </div>

                                <PrimaryBtn type="submit" loading={loading}>🚀 Login</PrimaryBtn>
                            </form>

                            <Divider />
                            <GoogleBtn onClick={handleGoogleClick} loading={googleLoading} />
                        </>
                    )}

                    {/* ── SIGN UP ─────────────────────────── */}
                    {screen === 'signup' && (
                        <>
                            <div style={{ marginBottom: '24px' }}>
                                <h2 style={{ margin: '0 0 4px', fontSize: '1.35rem', fontWeight: '700', color: 'white' }}>Create new account</h2>
                                <p style={{ margin: 0, color: '#334155', fontSize: '13px' }}>
                                    Already have an account?{' '}
                                    <button onClick={() => goTo('signin')} style={{ background: 'none', border: 'none', color: '#38bdf8', fontWeight: '700', cursor: 'pointer', fontSize: '13px', padding: 0, fontFamily: 'inherit' }}>Sign in</button>
                                </p>
                            </div>

                            <Alert type="error" msg={error} />
                            <Alert type="success" msg={success} />

                            <form onSubmit={handleSignUp}>
                                <InputField label="Full Name" placeholder="John Doe" value={suName} onChange={e => setSuName(e.target.value)} icon="👤" required />
                                <InputField label="Username" placeholder="john_doe" value={suUsername} onChange={e => setSuUsername(e.target.value)} icon="🪪" required />
                                <InputField label="Email" type="email" placeholder="you@email.com" value={suEmail} onChange={e => setSuEmail(e.target.value)} icon="📧" required />
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', color: '#64748b', fontSize: '12px', fontWeight: '600', marginBottom: '7px', letterSpacing: '0.4px', textTransform: 'uppercase' }}>Password</label>
                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', pointerEvents: 'none', opacity: 0.5 }}>🔑</span>
                                        <input type={suShowPass ? 'text' : 'password'} placeholder="Min. 6 characters" value={suPassword} onChange={e => setSuPassword(e.target.value)} required
                                            style={{ width: '100%', padding: '13px 48px 13px 42px', background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.09)', borderRadius: '12px', color: 'white', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                                        <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }}>{showPassBtn(suShowPass, setSuShowPass)}</div>
                                    </div>
                                    <PasswordStrength password={suPassword} />
                                </div>
                                <PrimaryBtn type="submit" loading={loading}>✨ Sign Up</PrimaryBtn>
                            </form>

                            <Divider />
                            <GoogleBtn onClick={handleGoogleClick} loading={googleLoading} />
                        </>
                    )}

                    {/* ── FORGOT PASSWORD ────────────────── */}
                    {screen === 'forgot' && (
                        <>
                            <button onClick={() => goTo('signin')} style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', fontSize: '13px', fontWeight: '600', padding: 0, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'inherit' }}>
                                ← Back to Login
                            </button>
                            <div style={{ marginBottom: '24px' }}>
                                <div style={{ fontSize: '2.2rem', marginBottom: '10px' }}>🔐</div>
                                <h2 style={{ margin: '0 0 6px', fontSize: '1.35rem', fontWeight: '700', color: 'white' }}>Forgot Password</h2>
                                <p style={{ margin: 0, color: '#334155', fontSize: '13px', lineHeight: 1.6 }}>Enter your email to reset your password.</p>
                            </div>
                            <Alert type="error" msg={error} />
                            <Alert type="success" msg={success} />
                            <form onSubmit={handleSendOtp}>
                                <InputField label="Email Address" type="email" placeholder="you@email.com" value={fpEmail} onChange={e => setFpEmail(e.target.value)} icon="📧" required />
                                <div style={{ height: '4px' }} />
                                <PrimaryBtn type="submit" loading={loading}>📨 Send OTP</PrimaryBtn>
                            </form>
                        </>
                    )}

                    {/* ── OTP + NEW PASSWORD ─────────────── */}
                    {screen === 'otp' && (
                        <>
                            <button onClick={() => goTo('forgot')} style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', fontSize: '13px', fontWeight: '600', padding: 0, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'inherit' }}>
                                ← Back
                            </button>
                            <div style={{ marginBottom: '24px' }}>
                                <div style={{ fontSize: '2.2rem', marginBottom: '10px' }}>📬</div>
                                <h2 style={{ margin: '0 0 6px', fontSize: '1.35rem', fontWeight: '700', color: 'white' }}>Check your email</h2>
                                <p style={{ margin: 0, color: '#334155', fontSize: '13px', lineHeight: 1.6 }}>
                                    OTP sent to <strong style={{ color: '#38bdf8' }}>{fpEmail}</strong>.<br />Expires in 10 minutes.
                                </p>
                            </div>
                            <Alert type="error" msg={error} />
                            <Alert type="success" msg={success} />
                            <form onSubmit={handleResetPassword}>
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', color: '#64748b', fontSize: '12px', fontWeight: '600', marginBottom: '7px', letterSpacing: '0.4px', textTransform: 'uppercase' }}>Enter OTP</label>
                                    <input
                                        type="text"
                                        placeholder="6-digit OTP"
                                        value={fpOtp}
                                        onChange={e => setFpOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        maxLength={6}
                                        required
                                        style={{ width: '100%', padding: '14px', background: 'rgba(56,189,248,0.05)', border: '1.5px solid rgba(56,189,248,0.25)', borderRadius: '12px', color: '#38bdf8', fontSize: '22px', fontWeight: '800', letterSpacing: '10px', textAlign: 'center', outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }}
                                    />
                                </div>
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', color: '#64748b', fontSize: '12px', fontWeight: '600', marginBottom: '7px', letterSpacing: '0.4px', textTransform: 'uppercase' }}>New Password</label>
                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', pointerEvents: 'none', opacity: 0.5 }}>🔑</span>
                                        <input type={fpShowPass ? 'text' : 'password'} placeholder="New password" value={fpNewPass} onChange={e => setFpNewPass(e.target.value)} required
                                            style={{ width: '100%', padding: '13px 48px 13px 42px', background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.09)', borderRadius: '12px', color: 'white', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                                        <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }}>{showPassBtn(fpShowPass, setSuShowPass)}</div>
                                    </div>
                                    <PasswordStrength password={fpNewPass} />
                                </div>
                                <PrimaryBtn type="submit" loading={loading}>🔓 Reset Password</PrimaryBtn>
                            </form>
                            <div style={{ textAlign: 'center', marginTop: '16px' }}>
                                <button onClick={handleSendOtp} style={{ background: 'none', border: 'none', color: '#475569', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
                                    Didn't receive? <span style={{ color: '#818cf8', fontWeight: '600' }}>Resend OTP</span>
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes orbFloat { from{transform:translate(0,0) scale(1)} to{transform:translate(25px,18px) scale(1.04)} }
                @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
                @keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-7px)} 40%,80%{transform:translateX(7px)} }
                @keyframes spin { to{transform:rotate(360deg)} }
                input::placeholder { color: #1e293b; }
            `}</style>
        </div>
    );
}
