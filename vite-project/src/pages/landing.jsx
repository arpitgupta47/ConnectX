import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function LandingPage() {
    const navigate = useNavigate();
    const canvasRef = useRef(null);
    const [scrollY, setScrollY] = useState(0);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [statsVisible, setStatsVisible] = useState(false);
    const statsRef = useRef(null);
    const [counts, setCounts] = useState({ meetings: 0, users: 0, uptime: 0 });

    // Mouse parallax
    useEffect(() => {
        const handleMouse = e => setMousePos({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
        window.addEventListener('mousemove', handleMouse);
        return () => window.removeEventListener('mousemove', handleMouse);
    }, []);

    // Scroll
    useEffect(() => {
        const handleScroll = () => setScrollY(window.scrollY);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Stats counter animation
    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) { setStatsVisible(true); observer.disconnect(); }
        }, { threshold: 0.3 });
        if (statsRef.current) observer.observe(statsRef.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!statsVisible) return;
        const targets = { meetings: 2400000, users: 850000, uptime: 99 };
        const duration = 2000;
        const start = Date.now();
        const tick = () => {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);
            setCounts({
                meetings: Math.floor(ease * targets.meetings),
                users: Math.floor(ease * targets.users),
                uptime: Math.floor(ease * targets.uptime),
            });
            if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }, [statsVisible]);

    // Particle canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
        resize();
        window.addEventListener('resize', resize);

        const particles = Array.from({ length: 60 }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 1.5 + 0.5,
            dx: (Math.random() - 0.5) * 0.4,
            dy: (Math.random() - 0.5) * 0.4,
            alpha: Math.random() * 0.4 + 0.1,
        }));

        let animId;
        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(56,189,248,${p.alpha})`;
                ctx.fill();
                p.x += p.dx; p.y += p.dy;
                if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
                if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
            });
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const d = Math.hypot(particles[i].x - particles[j].x, particles[i].y - particles[j].y);
                    if (d < 100) {
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(56,189,248,${0.12 * (1 - d / 100)})`;
                        ctx.lineWidth = 0.6;
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }
            animId = requestAnimationFrame(draw);
        };
        draw();
        return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
    }, []);

    const features = [
        { icon: '🎥', title: 'Crystal HD Video', desc: 'Adaptive 1080p streaming with noise cancellation. Every frame counts.', color: '#38bdf8' },
        { icon: '🗳️', title: 'Live Polling', desc: 'Launch instant polls mid-meeting. Real-time results with animated charts.', color: '#a78bfa' },
        { icon: '📊', title: 'AI Meeting Score', desc: 'AI analyzes engagement, participation & productivity. Get a full report card.', color: '#34d399' },
        { icon: '🤖', title: 'AI Assistant', desc: 'Ask questions, take notes, and generate summaries — all inside the call.', color: '#f59e0b' },
        { icon: '🔐', title: 'Smart Waiting Room', desc: 'Host controls who enters. No uninvited guests. Full security.', color: '#f472b6' },
        { icon: '🖥️', title: 'Screen Sharing', desc: 'Share your screen in one click. Works on all devices and browsers.', color: '#fb923c' },
    ];

    const testimonials = [
        { name: 'Priya Sharma', role: 'Product Lead, Razorpay', text: 'ConnectX replaced our Zoom subscription. The AI Meeting Score alone saves us hours every week.', avatar: 'PS' },
        { name: 'Arjun Mehta', role: 'CTO, TechSpark', text: 'The live polling feature is game-changing for standups. Our team engagement went up 3x.', avatar: 'AM' },
        { name: 'Sneha Kapoor', role: 'Founder, EduFlow', text: 'Finally a video app built for real collaboration. The AI assistant during client calls is 🔥', avatar: 'SK' },
    ];

    const parallaxX = (mousePos.x - 0.5) * 20;
    const parallaxY = (mousePos.y - 0.5) * 20;

    return (
        <div style={{ minHeight: '100vh', background: '#040812', color: 'white', fontFamily: "'Sora', 'DM Sans', sans-serif", overflowX: 'hidden' }}>
            <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />

            <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, zIndex: 0, pointerEvents: 'none' }} />

            {/* Ambient glow blobs */}
            <div style={{ position: 'fixed', top: '10%', left: '15%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(56,189,248,0.08) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none', zIndex: 0, transform: `translate(${parallaxX * 0.5}px, ${parallaxY * 0.5}px)`, transition: 'transform 0.1s ease' }} />
            <div style={{ position: 'fixed', top: '40%', right: '10%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(167,139,250,0.07) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none', zIndex: 0, transform: `translate(${-parallaxX * 0.3}px, ${-parallaxY * 0.3}px)`, transition: 'transform 0.1s ease' }} />

            {/* ── NAVBAR ────────────────────────────────────────────── */}
            <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 48px', backdropFilter: 'blur(24px)', background: scrollY > 50 ? 'rgba(4,8,18,0.85)' : 'transparent', borderBottom: scrollY > 50 ? '1px solid rgba(56,189,248,0.1)' : '1px solid transparent', transition: 'all 0.4s ease' }}>

                {/* LOGO */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* SVG Logo */}
                    <div style={{ position: 'relative', width: '40px', height: '40px' }}>
                        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                                <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#38bdf8" />
                                    <stop offset="100%" stopColor="#818cf8" />
                                </linearGradient>
                            </defs>
                            {/* Hexagon base */}
                            <path d="M20 2L36 11V29L20 38L4 29V11L20 2Z" fill="url(#logoGrad)" opacity="0.15" />
                            <path d="M20 2L36 11V29L20 38L4 29V11L20 2Z" stroke="url(#logoGrad)" strokeWidth="1.5" fill="none" />
                            {/* Video camera icon inside */}
                            <rect x="9" y="14" width="15" height="12" rx="2.5" fill="url(#logoGrad)" />
                            <path d="M24 17L31 13V27L24 23V17Z" fill="url(#logoGrad)" />
                            {/* Signal dots */}
                            <circle cx="12" cy="11" r="1.2" fill="#38bdf8" opacity="0.8" />
                            <circle cx="20" cy="8" r="1.2" fill="#818cf8" opacity="0.8" />
                            <circle cx="28" cy="11" r="1.2" fill="#38bdf8" opacity="0.8" />
                        </svg>
                    </div>
                    <span style={{ fontSize: '1.5rem', fontWeight: '800', background: 'linear-gradient(90deg, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.5px' }}>ConnectX</span>
                </div>

                {/* Nav links */}
                <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
                    {['Features', 'Pricing', 'Enterprise'].map(item => (
                        <span key={item} style={{ color: '#94a3b8', fontSize: '14px', fontWeight: '500', cursor: 'pointer', transition: 'color 0.2s' }}
                            onMouseEnter={e => e.target.style.color = 'white'}
                            onMouseLeave={e => e.target.style.color = '#94a3b8'}>{item}</span>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button onClick={() => navigate('/auth')}
                        style={{ background: 'transparent', border: '1px solid rgba(56,189,248,0.3)', color: '#38bdf8', padding: '9px 22px', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.target.style.background = 'rgba(56,189,248,0.08)'; e.target.style.borderColor = 'rgba(56,189,248,0.6)'; }}
                        onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.borderColor = 'rgba(56,189,248,0.3)'; }}>
                        Sign In
                    </button>
                    <button onClick={() => navigate('/auth')}
                        style={{ background: 'linear-gradient(135deg, #38bdf8, #818cf8)', border: 'none', color: 'white', padding: '9px 22px', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', boxShadow: '0 4px 20px rgba(56,189,248,0.3)', transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.target.style.transform = 'translateY(-1px)'; e.target.style.boxShadow = '0 6px 28px rgba(56,189,248,0.45)'; }}
                        onMouseLeave={e => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 4px 20px rgba(56,189,248,0.3)'; }}>
                        Get Started Free
                    </button>
                </div>
            </nav>

            {/* ── HERO ──────────────────────────────────────────────── */}
            <section style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', textAlign: 'center', padding: '120px 24px 80px' }}>

                {/* Badge */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.25)', borderRadius: '100px', padding: '7px 18px', marginBottom: '36px', fontSize: '13px', color: '#38bdf8', fontWeight: '500' }}>
                    <span style={{ width: '7px', height: '7px', background: '#4ade80', borderRadius: '50%', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                    Now with AI Meeting Intelligence — Real-time, Free
                </div>

                {/* Headline */}
                <h1 style={{ fontSize: 'clamp(3rem, 7vw, 6.5rem)', fontWeight: '800', lineHeight: 1.05, marginBottom: '28px', maxWidth: '900px', letterSpacing: '-2px' }}>
                    The Meeting Platform<br />
                    <span style={{ background: 'linear-gradient(90deg, #38bdf8 0%, #818cf8 50%, #f472b6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        That Works For You
                    </span>
                </h1>

                {/* Subheadline */}
                <p style={{ fontSize: 'clamp(1rem, 2vw, 1.25rem)', color: '#64748b', maxWidth: '560px', lineHeight: 1.75, marginBottom: '48px', fontWeight: '400' }}>
                    HD video. AI-powered insights. Live polls. Real-time collaboration.
                    <br />Everything your team needs — in one place.
                </p>

                {/* CTAs */}
                <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '72px' }}>
                    <button onClick={() => navigate('/auth')}
                        style={{ background: 'linear-gradient(135deg, #38bdf8, #818cf8)', border: 'none', color: 'white', padding: '18px 40px', borderRadius: '14px', fontSize: '1.05rem', fontWeight: '700', cursor: 'pointer', boxShadow: '0 8px 32px rgba(56,189,248,0.35)', transition: 'all 0.25s', display: 'flex', alignItems: 'center', gap: '10px' }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 16px 48px rgba(56,189,248,0.5)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(56,189,248,0.35)'; }}>
                        🚀 Start Meeting — Free
                    </button>
                    <button onClick={() => navigate('/auth')}
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', padding: '18px 40px', borderRadius: '14px', fontSize: '1.05rem', cursor: 'pointer', fontWeight: '500', transition: 'all 0.25s', backdropFilter: 'blur(10px)' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}>
                        Join a Meeting →
                    </button>
                </div>

                {/* Mock UI preview */}
                <div style={{ position: 'relative', width: '100%', maxWidth: '860px', transform: `perspective(1200px) rotateX(4deg) translateY(${scrollY * 0.1}px)`, transition: 'transform 0.1s linear' }}>
                    {/* Glow behind mockup */}
                    <div style={{ position: 'absolute', inset: '-20px', background: 'radial-gradient(ellipse at center, rgba(56,189,248,0.15) 0%, transparent 70%)', borderRadius: '32px', filter: 'blur(20px)' }} />

                    <div style={{ position: 'relative', background: 'rgba(10,14,26,0.9)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '24px', overflow: 'hidden', backdropFilter: 'blur(10px)', boxShadow: '0 40px 120px rgba(0,0,0,0.8)' }}>
                        {/* Mockup top bar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                            <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#ef4444' }} />
                            <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#f59e0b' }} />
                            <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#4ade80' }} />
                            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '6px', padding: '4px 20px', fontSize: '12px', color: '#475569' }}>connectx.onrender.com/meeting</div>
                            </div>
                        </div>

                        {/* Mockup video grid */}
                        <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            {[
                                { name: 'Arpit (Host) 👑', color: 'rgba(56,189,248,0.15)', border: 'rgba(56,189,248,0.3)', active: true },
                                { name: 'Anmol', color: 'rgba(129,140,248,0.12)', border: 'rgba(129,140,248,0.2)', active: false },
                                { name: 'Priya', color: 'rgba(244,114,182,0.1)', border: 'rgba(244,114,182,0.2)', active: false },
                                { name: 'Rahul', color: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.2)', active: false },
                            ].map((p, i) => (
                                <div key={i} style={{ background: p.color, border: `1px solid ${p.border}`, borderRadius: '14px', height: '120px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', position: 'relative', overflow: 'hidden' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: `linear-gradient(135deg, ${p.border}, transparent)`, border: `2px solid ${p.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '700', color: 'white' }}>
                                        {p.name[0]}
                                    </div>
                                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>{p.name}</span>
                                    {p.active && <div style={{ position: 'absolute', top: '8px', right: '8px', width: '8px', height: '8px', background: '#4ade80', borderRadius: '50%', animation: 'pulse 2s infinite' }} />}
                                </div>
                            ))}
                        </div>

                        {/* Mockup control bar */}
                        <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'center', gap: '12px', alignItems: 'center' }}>
                            {['🤖 AI', '🗳️ Poll', '📊 Score', '📹', '🎤', '💬'].map((btn, i) => (
                                <div key={i} style={{ padding: '7px 14px', borderRadius: '10px', background: i === 0 ? 'linear-gradient(135deg,#38bdf8,#818cf8)' : 'rgba(255,255,255,0.06)', border: `1px solid ${i === 0 ? 'transparent' : 'rgba(255,255,255,0.1)'}`, fontSize: '12px', color: 'white', fontWeight: i < 3 ? '700' : '400' }}>{btn}</div>
                            ))}
                            <div style={{ padding: '7px 14px', borderRadius: '10px', background: '#ef4444', fontSize: '12px', color: 'white', fontWeight: '700' }}>✕ End</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── STATS ─────────────────────────────────────────────── */}
            <section ref={statsRef} style={{ position: 'relative', zIndex: 1, padding: '80px 48px', display: 'flex', justifyContent: 'center', gap: '80px', flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                {[
                    { value: counts.meetings >= 1000000 ? `${(counts.meetings / 1000000).toFixed(1)}M+` : `${Math.floor(counts.meetings / 1000)}K+`, label: 'Meetings Hosted', color: '#38bdf8' },
                    { value: counts.users >= 1000000 ? `${(counts.users / 1000000).toFixed(1)}M+` : `${Math.floor(counts.users / 1000)}K+`, label: 'Active Users', color: '#818cf8' },
                    { value: `${counts.uptime}%`, label: 'Uptime Guaranteed', color: '#4ade80' },
                    { value: '0₹', label: 'To Get Started', color: '#f59e0b' },
                ].map((s, i) => (
                    <div key={i} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', fontWeight: '800', color: s.color, letterSpacing: '-1px', marginBottom: '8px' }}>{s.value}</div>
                        <div style={{ color: '#475569', fontSize: '14px', fontWeight: '500', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{s.label}</div>
                    </div>
                ))}
            </section>

            {/* ── FEATURES ──────────────────────────────────────────── */}
            <section style={{ position: 'relative', zIndex: 1, padding: '120px 48px', maxWidth: '1100px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '72px' }}>
                    <div style={{ display: 'inline-block', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: '100px', padding: '6px 18px', fontSize: '12px', color: '#a78bfa', fontWeight: '600', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                        Everything You Need
                    </div>
                    <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', fontWeight: '800', letterSpacing: '-1.5px', marginBottom: '16px', lineHeight: 1.1 }}>
                        Not just video calls.<br />
                        <span style={{ background: 'linear-gradient(90deg, #a78bfa, #38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Smart meetings.</span>
                    </h2>
                    <p style={{ color: '#475569', fontSize: '1.1rem', maxWidth: '480px', margin: '0 auto', lineHeight: 1.7 }}>
                        Every feature is built to make your meetings more productive and your team more connected.
                    </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                    {features.map((f, i) => (
                        <div key={i}
                            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', padding: '32px 28px', transition: 'all 0.3s ease', cursor: 'default', position: 'relative', overflow: 'hidden' }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = `rgba(${f.color === '#38bdf8' ? '56,189,248' : f.color === '#a78bfa' ? '167,139,250' : f.color === '#34d399' ? '52,211,153' : f.color === '#f59e0b' ? '245,158,11' : f.color === '#f472b6' ? '244,114,182' : '251,146,60'},0.06)`;
                                e.currentTarget.style.borderColor = `${f.color}40`;
                                e.currentTarget.style.transform = 'translateY(-4px)';
                                e.currentTarget.style.boxShadow = `0 20px 60px ${f.color}15`;
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}>
                            <div style={{ fontSize: '2.4rem', marginBottom: '18px' }}>{f.icon}</div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '10px', color: 'white' }}>{f.title}</h3>
                            <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.7, margin: 0 }}>{f.desc}</p>
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${f.color}, transparent)`, opacity: 0.4 }} />
                        </div>
                    ))}
                </div>
            </section>

            {/* ── TESTIMONIALS ─────────────────────────────────────── */}
            <section style={{ position: 'relative', zIndex: 1, padding: '100px 48px', background: 'rgba(255,255,255,0.01)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ textAlign: 'center', marginBottom: '64px' }}>
                    <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 3rem)', fontWeight: '800', letterSpacing: '-1px', marginBottom: '12px' }}>
                        Loved by teams <span style={{ background: 'linear-gradient(90deg,#f472b6,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>across India</span>
                    </h2>
                    <p style={{ color: '#475569', fontSize: '1rem' }}>Real stories from real users</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', maxWidth: '1000px', margin: '0 auto' }}>
                    {testimonials.map((t, i) => (
                        <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '28px', transition: 'transform 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                            <div style={{ fontSize: '1.5rem', marginBottom: '14px', color: '#f59e0b' }}>❝</div>
                            <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.75, marginBottom: '20px' }}>{t.text}</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg,#38bdf8,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', flexShrink: 0 }}>{t.avatar}</div>
                                <div>
                                    <div style={{ fontWeight: '700', fontSize: '14px' }}>{t.name}</div>
                                    <div style={{ color: '#475569', fontSize: '12px' }}>{t.role}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── CTA SECTION ───────────────────────────────────────── */}
            <section style={{ position: 'relative', zIndex: 1, padding: '120px 48px', textAlign: 'center' }}>
                <div style={{ position: 'relative', maxWidth: '700px', margin: '0 auto', padding: '72px 48px', background: 'rgba(56,189,248,0.04)', border: '1px solid rgba(56,189,248,0.15)', borderRadius: '32px', overflow: 'hidden' }}>
                    {/* Decorative glow */}
                    <div style={{ position: 'absolute', top: '-50px', left: '50%', transform: 'translateX(-50%)', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(56,189,248,0.12) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

                    {/* Big logo in CTA */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                        <svg width="64" height="64" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                                <linearGradient id="ctaLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#38bdf8" />
                                    <stop offset="100%" stopColor="#818cf8" />
                                </linearGradient>
                            </defs>
                            <path d="M20 2L36 11V29L20 38L4 29V11L20 2Z" fill="url(#ctaLogoGrad)" opacity="0.2" />
                            <path d="M20 2L36 11V29L20 38L4 29V11L20 2Z" stroke="url(#ctaLogoGrad)" strokeWidth="1.5" fill="none" />
                            <rect x="9" y="14" width="15" height="12" rx="2.5" fill="url(#ctaLogoGrad)" />
                            <path d="M24 17L31 13V27L24 23V17Z" fill="url(#ctaLogoGrad)" />
                        </svg>
                    </div>

                    <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: '800', letterSpacing: '-1px', marginBottom: '16px', lineHeight: 1.1 }}>
                        Your next great meeting<br />
                        <span style={{ background: 'linear-gradient(90deg,#38bdf8,#818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>starts right now.</span>
                    </h2>
                    <p style={{ color: '#475569', marginBottom: '40px', fontSize: '1.05rem', lineHeight: 1.7 }}>
                        No downloads. No credit card. No limits.<br />
                        Just you, your team, and the best meeting experience.
                    </p>
                    <button onClick={() => navigate('/auth')}
                        style={{ background: 'linear-gradient(135deg,#38bdf8,#818cf8)', border: 'none', color: 'white', padding: '18px 48px', borderRadius: '14px', fontSize: '1.1rem', fontWeight: '700', cursor: 'pointer', boxShadow: '0 8px 40px rgba(56,189,248,0.4)', transition: 'all 0.25s' }}
                        onMouseEnter={e => { e.target.style.transform = 'translateY(-3px)'; e.target.style.boxShadow = '0 16px 56px rgba(56,189,248,0.55)'; }}
                        onMouseLeave={e => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 8px 40px rgba(56,189,248,0.4)'; }}>
                        🚀 Launch ConnectX Free
                    </button>
                </div>
            </section>

            {/* ── FOOTER ────────────────────────────────────────────── */}
            <footer style={{ position: 'relative', zIndex: 1, padding: '40px 48px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
                        <defs><linearGradient id="footerGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#38bdf8" /><stop offset="100%" stopColor="#818cf8" /></linearGradient></defs>
                        <path d="M20 2L36 11V29L20 38L4 29V11L20 2Z" stroke="url(#footerGrad)" strokeWidth="1.5" fill="none" opacity="0.6" />
                        <rect x="9" y="14" width="15" height="12" rx="2.5" fill="url(#footerGrad)" opacity="0.7" />
                        <path d="M24 17L31 13V27L24 23V17Z" fill="url(#footerGrad)" opacity="0.7" />
                    </svg>
                    <span style={{ fontWeight: '700', background: 'linear-gradient(90deg,#38bdf8,#818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>ConnectX</span>
                </div>
                <p style={{ color: '#1e293b', fontSize: '13px', margin: 0 }}>© 2025 ConnectX. Built with ❤️ in India.</p>
                <div style={{ display: 'flex', gap: '24px' }}>
                    {['Privacy', 'Terms', 'Support'].map(item => (
                        <span key={item} style={{ color: '#334155', fontSize: '13px', cursor: 'pointer', transition: 'color 0.2s' }}
                            onMouseEnter={e => e.target.style.color = '#38bdf8'}
                            onMouseLeave={e => e.target.style.color = '#334155'}>{item}</span>
                    ))}
                </div>
            </footer>

            <style>{`
                @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.2)} }
                * { margin: 0; padding: 0; box-sizing: border-box; }
                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-track { background: #040812; }
                ::-webkit-scrollbar-thumb { background: rgba(56,189,248,0.3); border-radius: 3px; }
                ::-webkit-scrollbar-thumb:hover { background: rgba(56,189,248,0.5); }
            `}</style>
        </div>
    );
}
