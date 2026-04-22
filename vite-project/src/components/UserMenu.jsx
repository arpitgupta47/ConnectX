import React, { useState, useContext, useRef, useEffect } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function UserMenu() {
    const { userData, handleLogout } = useContext(AuthContext);
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const name = userData?.name || userData?.username || 'User';
    const email = userData?.email || '';
    const avatar = userData?.avatar || null;
    const initial = name[0]?.toUpperCase() || 'U';

    return (
        <div ref={ref} style={{ position: 'relative', userSelect: 'none' }}>
            {/* TRIGGER */}
            <button
                onClick={() => setOpen(p => !p)}
                style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: open ? 'rgba(102,126,234,0.22)' : 'rgba(102,126,234,0.1)',
                    border: '1px solid rgba(102,126,234,0.35)',
                    borderRadius: '40px', padding: '5px 12px 5px 5px',
                    cursor: 'pointer', transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(102,126,234,0.22)'}
                onMouseLeave={e => !open && (e.currentTarget.style.background = 'rgba(102,126,234,0.1)')}
            >
                {avatar ? (
                    <img src={avatar} alt={name} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg,#667eea,#764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '12px', color: 'white', flexShrink: 0 }}>
                        {initial}
                    </div>
                )}
                <span style={{ color: '#a78bfa', fontWeight: '700', fontSize: '13px' }}>You</span>
                <span style={{ color: '#64748b', fontSize: '9px' }}>{open ? '▲' : '▼'}</span>
            </button>

            {/* DROPDOWN */}
            {open && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                    width: '240px', background: 'rgba(10,10,22,0.98)',
                    border: '1px solid rgba(102,126,234,0.3)', borderRadius: '16px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.7)', backdropFilter: 'blur(20px)',
                    overflow: 'hidden', zIndex: 1000, animation: 'dropIn 0.18s ease',
                }}>
                    {/* Profile header */}
                    <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {avatar ? (
                            <img src={avatar} alt={name} style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(102,126,234,0.4)' }} />
                        ) : (
                            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg,#667eea,#764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '18px', color: 'white', flexShrink: 0 }}>
                                {initial}
                            </div>
                        )}
                        <div style={{ minWidth: 0 }}>
                            <div style={{ color: 'white', fontWeight: '700', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                            <div style={{ color: '#64748b', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email || 'No email linked'}</div>
                        </div>
                    </div>

                    {/* Menu */}
                    <div style={{ padding: '6px' }}>
                        <DropItem icon="🏠" label="Home" onClick={() => { navigate('/home'); setOpen(false); }} />
                        <DropItem icon="📋" label="Meeting History" onClick={() => { navigate('/history'); setOpen(false); }} />
                        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '4px 6px' }} />
                        <DropItem icon="🚪" label="Logout" onClick={() => { handleLogout(); setOpen(false); }} danger />
                    </div>
                </div>
            )}

            <style>{`@keyframes dropIn{from{opacity:0;transform:translateY(-6px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}}`}</style>
        </div>
    );
}

function DropItem({ icon, label, onClick, danger }) {
    const [hov, setHov] = useState(false);
    return (
        <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', border: 'none', borderRadius: '10px', background: hov ? (danger ? 'rgba(239,68,68,0.12)' : 'rgba(102,126,234,0.1)') : 'transparent', color: danger ? (hov ? '#f87171' : '#ef4444') : (hov ? 'white' : '#94a3b8'), fontSize: '13px', fontWeight: '600', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
            <span style={{ fontSize: '15px', flexShrink: 0 }}>{icon}</span>{label}
        </button>
    );
}
