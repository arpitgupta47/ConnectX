import React, { useContext, useEffect, useState } from 'react'
import { AuthContext } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom';

export default function History() {
    const { getHistoryOfUser, addToUserHistory } = useContext(AuthContext);
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [toast, setToast] = useState(null);
    const routeTo = useNavigate();

    const showToast = (msg, type = 'error') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const history = await getHistoryOfUser();
                setMeetings(history);
            } catch (e) {
                showToast('Failed to load meeting history. Please try again.', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, "0");
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const year = date.getFullYear();
        const hours = date.getHours().toString().padStart(2, "0");
        const mins = date.getMinutes().toString().padStart(2, "0");
        return { date: `${day}/${month}/${year}`, time: `${hours}:${mins}` };
    };

    const handleRejoin = async (code) => {
        try {
            await addToUserHistory(code);
            routeTo(`/${code}`);
        } catch {
            showToast('Failed to rejoin meeting.', 'error');
        }
    };

    const gradients = [
        'linear-gradient(135deg,#667eea,#764ba2)',
        'linear-gradient(135deg,#06b6d4,#667eea)',
        'linear-gradient(135deg,#a78bfa,#667eea)',
        'linear-gradient(135deg,#764ba2,#06b6d4)',
        'linear-gradient(135deg,#667eea,#06b6d4)',
    ];

    const filtered = meetings.filter(m =>
        m.meetingCode?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)', color: 'white', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

            {/* TOAST */}
            {toast && (
                <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: toast.type === 'error' ? 'rgba(239,68,68,0.95)' : 'rgba(74,222,128,0.95)', color: 'white', padding: '12px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: '600', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {toast.type === 'error' ? '⚠️' : '✅'} {toast.msg}
                </div>
            )}

            {/* NAV */}
            <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid rgba(102,126,234,0.15)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 10, background: 'rgba(15,15,26,0.85)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg,#667eea,#764ba2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z"/></svg>
                    </div>
                    <h2 style={{ margin: 0, fontWeight: '700', background: 'linear-gradient(90deg,#667eea,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>ConnectX</h2>
                </div>
                <button onClick={() => routeTo('/home')} style={{ background: 'rgba(102,126,234,0.15)', border: '1px solid rgba(102,126,234,0.3)', color: '#a78bfa', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    ← Back
                </button>
            </nav>

            {/* HEADER */}
            <div style={{ padding: '36px 24px 20px', maxWidth: '760px', margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
                    <div style={{ width: '52px', height: '52px', background: 'linear-gradient(135deg,#667eea,#764ba2)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>📋</div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '800' }}>Meeting History</h1>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '13px', marginTop: '2px' }}>
                            {loading ? 'Loading...' : `${meetings.length} meeting${meetings.length !== 1 ? 's' : ''} attended`}
                        </p>
                    </div>
                </div>

                {/* SEARCH BAR */}
                {!loading && meetings.length > 0 && (
                    <div style={{ position: 'relative', marginBottom: '8px' }}>
                        <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '15px', color: '#475569' }}>🔍</span>
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by meeting code..."
                            style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(102,126,234,0.25)', borderRadius: '12px', color: 'white', padding: '13px 16px 13px 44px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                        />
                    </div>
                )}
            </div>

            {/* CONTENT */}
            <div style={{ padding: '0 24px 48px', maxWidth: '760px', margin: '0 auto' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px 0' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>⏳</div>
                        <p style={{ color: '#64748b' }}>Loading your meeting history...</p>
                    </div>
                ) : meetings.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(102,126,234,0.05)', border: '1px solid rgba(102,126,234,0.15)', borderRadius: '20px' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📭</div>
                        <h3 style={{ margin: '0 0 8px', color: 'white', fontWeight: '700' }}>No meetings yet</h3>
                        <p style={{ color: '#64748b', margin: '0 0 24px', fontSize: '14px' }}>Start or join a meeting to see your history here.</p>
                        <button onClick={() => routeTo('/home')} style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', border: 'none', color: 'white', padding: '12px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                            🚀 Start a Meeting
                        </button>
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#475569', fontSize: '14px' }}>
                        No meetings found for "<strong style={{ color: '#a78bfa' }}>{search}</strong>"
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {filtered.map((e, i) => {
                            const { date, time } = formatDate(e.date);
                            return (
                                <div key={i}
                                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(102,126,234,0.18)', borderRadius: '16px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px', transition: 'all 0.2s' }}
                                    onMouseEnter={ev => { ev.currentTarget.style.background = 'rgba(102,126,234,0.08)'; ev.currentTarget.style.borderColor = 'rgba(102,126,234,0.35)'; ev.currentTarget.style.transform = 'translateY(-1px)'; }}
                                    onMouseLeave={ev => { ev.currentTarget.style.background = 'rgba(255,255,255,0.03)'; ev.currentTarget.style.borderColor = 'rgba(102,126,234,0.18)'; ev.currentTarget.style.transform = 'translateY(0)'; }}
                                >
                                    {/* ICON */}
                                    <div style={{ width: '46px', height: '46px', flexShrink: 0, background: gradients[i % gradients.length], borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🎬</div>

                                    {/* INFO */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '5px' }}>
                                            <span style={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: '800', letterSpacing: '2px', color: '#a78bfa' }}>{e.meetingCode}</span>
                                            <span style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ade80', fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px', letterSpacing: '0.5px' }}>Attended</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                                            <span style={{ color: '#64748b', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>📅 {date}</span>
                                            <span style={{ color: '#64748b', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>🕐 {time}</span>
                                        </div>
                                    </div>

                                    {/* REJOIN BUTTON */}
                                    <button
                                        onClick={() => handleRejoin(e.meetingCode)}
                                        style={{ flexShrink: 0, background: 'linear-gradient(135deg,#667eea,#764ba2)', border: 'none', color: 'white', borderRadius: '10px', padding: '9px 18px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 14px rgba(102,126,234,0.35)' }}
                                        onMouseEnter={ev => { ev.currentTarget.style.opacity = '0.85'; ev.currentTarget.style.transform = 'scale(1.03)'; }}
                                        onMouseLeave={ev => { ev.currentTarget.style.opacity = '1'; ev.currentTarget.style.transform = 'scale(1)'; }}
                                    >
                                        🔁 Rejoin
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
