import React, { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

export default function LandingPage() {
    const navigate = useNavigate();
    const canvasRef = useRef(null);

    // Animated particles background
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const particles = Array.from({ length: 80 }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 2 + 1,
            dx: (Math.random() - 0.5) * 0.6,
            dy: (Math.random() - 0.5) * 0.6,
            alpha: Math.random() * 0.5 + 0.2,
        }));

        let animId;
        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(102,126,234,${p.alpha})`;
                ctx.fill();
                p.x += p.dx; p.y += p.dy;
                if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
                if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
            });
            // Draw connections
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dist = Math.hypot(particles[i].x - particles[j].x, particles[i].y - particles[j].y);
                    if (dist < 120) {
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(102,126,234,${0.15 * (1 - dist / 120)})`;
                        ctx.lineWidth = 0.8;
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }
            animId = requestAnimationFrame(draw);
        };
        draw();
        const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
        window.addEventListener('resize', resize);
        return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
    }, []);

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)', color: 'white', overflow: 'hidden', position: 'relative' }}>
            <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, zIndex: 0 }} />

            {/* NAV */}
            <nav style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 40px', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(102,126,234,0.15)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, #667eea, #764ba2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>📡</div>
                    <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '700', background: 'linear-gradient(90deg, #667eea, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>ConnectX</h2>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <button onClick={() => navigate('/auth')} style={{ background: 'transparent', border: '1px solid rgba(102,126,234,0.5)', color: '#a78bfa', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', transition: 'all 0.2s' }}
                        onMouseEnter={e => e.target.style.background = 'rgba(102,126,234,0.15)'}
                        onMouseLeave={e => e.target.style.background = 'transparent'}>
                        Sign In
                    </button>
                    <button onClick={() => navigate('/auth')} style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', border: 'none', color: 'white', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
                        Get Started
                    </button>
                </div>
            </nav>

            {/* HERO */}
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '85vh', textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(102,126,234,0.15)', border: '1px solid rgba(102,126,234,0.3)', borderRadius: '20px', padding: '6px 16px', marginBottom: '32px', fontSize: '13px', color: '#a78bfa' }}>
                    <span style={{ width: '8px', height: '8px', background: '#4ade80', borderRadius: '50%', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                    Now with HD Video & Waiting Room
                </div>

                <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', fontWeight: '800', lineHeight: 1.1, marginBottom: '24px', maxWidth: '800px' }}>
                    Video Meetings{' '}
                    <span style={{ background: 'linear-gradient(90deg, #667eea, #a78bfa, #f472b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Built for Everyone
                    </span>
                </h1>

                <p style={{ fontSize: '1.2rem', color: '#94a3b8', maxWidth: '520px', lineHeight: 1.7, marginBottom: '40px' }}>
                    Crystal clear video, instant connections, and smart meeting controls. Start or join a meeting in seconds.
                </p>

                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <button onClick={() => navigate('/auth')}
                        style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', border: 'none', color: 'white', padding: '16px 36px', borderRadius: '12px', fontSize: '1.1rem', fontWeight: '700', cursor: 'pointer', boxShadow: '0 8px 32px rgba(102,126,234,0.4)', transition: 'transform 0.2s, box-shadow 0.2s' }}
                        onMouseEnter={e => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 12px 40px rgba(102,126,234,0.5)'; }}
                        onMouseLeave={e => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 8px 32px rgba(102,126,234,0.4)'; }}>
                        🚀 Start Meeting
                    </button>
                    <button onClick={() => navigate('/auth')}
                        style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '16px 36px', borderRadius: '12px', fontSize: '1.1rem', cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.08)'}
                        onMouseLeave={e => e.target.style.background = 'transparent'}>
                        Join a Meeting
                    </button>
                </div>

                {/* FEATURE CARDS */}
                <div style={{ display: 'flex', gap: '20px', marginTop: '80px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {[
                        { icon: '🎥', title: 'HD Video', desc: 'Crystal clear quality up to 1080p' },
                        { icon: '🔐', title: 'Waiting Room', desc: 'Control who joins your meetings' },
                        { icon: '💬', title: 'Live Chat', desc: 'Real-time messaging in every call' },
                        { icon: '🖥️', title: 'Screen Share', desc: 'Share your screen instantly' },
                    ].map((f, i) => (
                        <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(102,126,234,0.2)', borderRadius: '16px', padding: '24px 20px', width: '160px', textAlign: 'center', backdropFilter: 'blur(10px)', transition: 'transform 0.2s, border-color 0.2s', cursor: 'default' }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = 'rgba(102,126,234,0.5)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(102,126,234,0.2)'; }}>
                            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>{f.icon}</div>
                            <div style={{ fontWeight: '600', marginBottom: '6px', fontSize: '15px' }}>{f.title}</div>
                            <div style={{ color: '#94a3b8', fontSize: '12px', lineHeight: 1.5 }}>{f.desc}</div>
                        </div>
                    ))}
                </div>
            </div>

            <style>{`
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
            `}</style>
        </div>
    );
}
