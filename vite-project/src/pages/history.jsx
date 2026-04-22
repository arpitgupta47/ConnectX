import React, { useContext, useEffect, useState } from 'react'
import { AuthContext } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom';

export default function History() {
    const { getHistoryOfUser } = useContext(AuthContext);
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(true);
    const routeTo = useNavigate();

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const history = await getHistoryOfUser();
                setMeetings(history);
            } catch {
                // IMPLEMENT SNACKBAR
            } finally {
                setLoading(false);
            }
        }
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

    const gradients = [
        'linear-gradient(135deg,#667eea,#764ba2)',
        'linear-gradient(135deg,#06b6d4,#667eea)',
        'linear-gradient(135deg,#a78bfa,#667eea)',
        'linear-gradient(135deg,#764ba2,#06b6d4)',
        'linear-gradient(135deg,#667eea,#06b6d4)',
    ];

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)', color: 'white', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
            {/* NAV */}
            <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid rgba(102,126,234,0.15)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 10, background: 'rgba(15,15,26,0.85)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg,#667eea,#764ba2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📡</div>
                    <h2 style={{ margin: 0, fontWeight: '700', background: 'linear-gradient(90deg,#667eea,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>ConnectX</h2>
                </div>
                <button onClick={() => routeTo('/home')} style={{ background: 'rgba(102,126,234,0.15)', border: '1px solid rgba(102,126,234,0.3)', color: '#a78bfa', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
                    ← Back
                </button>
            </nav>

            {/* HEADER */}
            <div style={{ padding: '36px 24px 20px', maxWidth: '760px', margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '6px' }}>
                    <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg,#667eea,#764ba2)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>📋</div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.7rem', fontWeight: '800' }}>Meeting History</h1>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>
                            {loading ? 'Loading...' : `${meetings.length} meeting${meetings.length !== 1 ? 's' : ''} attended`}
                        </p>
                    </div>
                </div>
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
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {meetings.map((e, i) => {
                            const { date, time } = formatDate(e.date);
                            return (
                                <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(102,126,234,0.18)', borderRadius: '16px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px', transition: 'all 0.2s' }}
                                    onMouseEnter={ev => { ev.currentTarget.style.background = 'rgba(102,126,234,0.08)'; ev.currentTarget.style.borderColor = 'rgba(102,126,234,0.35)'; ev.currentTarget.style.transform = 'translateY(-1px)'; }}
                                    onMouseLeave={ev => { ev.currentTarget.style.background = 'rgba(255,255,255,0.03)'; ev.currentTarget.style.borderColor = 'rgba(102,126,234,0.18)'; ev.currentTarget.style.transform = 'translateY(0)'; }}
                                >
                                    <div style={{ width: '44px', height: '44px', flexShrink: 0, background: gradients[i % gradients.length], borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🎬</div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                                            <span style={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: '800', letterSpacing: '2px', color: '#a78bfa' }}>{e.meetingCode}</span>
                                            <span style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', color: '#4ade80', fontSize: '10px', fontWeight: '700', padding: '2px 7px', borderRadius: '20px' }}>Attended</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                            <span style={{ color: '#64748b', fontSize: '12px' }}>📅 {date}</span>
                                            <span style={{ color: '#64748b', fontSize: '12px' }}>🕐 {time}</span>
                                        </div>
                                    </div>
                                    <div style={{ flexShrink: 0, width: '30px', height: '30px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: '11px', fontWeight: '700' }}>#{i + 1}</div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
