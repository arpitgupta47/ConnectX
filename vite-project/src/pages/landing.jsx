import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function LandingPage() {
    const navigate = useNavigate();
    const canvasRef = useRef(null);
    const [scrollY, setScrollY] = useState(0);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [statsVisible, setStatsVisible] = useState(false);
    const statsRef = useRef(null);
    const [activeModal, setActiveModal] = useState(null);
    const [counts, setCounts] = useState({ meetings: 0, users: 0, uptime: 0 });
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const handleMouse = e => setMousePos({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
        window.addEventListener('mousemove', handleMouse);
        return () => window.removeEventListener('mousemove', handleMouse);
    }, []);

    useEffect(() => {
        const handleScroll = () => setScrollY(window.scrollY);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

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
        { name: 'Rohan Verma', role: 'Engineering Manager, Flipkart', text: 'ConnectX replaced our Zoom subscription. The AI Meeting Score alone saves us hours every week.', avatar: 'RV' },
        { name: 'Kavya Nair', role: 'Senior Designer, Swiggy', text: 'The live polling feature is game-changing for standups. Our team engagement went up 3x.', avatar: 'KN' },
        { name: 'Nikhil Bansal', role: 'Dev Advocate, Zepto', text: 'Finally a video app built for real collaboration. The AI assistant during client calls is 🔥', avatar: 'NB' },
    ];

    const parallaxX = (mousePos.x - 0.5) * 20;
    const parallaxY = (mousePos.y - 0.5) * 20;

    const scrollToSection = (id) => {
        setMenuOpen(false);
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const openLink = (url) => {
        if (url.startsWith('mailto:')) {
            window.location.href = url;
        } else {
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    };

    const navBtnStyle = {
        background: 'none',
        border: 'none',
        color: '#94a3b8',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
        fontFamily: "'Sora', 'DM Sans', sans-serif",
        padding: '4px 0',
        transition: 'color 0.2s',
    };

    const footerLinkStyle = {
        background: 'none',
        border: 'none',
        color: '#94a3b8',
        fontSize: '13px',
        cursor: 'pointer',
        fontFamily: "'Sora', 'DM Sans', sans-serif",
        padding: '4px 0',
        transition: 'color 0.2s',
    };

    return (
        <div style={{ minHeight: '100vh', background: '#040812', color: 'white', fontFamily: "'Sora', 'DM Sans', sans-serif", overflowX: 'hidden' }}>
            <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />

            <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, zIndex: 0, pointerEvents: 'none' }} />

            {!isMobile && <>
                <div style={{ position: 'fixed', top: '10%', left: '15%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(56,189,248,0.08) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none', zIndex: 0, transform: `translate(${parallaxX * 0.5}px, ${parallaxY * 0.5}px)`, transition: 'transform 0.1s ease' }} />
                <div style={{ position: 'fixed', top: '40%', right: '10%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(167,139,250,0.07) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none', zIndex: 0, transform: `translate(${-parallaxX * 0.3}px, ${-parallaxY * 0.3}px)`, transition: 'transform 0.1s ease' }} />
            </>}

            {/* ── NAVBAR ── */}
            <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: isMobile ? '14px 20px' : '16px 48px', backdropFilter: 'blur(24px)', background: scrollY > 50 ? 'rgba(4,8,18,0.92)' : 'rgba(4,8,18,0.6)', borderBottom: '1px solid rgba(56,189,248,0.08)', transition: 'all 0.4s ease' }}>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <svg width="34" height="34" viewBox="0 0 40 40" fill="none">
                        <defs>
                            <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#38bdf8" />
                                <stop offset="100%" stopColor="#818cf8" />
                            </linearGradient>
                        </defs>
                        <path d="M20 2L36 11V29L20 38L4 29V11L20 2Z" fill="url(#logoGrad)" opacity="0.15" />
                        <path d="M20 2L36 11V29L20 38L4 29V11L20 2Z" stroke="url(#logoGrad)" strokeWidth="1.5" fill="none" />
                        <rect x="9" y="14" width="15" height="12" rx="2.5" fill="url(#logoGrad)" />
                        <path d="M24 17L31 13V27L24 23V17Z" fill="url(#logoGrad)" />
                        <circle cx="12" cy="11" r="1.2" fill="#38bdf8" opacity="0.8" />
                        <circle cx="20" cy="8" r="1.2" fill="#818cf8" opacity="0.8" />
                        <circle cx="28" cy="11" r="1.2" fill="#38bdf8" opacity="0.8" />
                    </svg>
                    <span style={{ fontSize: '1.3rem', fontWeight: '800', background: 'linear-gradient(90deg, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.5px' }}>ConnectX</span>
                </div>

                {/* Desktop nav links */}
                {!isMobile && (
                    <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
                        {[
                            { label: 'Features', id: 'features' },
                            { label: 'Pricing', id: 'pricing' },
                            { label: 'Enterprise', id: 'enterprise' },
                        ].map(item => (
                            <button key={item.label} style={navBtnStyle}
                                onMouseEnter={e => e.currentTarget.style.color = 'white'}
                                onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                                onClick={() => scrollToSection(item.id)}>
                                {item.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Desktop auth buttons */}
                {!isMobile && (
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <button onClick={() => navigate('/auth')}
                            style={{ background: 'transparent', border: '1px solid rgba(56,189,248,0.3)', color: '#38bdf8', padding: '9px 22px', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', transition: 'all 0.2s', fontFamily: 'inherit' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(56,189,248,0.08)'; e.currentTarget.style.borderColor = 'rgba(56,189,248,0.6)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(56,189,248,0.3)'; }}>
                            Sign In
                        </button>
                        <button onClick={() => navigate('/auth')}
                            style={{ background: 'linear-gradient(135deg, #38bdf8, #818cf8)', border: 'none', color: 'white', padding: '9px 22px', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', boxShadow: '0 4px 20px rgba(56,189,248,0.3)', transition: 'all 0.2s', fontFamily: 'inherit' }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(56,189,248,0.45)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(56,189,248,0.3)'; }}>
                            Get Started Free
                        </button>
                    </div>
                )}

                {/* Mobile: Get Started + Hamburger */}
                {isMobile && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button onClick={() => navigate('/auth')}
                            style={{ background: 'linear-gradient(135deg, #38bdf8, #818cf8)', border: 'none', color: 'white', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700', fontFamily: 'inherit' }}>
                            Get Started
                        </button>
                        <button onClick={() => setMenuOpen(!menuOpen)}
                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '8px', padding: '8px 10px', cursor: 'pointer', fontSize: '18px', lineHeight: 1, fontFamily: 'inherit' }}>
                            {menuOpen ? '✕' : '☰'}
                        </button>
                    </div>
                )}
            </nav>

            {/* Mobile Dropdown Menu */}
            {isMobile && menuOpen && (
                <div style={{ position: 'fixed', top: '62px', left: 0, right: 0, zIndex: 99, background: 'rgba(4,8,18,0.97)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(56,189,248,0.1)', padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {[
                        { label: 'Features', id: 'features' },
                        { label: 'Pricing', id: 'pricing' },
                        { label: 'Enterprise', id: 'enterprise' },
                    ].map(item => (
                        <button key={item.label}
                            style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '16px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit', padding: '12px 0', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.05)', width: '100%' }}
                            onClick={() => scrollToSection(item.id)}>
                            {item.label}
                        </button>
                    ))}
                    <button onClick={() => { navigate('/auth'); setMenuOpen(false); }}
                        style={{ background: 'transparent', border: '1px solid rgba(56,189,248,0.3)', color: '#38bdf8', padding: '12px', borderRadius: '10px', cursor: 'pointer', fontSize: '15px', fontWeight: '600', fontFamily: 'inherit', marginTop: '8px' }}>
                        Sign In
                    </button>
                </div>
            )}

            {/* ── HERO ── */}
            <section style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', textAlign: 'center', padding: isMobile ? '100px 20px 60px' : '120px 24px 80px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.25)', borderRadius: '100px', padding: '7px 16px', marginBottom: '28px', fontSize: '12px', color: '#38bdf8', fontWeight: '500', textAlign: 'center' }}>
                    <span style={{ width: '7px', height: '7px', background: '#4ade80', borderRadius: '50%', display: 'inline-block', flexShrink: 0, animation: 'pulse 2s infinite' }} />
                    Now with AI Meeting Intelligence — Free
                </div>

                <h1 style={{ fontSize: isMobile ? '2.4rem' : 'clamp(3rem, 7vw, 6.5rem)', fontWeight: '800', lineHeight: 1.1, marginBottom: '20px', maxWidth: '900px', letterSpacing: isMobile ? '-1px' : '-2px', padding: '0 4px' }}>
                    The Meeting Platform<br />
                    <span style={{ background: 'linear-gradient(90deg, #38bdf8 0%, #818cf8 50%, #f472b6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        That Works For You
                    </span>
                </h1>

                <p style={{ fontSize: isMobile ? '0.95rem' : 'clamp(1rem, 2vw, 1.25rem)', color: '#64748b', maxWidth: '520px', lineHeight: 1.75, marginBottom: '36px', fontWeight: '400', padding: '0 8px' }}>
                    HD video. AI-powered insights. Live polls. Real-time collaboration.
                    {!isMobile && <br />}
                    {isMobile ? ' ' : ''}Everything your team needs — in one place.
                </p>

                <div style={{ display: 'flex', gap: '12px', flexDirection: isMobile ? 'column' : 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: isMobile ? '48px' : '72px', width: isMobile ? '100%' : 'auto', padding: isMobile ? '0 20px' : '0' }}>
                    <button onClick={() => navigate('/auth')}
                        style={{ background: 'linear-gradient(135deg, #38bdf8, #818cf8)', border: 'none', color: 'white', padding: isMobile ? '16px 24px' : '18px 40px', borderRadius: '14px', fontSize: isMobile ? '1rem' : '1.05rem', fontWeight: '700', cursor: 'pointer', boxShadow: '0 8px 32px rgba(56,189,248,0.35)', transition: 'all 0.25s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontFamily: 'inherit', width: isMobile ? '100%' : 'auto' }}>
                        🚀 Start Meeting — Free
                    </button>
                    <button onClick={() => navigate('/auth')}
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', padding: isMobile ? '16px 24px' : '18px 40px', borderRadius: '14px', fontSize: isMobile ? '1rem' : '1.05rem', cursor: 'pointer', fontWeight: '500', transition: 'all 0.25s', backdropFilter: 'blur(10px)', fontFamily: 'inherit', width: isMobile ? '100%' : 'auto' }}>
                        Join a Meeting →
                    </button>
                </div>

                {/* Mock UI */}
                <div style={{ position: 'relative', width: '100%', maxWidth: '860px', transform: isMobile ? 'none' : `perspective(1200px) rotateX(4deg) translateY(${scrollY * 0.1}px)`, transition: 'transform 0.1s linear', padding: isMobile ? '0 4px' : '0' }}>
                    <div style={{ position: 'absolute', inset: '-20px', background: 'radial-gradient(ellipse at center, rgba(56,189,248,0.15) 0%, transparent 70%)', borderRadius: '32px', filter: 'blur(20px)', pointerEvents: 'none' }} />
                    <div style={{ position: 'relative', background: 'rgba(10,14,26,0.9)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '20px', overflow: 'hidden', backdropFilter: 'blur(10px)', boxShadow: '0 40px 120px rgba(0,0,0,0.8)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} />
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#4ade80' }} />
                            {!isMobile && (
                                <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                                    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '6px', padding: '4px 20px', fontSize: '12px', color: '#475569' }}>connectx.onrender.com/meeting</div>
                                </div>
                            )}
                        </div>
                        <div style={{ padding: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            {[
                                { name: 'Participant 1(Host) 👑', color: 'rgba(56,189,248,0.15)', border: 'rgba(56,189,248,0.3)', active: true },
                                { name: 'Participant 2', color: 'rgba(129,140,248,0.12)', border: 'rgba(129,140,248,0.2)', active: false },
                                { name: 'Participant 3', color: 'rgba(244,114,182,0.1)', border: 'rgba(244,114,182,0.2)', active: false },
                                { name: 'Participant 4', color: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.2)', active: false },
                            ].map((p, i) => (
                                <div key={i} style={{ background: p.color, border: `1px solid ${p.border}`, borderRadius: '12px', height: isMobile ? '80px' : '120px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', position: 'relative', overflow: 'hidden' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: `linear-gradient(135deg, ${p.border}, transparent)`, border: `2px solid ${p.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', color: 'white' }}>
                                        {p.name[0]}
                                    </div>
                                    <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '500', textAlign: 'center', padding: '0 4px' }}>{p.name}</span>
                                    {p.active && <div style={{ position: 'absolute', top: '6px', right: '6px', width: '7px', height: '7px', background: '#4ade80', borderRadius: '50%', animation: 'pulse 2s infinite' }} />}
                                </div>
                            ))}
                        </div>
                        <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'center', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                            {(isMobile ? ['🤖 AI', '🗳️ Poll', '📹', '🎤'] : ['🤖 AI', '🗳️ Poll', '📊 Score', '📹', '🎤', '💬']).map((btn, i) => (
                                <div key={i} style={{ padding: isMobile ? '6px 10px' : '7px 14px', borderRadius: '8px', background: i === 0 ? 'linear-gradient(135deg,#38bdf8,#818cf8)' : 'rgba(255,255,255,0.06)', border: `1px solid ${i === 0 ? 'transparent' : 'rgba(255,255,255,0.1)'}`, fontSize: isMobile ? '11px' : '12px', color: 'white', fontWeight: i < 2 ? '700' : '400' }}>{btn}</div>
                            ))}
                            <div style={{ padding: isMobile ? '6px 10px' : '7px 14px', borderRadius: '8px', background: '#ef4444', fontSize: isMobile ? '11px' : '12px', color: 'white', fontWeight: '700' }}>✕ End</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── STATS ── */}
            <section ref={statsRef} style={{ position: 'relative', zIndex: 1, padding: isMobile ? '48px 20px' : '80px 48px', display: 'flex', justifyContent: 'center', gap: isMobile ? '32px' : '80px', flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                {[
                    { value: counts.meetings >= 1000000 ? `${(counts.meetings / 1000000).toFixed(1)}M+` : `${Math.floor(counts.meetings / 1000)}K+`, label: 'Meetings Hosted', color: '#38bdf8' },
                    { value: counts.users >= 1000000 ? `${(counts.users / 1000000).toFixed(1)}M+` : `${Math.floor(counts.users / 1000)}K+`, label: 'Active Users', color: '#818cf8' },
                    { value: `${counts.uptime}%`, label: 'Uptime Guaranteed', color: '#4ade80' },
                    { value: '0₹', label: 'To Get Started', color: '#f59e0b' },
                ].map((s, i) => (
                    <div key={i} style={{ textAlign: 'center', minWidth: isMobile ? 'calc(50% - 16px)' : 'auto' }}>
                        <div style={{ fontSize: isMobile ? '2rem' : 'clamp(2rem, 4vw, 3.5rem)', fontWeight: '800', color: s.color, letterSpacing: '-1px', marginBottom: '6px' }}>{s.value}</div>
                        <div style={{ color: '#475569', fontSize: '12px', fontWeight: '500', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{s.label}</div>
                    </div>
                ))}
            </section>

            {/* ── FEATURES ── */}
            <section id="features" style={{ position: 'relative', zIndex: 1, padding: isMobile ? '72px 20px' : '120px 48px', maxWidth: '1100px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '48px' }}>
                    <div style={{ display: 'inline-block', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: '100px', padding: '6px 18px', fontSize: '12px', color: '#a78bfa', fontWeight: '600', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                        Everything You Need
                    </div>
                    <h2 style={{ fontSize: isMobile ? '1.8rem' : 'clamp(2rem, 4vw, 3.5rem)', fontWeight: '800', letterSpacing: '-1px', marginBottom: '12px', lineHeight: 1.15 }}>
                        Not just video calls.<br />
                        <span style={{ background: 'linear-gradient(90deg, #a78bfa, #38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Smart meetings.</span>
                    </h2>
                    <p style={{ color: '#475569', fontSize: '1rem', maxWidth: '480px', margin: '0 auto', lineHeight: 1.7 }}>
                        Every feature is built to make your meetings more productive and your team more connected.
                    </p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                    {features.map((f, i) => (
                        <div key={i}
                            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '18px', padding: isMobile ? '24px 20px' : '32px 28px', transition: 'all 0.3s ease', cursor: 'default', position: 'relative', overflow: 'hidden', display: 'flex', gap: isMobile ? '16px' : '0', flexDirection: isMobile ? 'row' : 'column', alignItems: isMobile ? 'flex-start' : 'flex-start' }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = `${f.color}40`; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}>
                            <div style={{ fontSize: isMobile ? '1.8rem' : '2.4rem', marginBottom: isMobile ? '0' : '18px', flexShrink: 0 }}>{f.icon}</div>
                            <div>
                                <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '6px', color: 'white' }}>{f.title}</h3>
                                <p style={{ color: '#475569', fontSize: '0.85rem', lineHeight: 1.7, margin: 0 }}>{f.desc}</p>
                            </div>
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${f.color}, transparent)`, opacity: 0.4 }} />
                        </div>
                    ))}
                </div>
            </section>

            {/* ── PRICING ── */}
            <section id="pricing" style={{ position: 'relative', zIndex: 1, padding: isMobile ? '72px 20px' : '120px 48px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ textAlign: 'center', marginBottom: '48px' }}>
                    <div style={{ display: 'inline-block', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: '100px', padding: '6px 18px', fontSize: '12px', color: '#34d399', fontWeight: '600', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                        Pricing
                    </div>
                    <h2 style={{ fontSize: isMobile ? '1.8rem' : 'clamp(2rem, 4vw, 3.5rem)', fontWeight: '800', letterSpacing: '-1px', marginBottom: '12px', lineHeight: 1.1 }}>
                        Simple, transparent<br />
                        <span style={{ background: 'linear-gradient(90deg, #34d399, #38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>pricing.</span>
                    </h2>
                    <p style={{ color: '#475569', fontSize: '1rem', maxWidth: '420px', margin: '0 auto', lineHeight: 1.7 }}>No hidden fees. No credit card required to start.</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', maxWidth: '900px', margin: '0 auto' }}>
                    {[
                        { plan: 'Free', price: '₹0', desc: 'Perfect for individuals and small teams.', features: ['Unlimited meetings', 'Up to 10 participants', 'HD video & audio', 'AI Assistant', 'Screen sharing'], color: '#38bdf8', highlight: false },
                        { plan: 'Pro', price: '₹499/mo', desc: 'For growing teams that need more power.', features: ['Everything in Free', 'Up to 100 participants', 'AI Meeting Score', 'Live Polling', 'Meeting recordings', 'Priority support'], color: '#818cf8', highlight: true },
                        { plan: 'Enterprise', price: 'Custom', desc: 'For large organizations with custom needs.', features: ['Everything in Pro', 'Unlimited participants', 'Custom integrations', 'Dedicated support', 'SLA guarantee', 'Admin dashboard'], color: '#f472b6', highlight: false },
                    ].map((p, i) => (
                        <div key={i}
                            style={{ background: p.highlight ? 'rgba(129,140,248,0.08)' : 'rgba(255,255,255,0.02)', border: `1px solid ${p.highlight ? 'rgba(129,140,248,0.4)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '20px', padding: '28px 24px', position: 'relative', transition: 'all 0.3s' }}>
                            {p.highlight && (
                                <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg,#818cf8,#38bdf8)', borderRadius: '100px', padding: '4px 16px', fontSize: '11px', fontWeight: '700', color: 'white', whiteSpace: 'nowrap' }}>⭐ Most Popular</div>
                            )}
                            <div style={{ fontSize: '13px', fontWeight: '600', color: p.color, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>{p.plan}</div>
                            <div style={{ fontSize: '2.2rem', fontWeight: '800', color: 'white', marginBottom: '6px', letterSpacing: '-1px' }}>{p.price}</div>
                            <div style={{ color: '#475569', fontSize: '13px', marginBottom: '20px', lineHeight: 1.6 }}>{p.desc}</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                                {p.features.map((f, j) => (
                                    <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#94a3b8' }}>
                                        <span style={{ color: p.color, fontWeight: '700', fontSize: '15px' }}>✓</span> {f}
                                    </div>
                                ))}
                            </div>
                            <button
                                style={{ width: '100%', padding: '12px', borderRadius: '12px', background: p.highlight ? 'linear-gradient(135deg,#818cf8,#38bdf8)' : 'transparent', color: 'white', fontWeight: '700', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit', border: p.highlight ? 'none' : `1px solid ${p.color}60` }}
                                onClick={() => p.plan === 'Enterprise' ? setActiveModal('modal-contact') : navigate('/auth')}>
                                {p.plan === 'Enterprise' ? 'Contact Us' : 'Get Started Free'}
                            </button>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── ENTERPRISE ── */}
            <section id="enterprise" style={{ position: 'relative', zIndex: 1, padding: isMobile ? '72px 20px' : '120px 48px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '32px' : '60px', alignItems: 'center' }}>
                    <div>
                        <div style={{ display: 'inline-block', background: 'rgba(244,114,182,0.1)', border: '1px solid rgba(244,114,182,0.25)', borderRadius: '100px', padding: '6px 18px', fontSize: '12px', color: '#f472b6', fontWeight: '600', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                            Enterprise
                        </div>
                        <h2 style={{ fontSize: isMobile ? '1.8rem' : 'clamp(1.8rem, 3vw, 2.8rem)', fontWeight: '800', letterSpacing: '-1px', marginBottom: '14px', lineHeight: 1.15 }}>
                            Built for teams<br />
                            <span style={{ background: 'linear-gradient(90deg,#f472b6,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>of any size.</span>
                        </h2>
                        <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.8, marginBottom: '28px' }}>
                            Get dedicated infrastructure, custom integrations, compliance tools, and a support team that actually picks up the phone.
                        </p>
                        <button
                            onClick={() => setActiveModal('modal-contact')}
                            style={{ background: 'linear-gradient(135deg,#f472b6,#a78bfa)', border: 'none', color: 'white', padding: '14px 32px', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 8px 32px rgba(244,114,182,0.3)', transition: 'all 0.25s', fontFamily: 'inherit', width: isMobile ? '100%' : 'auto' }}>
                            Contact Us →
                        </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {[
                            { icon: '🏢', title: 'Custom Deployment', desc: 'On-premise or private cloud options available.' },
                            { icon: '🔒', title: 'SSO & Compliance', desc: 'SAML, GDPR, SOC2 and enterprise security standards.' },
                            { icon: '📞', title: 'Dedicated Support', desc: '24/7 support with a named account manager.' },
                            { icon: '📈', title: 'Advanced Analytics', desc: 'Full usage reports, engagement metrics, and exports.' },
                        ].map((item, i) => (
                            <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '16px' }}>
                                <div style={{ fontSize: '1.4rem', flexShrink: 0 }}>{item.icon}</div>
                                <div>
                                    <div style={{ fontWeight: '700', fontSize: '13px', marginBottom: '3px', color: 'white' }}>{item.title}</div>
                                    <div style={{ color: '#475569', fontSize: '12px', lineHeight: 1.6 }}>{item.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── TESTIMONIALS ── */}
            <section style={{ position: 'relative', zIndex: 1, padding: isMobile ? '72px 20px' : '100px 48px', background: 'rgba(255,255,255,0.01)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <h2 style={{ fontSize: isMobile ? '1.6rem' : 'clamp(1.8rem, 3.5vw, 3rem)', fontWeight: '800', letterSpacing: '-1px', marginBottom: '10px' }}>
                        Loved by teams <span style={{ background: 'linear-gradient(90deg,#f472b6,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>across India</span>
                    </h2>
                    <p style={{ color: '#475569', fontSize: '0.95rem' }}>Real stories from real users</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', maxWidth: '1000px', margin: '0 auto' }}>
                    {testimonials.map((t, i) => (
                        <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '24px' }}>
                            <div style={{ fontSize: '1.3rem', marginBottom: '12px', color: '#f59e0b' }}>❝</div>
                            <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.75, marginBottom: '18px' }}>{t.text}</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg,#38bdf8,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', flexShrink: 0 }}>{t.avatar}</div>
                                <div>
                                    <div style={{ fontWeight: '700', fontSize: '13px' }}>{t.name}</div>
                                    <div style={{ color: '#475569', fontSize: '11px' }}>{t.role}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── CTA ── */}
            <section style={{ position: 'relative', zIndex: 1, padding: isMobile ? '60px 20px' : '120px 48px', textAlign: 'center' }}>
                <div style={{ position: 'relative', maxWidth: '700px', margin: '0 auto', padding: isMobile ? '48px 24px' : '72px 48px', background: 'rgba(56,189,248,0.04)', border: '1px solid rgba(56,189,248,0.15)', borderRadius: '28px', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: '-50px', left: '50%', transform: 'translateX(-50%)', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(56,189,248,0.12) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                        <svg width="52" height="52" viewBox="0 0 40 40" fill="none">
                            <defs><linearGradient id="ctaLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#38bdf8" /><stop offset="100%" stopColor="#818cf8" /></linearGradient></defs>
                            <path d="M20 2L36 11V29L20 38L4 29V11L20 2Z" fill="url(#ctaLogoGrad)" opacity="0.2" />
                            <path d="M20 2L36 11V29L20 38L4 29V11L20 2Z" stroke="url(#ctaLogoGrad)" strokeWidth="1.5" fill="none" />
                            <rect x="9" y="14" width="15" height="12" rx="2.5" fill="url(#ctaLogoGrad)" />
                            <path d="M24 17L31 13V27L24 23V17Z" fill="url(#ctaLogoGrad)" />
                        </svg>
                    </div>
                    <h2 style={{ fontSize: isMobile ? '1.7rem' : 'clamp(2rem, 4vw, 3rem)', fontWeight: '800', letterSpacing: '-1px', marginBottom: '14px', lineHeight: 1.15 }}>
                        Your next great meeting<br />
                        <span style={{ background: 'linear-gradient(90deg,#38bdf8,#818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>starts right now.</span>
                    </h2>
                    <p style={{ color: '#475569', marginBottom: '32px', fontSize: '0.95rem', lineHeight: 1.7 }}>
                        No downloads. No credit card. No limits.<br />
                        Just you, your team, and the best meeting experience.
                    </p>
                    <button onClick={() => navigate('/auth')}
                        style={{ background: 'linear-gradient(135deg,#38bdf8,#818cf8)', border: 'none', color: 'white', padding: isMobile ? '16px 32px' : '18px 48px', borderRadius: '14px', fontSize: '1rem', fontWeight: '700', cursor: 'pointer', boxShadow: '0 8px 40px rgba(56,189,248,0.4)', transition: 'all 0.25s', fontFamily: 'inherit', width: isMobile ? '100%' : 'auto' }}>
                        🚀 Launch ConnectX Free
                    </button>
                </div>
            </section>

            {/* ── FOOTER ── */}
            <footer style={{ position: 'relative', zIndex: 1, padding: isMobile ? '28px 20px' : '40px 48px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'center' : 'center', gap: '16px', textAlign: isMobile ? 'center' : 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <svg width="26" height="26" viewBox="0 0 40 40" fill="none">
                        <defs><linearGradient id="footerGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#38bdf8" /><stop offset="100%" stopColor="#818cf8" /></linearGradient></defs>
                        <path d="M20 2L36 11V29L20 38L4 29V11L20 2Z" stroke="url(#footerGrad)" strokeWidth="1.5" fill="none" opacity="0.6" />
                        <rect x="9" y="14" width="15" height="12" rx="2.5" fill="url(#footerGrad)" opacity="0.7" />
                        <path d="M24 17L31 13V27L24 23V17Z" fill="url(#footerGrad)" opacity="0.7" />
                    </svg>
                    <span style={{ fontWeight: '700', background: 'linear-gradient(90deg,#38bdf8,#818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>ConnectX</span>
                </div>
                <p style={{ color: '#475569', fontSize: '12px', margin: 0 }}>© 2026 ConnectX. Built with ❤️ in India.</p>
                <div style={{ display: 'flex', gap: '24px' }}>
                    {[
                        { label: 'Privacy', action: 'modal-privacy' },
                        { label: 'Terms', action: 'modal-terms' },
                        { label: 'Support', url: 'mailto:guptaarpit.tech@gmail.com' },
                    ].map(item => (
                        <button key={item.label} style={footerLinkStyle}
                            onMouseEnter={e => e.currentTarget.style.color = '#38bdf8'}
                            onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                            onClick={() => item.url ? openLink(item.url) : setActiveModal(item.action)}>
                            {item.label}
                        </button>
                    ))}
                </div>
            </footer>

            {/* ── MODALS ── */}
            {activeModal && (
                <div onClick={() => setActiveModal(null)}
                    style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? '0' : '24px' }}>
                    <div onClick={e => e.stopPropagation()}
                        style={{ background: '#0d1526', border: '1px solid rgba(56,189,248,0.2)', borderRadius: isMobile ? '20px 20px 0 0' : '24px', padding: isMobile ? '28px 20px 36px' : '40px', maxWidth: '620px', width: '100%', maxHeight: isMobile ? '85vh' : '80vh', overflowY: 'auto', position: 'relative' }}>
                        <button onClick={() => setActiveModal(null)}
                            style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: '8px', padding: '4px 10px', cursor: 'pointer', fontSize: '16px', lineHeight: 1, fontFamily: 'inherit' }}>
                            ✕
                        </button>

                        {activeModal === 'modal-privacy' && (
                            <>
                                <h2 style={{ fontSize: '1.6rem', fontWeight: '800', marginBottom: '6px', background: 'linear-gradient(90deg,#38bdf8,#818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Privacy Policy</h2>
                                <p style={{ color: '#475569', fontSize: '12px', marginBottom: '24px' }}>Last updated: January 1, 2026</p>
                                {[
                                    { title: '1. Information We Collect', body: 'We collect information you provide directly to us, such as when you create an account, start or join a meeting, or contact us for support. This includes your name, email address, and usage data related to meetings you host or attend on ConnectX.' },
                                    { title: '2. How We Use Your Information', body: 'We use the information we collect to provide, maintain, and improve our services; to send you technical notices and support messages; to respond to your comments and questions; and to monitor and analyze usage trends.' },
                                    { title: '3. Data Sharing', body: 'We do not sell your personal data to third parties. We may share your information with trusted service providers who assist us in operating our platform, subject to confidentiality agreements. We may also disclose information if required by law.' },
                                    { title: '4. Cookies', body: 'ConnectX uses cookies and similar tracking technologies to track activity on our service and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.' },
                                    { title: '5. Data Security', body: 'We take reasonable measures to help protect your personal information from loss, theft, misuse and unauthorized access. All data transmitted through ConnectX is encrypted using industry-standard TLS protocols.' },
                                    { title: '6. Your Rights', body: 'You have the right to access, update, or delete the personal information we hold about you. You can do this by contacting us at guptaarpit.tech@gmail.com.' },
                                    { title: '7. Contact Us', body: 'If you have any questions about this Privacy Policy, please contact us at guptaarpit.tech@gmail.com.' },
                                ].map((section, i) => (
                                    <div key={i} style={{ marginBottom: '18px' }}>
                                        <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#38bdf8', marginBottom: '6px' }}>{section.title}</h3>
                                        <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: 1.8 }}>{section.body}</p>
                                    </div>
                                ))}
                            </>
                        )}

                        {activeModal === 'modal-terms' && (
                            <>
                                <h2 style={{ fontSize: '1.6rem', fontWeight: '800', marginBottom: '6px', background: 'linear-gradient(90deg,#38bdf8,#818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Terms & Conditions</h2>
                                <p style={{ color: '#475569', fontSize: '12px', marginBottom: '24px' }}>Last updated: January 1, 2026</p>
                                {[
                                    { title: '1. Acceptance of Terms', body: 'By accessing or using ConnectX, you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our service.' },
                                    { title: '2. Use of Service', body: 'ConnectX grants you a limited, non-exclusive, non-transferable license to use the service for your personal or business communication purposes. You may not use the service for any unlawful purpose or in any way that could damage or impair the service.' },
                                    { title: '3. User Accounts', body: 'You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.' },
                                    { title: '4. Prohibited Conduct', body: 'You agree not to: (a) upload or transmit any harmful, offensive, or illegal content; (b) attempt to gain unauthorized access to any part of the service; (c) interfere with or disrupt the integrity or performance of the service; (d) collect data about other users without their consent.' },
                                    { title: '5. Intellectual Property', body: 'The ConnectX name, logo, and all related content are the intellectual property of ConnectX and are protected by applicable laws. You may not use any of our trademarks or service marks without our prior written permission.' },
                                    { title: '6. Limitation of Liability', body: 'ConnectX shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service. Our total liability shall not exceed the amount you paid us in the past 12 months.' },
                                    { title: '7. Changes to Terms', body: 'We reserve the right to modify these terms at any time. We will notify users of significant changes via email or a prominent notice on our website. Continued use after changes constitutes acceptance of the new terms.' },
                                    { title: '8. Contact', body: 'For any questions regarding these Terms, please contact us at guptaarpit.tech@gmail.com.' },
                                ].map((section, i) => (
                                    <div key={i} style={{ marginBottom: '18px' }}>
                                        <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#818cf8', marginBottom: '6px' }}>{section.title}</h3>
                                        <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: 1.8 }}>{section.body}</p>
                                    </div>
                                ))}
                            </>
                        )}

                        {activeModal === 'modal-contact' && (
                            <>
                                <h2 style={{ fontSize: '1.6rem', fontWeight: '800', marginBottom: '8px', background: 'linear-gradient(90deg,#f472b6,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Contact Us</h2>
                                <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: 1.7, marginBottom: '24px' }}>
                                    Interested in ConnectX Enterprise? We'd love to hear from you. Reach out and our team will get back to you within 24 hours.
                                </p>
                                <div style={{ background: 'rgba(244,114,182,0.06)', border: '1px solid rgba(244,114,182,0.2)', borderRadius: '16px', padding: '24px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '2rem', marginBottom: '10px' }}>✉️</div>
                                    <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '10px' }}>Mail us at</p>
                                    <a href="mailto:guptaarpit.tech@gmail.com"
                                        style={{ color: '#f472b6', fontSize: isMobile ? '0.95rem' : '1.1rem', fontWeight: '700', textDecoration: 'none', letterSpacing: '0.3px', wordBreak: 'break-all' }}>
                                        guptaarpit.tech@gmail.com
                                    </a>
                                    <p style={{ color: '#475569', fontSize: '12px', marginTop: '10px' }}>We respond within 24 hours on business days.</p>
                                </div>
                                <button onClick={() => openLink('mailto:guptaarpit.tech@gmail.com')}
                                    style={{ width: '100%', marginTop: '18px', padding: '14px', borderRadius: '12px', background: 'linear-gradient(135deg,#f472b6,#a78bfa)', border: 'none', color: 'white', fontWeight: '700', fontSize: '15px', cursor: 'pointer', fontFamily: 'inherit' }}>
                                    📧 Open Mail App
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

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
