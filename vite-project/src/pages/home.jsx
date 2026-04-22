import React, { useContext, useState } from 'react'
import withAuth from '../utils/withAuth'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../contexts/AuthContext';
import UserMenu from '../components/UserMenu';

function HomeComponent() {
    const navigate = useNavigate();
    const [meetingCode, setMeetingCode] = useState("");
    const [copied, setCopied] = useState(false);
    const { addToUserHistory } = useContext(AuthContext);

    const generateCode = () => {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        return code;
    };

    const [newMeetCode] = useState(generateCode());

    const handleJoin = async () => {
        if (!meetingCode.trim()) return;
        await addToUserHistory(meetingCode);
        navigate(`/${meetingCode}`);
    };

    const handleNewMeeting = async () => {
        await addToUserHistory(newMeetCode);
        navigate(`/${newMeetCode}`);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(newMeetCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)', color: 'white' }}>
            {/* NAV */}
            <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', borderBottom: '1px solid rgba(102,126,234,0.15)', backdropFilter: 'blur(10px)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg,#667eea,#764ba2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📡</div>
                    <h2 style={{ margin: 0, fontWeight: '700', background: 'linear-gradient(90deg,#667eea,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>ConnectX</h2>
                </div>
                <UserMenu />
            </nav>

            {/* MAIN */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '85vh', padding: '20px', gap: '40px' }}>
                <div style={{ textAlign: 'center' }}>
                    <h1 style={{ fontSize: 'clamp(2rem,5vw,3.5rem)', fontWeight: '800', marginBottom: '12px' }}>
                        Ready to{' '}
                        <span style={{ background: 'linear-gradient(90deg,#667eea,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Connect?</span>
                    </h1>
                    <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>Start a new meeting or join with a code</p>
                </div>

                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center', width: '100%', maxWidth: '800px' }}>
                    {/* NEW MEETING CARD */}
                    <div style={{ background: 'rgba(102,126,234,0.08)', border: '1px solid rgba(102,126,234,0.25)', borderRadius: '20px', padding: '32px', flex: '1', minWidth: '280px', maxWidth: '360px' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>🎬</div>
                        <h3 style={{ margin: '0 0 8px', fontSize: '1.3rem', fontWeight: '700' }}>New Meeting</h3>
                        <p style={{ color: '#94a3b8', fontSize: '14px', margin: '0 0 20px', lineHeight: 1.6 }}>
                            Start instantly. You'll be the host and can admit participants.
                        </p>
                        <div style={{ background: 'rgba(102,126,234,0.1)', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontFamily: 'monospace', fontSize: '1.1rem', letterSpacing: '2px', color: '#a78bfa', fontWeight: '700' }}>{newMeetCode}</span>
                            <button onClick={handleCopy} style={{ background: copied ? 'rgba(74,222,128,0.2)' : 'rgba(102,126,234,0.2)', border: 'none', color: copied ? '#4ade80' : '#a78bfa', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', transition: 'all 0.2s' }}>
                                {copied ? '✓ Copied' : 'Copy'}
                            </button>
                        </div>
                        <button onClick={handleNewMeeting}
                            style={{ width: '100%', background: 'linear-gradient(135deg,#667eea,#764ba2)', border: 'none', color: 'white', padding: '14px', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', transition: 'opacity 0.2s' }}
                            onMouseEnter={e => e.target.style.opacity = '0.9'}
                            onMouseLeave={e => e.target.style.opacity = '1'}>
                            🚀 Start Meeting
                        </button>
                    </div>

                    {/* JOIN MEETING CARD */}
                    <div style={{ background: 'rgba(118,75,162,0.08)', border: '1px solid rgba(118,75,162,0.25)', borderRadius: '20px', padding: '32px', flex: '1', minWidth: '280px', maxWidth: '360px' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>🔗</div>
                        <h3 style={{ margin: '0 0 8px', fontSize: '1.3rem', fontWeight: '700' }}>Join Meeting</h3>
                        <p style={{ color: '#94a3b8', fontSize: '14px', margin: '0 0 20px', lineHeight: 1.6 }}>
                            Enter a meeting code shared by the host to join.
                        </p>
                        <input
                            type="text"
                            placeholder="Enter meeting code..."
                            value={meetingCode}
                            onChange={e => setMeetingCode(e.target.value.toUpperCase())}
                            onKeyDown={e => e.key === 'Enter' && handleJoin()}
                            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(118,75,162,0.3)', color: 'white', padding: '14px 16px', borderRadius: '10px', fontSize: '15px', fontFamily: 'monospace', letterSpacing: '2px', marginBottom: '16px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                            onFocus={e => e.target.style.borderColor = 'rgba(118,75,162,0.7)'}
                            onBlur={e => e.target.style.borderColor = 'rgba(118,75,162,0.3)'}
                        />
                        <button onClick={handleJoin}
                            style={{ width: '100%', background: meetingCode.trim() ? 'linear-gradient(135deg,#764ba2,#667eea)' : 'rgba(118,75,162,0.2)', border: 'none', color: meetingCode.trim() ? 'white' : '#666', padding: '14px', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: meetingCode.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}>
                            Join Meeting →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default withAuth(HomeComponent);
