"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const router = useRouter();

  // Form State
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "">("");
  const [userId, setUserId] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [qrUrl, setQrUrl] = useState("https://mawaddah.live");
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // PWA Install State & Logic
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
        setShowInstallBtn(false);
      }
    } else {
      document.getElementById("pwa")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  // FAQ State
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  useEffect(() => {
    // Check session
    const checkSession = async () => {
      try {
        const sessionRes = await fetch("/api/auth/me");
        if (sessionRes.ok) {
          const profileRes = await fetch("/api/profile");
          const profileData = await profileRes.json();
          router.replace(profileData.profile ? "/browse" : "/setup");
        }
      } catch {}
    };
    checkSession();

    // Fetch LAN IP for local QR scanning
    const fetchConfig = async () => {
      try {
        const res = await fetch("/api/config");
        const data = await res.json();
        if (data.localIp && typeof window !== "undefined") {
          if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
            setQrUrl(`http://${data.localIp}:3002`);
          } else {
            setQrUrl(window.location.origin);
          }
        }
      } catch {
        if (typeof window !== "undefined") {
          setQrUrl(window.location.origin);
        }
      }
    };
    fetchConfig();
  }, [router]);

  const handleSendOTP = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("");
    if (!phone || !gender) {
      setError("يرجى إدخال رقم الهاتف واختيار الجنس");
      return;
    }
    setLoading(true);

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, gender }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "حدث خطأ في إرسال الرمز.");
        setLoading(false);
        return;
      }

      setUserId(data.userId);
      setStep("otp");
      
      if (data.dev_code) {
        setOtp(data.dev_code.split(""));
      }
    } catch {
      setError("مشكلة في الاتصال، حاول مجدداً");
    } finally {
      setLoading(false);
    }
  };

  const handleOTPChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOTPKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async () => {
    setError("");
    const code = otp.join("");
    if (code.length !== 6) return;
    
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "كود غير صحيح، جرب تاني.");
        setLoading(false);
        return;
      }

      if (data.isAdmin) router.push("/admin");
      else if (data.hasProfile) router.push("/browse");
      else router.push("/setup");

    } catch {
      setError("مشكلة في الاتصال");
      setLoading(false);
    }
  };

  useEffect(() => {
    if (step === "otp" && otp.every((d) => d !== "")) {
      handleVerifyOTP();
    }
  }, [otp, step]);

  const scrollToAuth = () => {
    document.getElementById("auth-section")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="mawaddah-landing">
      {/* Dynamic CSS Styling Injector */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&family=Cairo:wght@300;400;600;700;800&display=swap');

        :root {
          --p: #0c2d20; --pl: #184e39; --pg: rgba(12,45,32,0.06);
          --a: #c5a059; --al: #dfcc9f; --as: rgba(197,160,89,0.12);
          --bg: #faf8f5; --card: rgba(255,255,255,0.85);
          --bdr: rgba(12,45,32,0.08); --t: #1c2621; --tm: #4f635a;
        }

        @keyframes orb1 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(40px,-30px) scale(1.1)} }
        @keyframes orb2 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-35px,25px) scale(0.95)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(197,160,89,0.35)} 50%{box-shadow:0 0 0 10px rgba(197,160,89,0)} }
        @keyframes spin { to{transform:rotate(360deg)} }

        .mawaddah-landing {
          font-family:'IBM Plex Sans Arabic','Cairo',sans-serif; direction:rtl; color:var(--t);
          min-height:100vh; overflow-x:hidden; position:relative;
          background:linear-gradient(160deg,#faf8f5 0%,#f5eedf 50%,#f7f3ea 100%);
        }

        .mawaddah-landing::before,.mawaddah-landing::after {
          content:''; position:fixed; border-radius:50%; filter:blur(80px); pointer-events:none; z-index:0;
        }
        .mawaddah-landing::before {
          width:600px; height:600px; top:-120px; right:-150px;
          background:radial-gradient(circle,rgba(12,45,32,0.06),transparent 70%);
          animation:orb1 12s ease-in-out infinite;
        }
        .mawaddah-landing::after {
          width:500px; height:500px; bottom:-100px; left:-100px;
          background:radial-gradient(circle,rgba(197,160,89,0.08),transparent 70%);
          animation:orb2 15s ease-in-out infinite;
        }

        .mawaddah-landing > * { position:relative; z-index:1; }

        /* NAVBAR */
        .mawaddah-navbar {
          position:sticky; top:0; z-index:1000;
          background:rgba(250,248,245,0.85); backdrop-filter:blur(20px);
          border-bottom:1px solid var(--bdr);
          box-shadow:0 1px 24px rgba(12,45,32,0.04);
        }
        .navbar-container {
          max-width:1200px; margin:0 auto; padding:14px 28px;
          display:flex; justify-content:space-between; align-items:center;
        }
        .navbar-logo {
          display:flex; align-items:center; gap:10px;
          font-weight:700; font-size:22px; color:var(--p); text-decoration:none; letter-spacing:-0.5px;
        }
        .navbar-links { display:flex; gap:28px; }
        .navbar-links a {
          color:var(--tm); font-weight:600; font-size:14px;
          text-decoration:none; cursor:pointer; transition:color 0.2s;
          position:relative; padding-bottom:2px;
        }
        .navbar-links a::after {
          content:''; position:absolute; bottom:0; right:0;
          width:0; height:2px; background:var(--a); transition:width 0.25s;
        }
        .navbar-links a:hover { color:var(--p); }
        .navbar-links a:hover::after { width:100%; }

        .navbar-ctas { display:flex; gap:10px; align-items:center; }

        .navbar-install {
          background:var(--as); color:var(--a) !important;
          padding:9px 16px; border-radius:10px; font-weight:700;
          border:1px solid rgba(197,160,89,0.3); cursor:pointer;
          transition:all 0.22s; font-size:13px; font-family:'IBM Plex Sans Arabic',sans-serif;
          display:flex; align-items:center; gap:6px;
        }
        .navbar-install:hover { background:rgba(197,160,89,0.22); transform:translateY(-2px); }

        .navbar-login {
          background:transparent; color:var(--p) !important;
          padding:9px 16px; border-radius:10px; font-weight:700;
          border:1.5px solid var(--p); cursor:pointer;
          transition:all 0.22s; font-size:13px; font-family:'IBM Plex Sans Arabic',sans-serif;
          display:flex; align-items:center; gap:6px;
        }
        .navbar-login:hover { background:var(--pg); transform:translateY(-2px); }

        .navbar-cta {
          background:linear-gradient(135deg,var(--p),var(--pl));
          color:white !important; padding:10px 22px; border-radius:12px;
          font-weight:700; font-size:14px; font-family:'IBM Plex Sans Arabic',sans-serif;
          border:none; cursor:pointer; transition:all 0.22s;
          box-shadow:0 4px 16px rgba(12,45,32,0.15);
          display:flex; align-items:center; gap:6px;
        }
        .navbar-cta:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(12,45,32,0.25); }

        /* HERO */
        .hero-section {
          max-width:1200px; margin:0 auto; padding:80px 28px;
          display:grid; grid-template-columns:1.15fr 0.85fr; gap:64px; align-items:center;
        }
        .hero-info { display:flex; flex-direction:column; gap:28px; animation:fadeUp 0.7s ease both; }

        .hero-badge {
          display:inline-flex; align-items:center; gap:8px;
          background:var(--as); color:var(--a); padding:7px 18px;
          border-radius:30px; font-size:13px; font-weight:700; align-self:flex-start;
          border:1px solid rgba(197,160,89,0.2); letter-spacing:0.3px;
        }

        .hero-title-main {
          font-size:44px; font-weight:700; line-height:1.25; color:var(--p);
          letter-spacing:-1px;
        }
        .hero-title-main span {
          background:linear-gradient(135deg,var(--a),var(--al));
          -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
        }
        .hero-desc { font-size:17px; line-height:1.7; color:var(--tm); font-weight:400; }

        .hero-bullet-list { display:flex; flex-direction:column; gap:14px; }
        .hero-bullet-item { display:flex; align-items:center; gap:14px; font-size:15px; font-weight:600; color:var(--t); }
        .hero-bullet-icon {
          width:44px; height:44px; border-radius:12px; flex-shrink:0;
          background:white; border:1px solid var(--bdr);
          box-shadow:0 4px 14px rgba(12,45,32,0.03);
          display:flex; align-items:center; justify-content:center;
          transition:transform 0.2s;
        }
        .hero-bullet-item:hover .hero-bullet-icon { transform:scale(1.08); }

        /* AUTH CARD */
        .auth-card-wrapper { display:flex; justify-content:flex-start; animation:fadeUp 0.85s 0.1s ease both; }
        .auth-card-modern-landing {
          background:var(--card); backdrop-filter:blur(24px);
          border:1px solid rgba(255,255,255,0.6);
          border-radius:28px; padding:40px 36px; width:100%; max-width:430px;
          box-shadow:0 24px 60px rgba(12,45,32,0.06), 0 0 0 1px rgba(255,255,255,0.4) inset;
        }
        .auth-header { text-align:center; margin-bottom:28px; }
        .auth-header h2 { font-size:20px; font-weight:700; color:var(--p); margin-bottom:6px; }
        .auth-header p { font-size:13px; color:var(--tm); }

        .gender-select-landing { display:flex; gap:12px; }
        .gender-btn-landing {
          flex:1; padding:13px; border-radius:12px; border:1.5px solid var(--bdr);
          background:white; color:var(--tm); font-family:'IBM Plex Sans Arabic',sans-serif;
          font-weight:600; font-size:14px; cursor:pointer; transition:all 0.22s;
          display:flex; align-items:center; justify-content:center; gap:2px;
        }
        .gender-btn-landing:hover { border-color:var(--p); }
        .gender-btn-landing.active {
          border-color:var(--p); background:var(--pg);
          color:var(--p); box-shadow:0 4px 14px rgba(12,45,32,0.06);
        }

        /* FEATURES */
        .features-section {
          background:linear-gradient(180deg,rgba(255,255,255,0.5),rgba(250,248,245,0.3));
          border-top:1px solid var(--bdr); border-bottom:1px solid var(--bdr);
          padding:100px 28px; backdrop-filter:blur(4px);
        }
        .section-header {
          text-align:center; max-width:560px; margin:0 auto 60px;
          display:flex; flex-direction:column; gap:12px;
        }
        .section-header h2 { font-size:34px; font-weight:700; color:var(--p); letter-spacing:-0.5px; }
        .section-header p { color:var(--tm); font-size:16px; line-height:1.6; }

        .features-grid {
          max-width:1200px; margin:0 auto;
          display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:24px;
        }
        .feature-card-modern {
          background:rgba(255,255,255,0.8); backdrop-filter:blur(12px);
          border:1px solid rgba(255,255,255,0.7);
          border-radius:22px; padding:32px; gap:18px;
          box-shadow:0 8px 32px rgba(12,45,32,0.03);
          transition:all 0.3s cubic-bezier(0.34,1.56,0.64,1);
          display:flex; flex-direction:column;
        }
        .feature-card-modern:hover {
          transform:translateY(-8px);
          box-shadow:0 20px 48px rgba(12,45,32,0.08);
          border-color:rgba(197,160,89,0.2);
        }
        .card-icon {
          width:60px; height:60px; border-radius:16px;
          background:linear-gradient(135deg,var(--as),rgba(197,160,89,0.03));
          border:1px solid rgba(197,160,89,0.15);
          display:flex; align-items:center; justify-content:center;
          transition:transform 0.3s;
        }
        .feature-card-modern:hover .card-icon { transform:scale(1.1) rotate(-3deg); }
        .feature-card-modern h3 { font-size:17px; font-weight:700; color:var(--p); }
        .feature-card-modern p { font-size:14px; line-height:1.65; color:var(--tm); }

        /* HOW IT WORKS */
        .how-section { max-width:1200px; margin:0 auto; padding:100px 28px; }
        .how-timeline {
          display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr));
          gap:32px; margin-top:48px; position:relative;
        }
        .timeline-step { display:flex; flex-direction:column; align-items:center; text-align:center; gap:14px; }
        .step-num {
          width:52px; height:52px; border-radius:50%;
          background:linear-gradient(135deg,var(--p),var(--pl));
          color:white; font-weight:700; font-size:18px;
          display:flex; align-items:center; justify-content:center;
          box-shadow:0 6px 20px rgba(12,45,32,0.15);
          animation:pulse 3s ease-in-out infinite;
          border:3px solid rgba(255,255,255,0.5);
        }
        .timeline-step h4 { font-size:15px; font-weight:700; color:var(--p); }
        .timeline-step p { font-size:13px; line-height:1.55; color:var(--tm); }

        /* PWA */
        .pwa-section {
          background:linear-gradient(135deg,rgba(12,45,32,0.02),rgba(197,160,89,0.04));
          border:1px solid var(--bdr); border-radius:28px;
          max-width:1200px; margin:0 auto 100px;
          padding:60px; display:grid;
          grid-template-columns:1.2fr 0.8fr; gap:60px; align-items:center;
        }
        .pwa-qr-container {
          background:white; padding:28px; border-radius:24px;
          border:1px solid var(--bdr);
          box-shadow:0 16px 48px rgba(12,45,32,0.03);
          display:flex; flex-direction:column; align-items:center; gap:18px;
          transition:transform 0.3s; cursor:default;
        }
        .pwa-qr-container:hover { transform:scale(1.02); }
        .pwa-install-row {
          display:flex; gap:14px; align-items:center; padding:14px;
          border-radius:14px; background:rgba(12,45,32,0.03);
          border:1px solid rgba(12,45,32,0.04);
        }
        .pwa-icon { width:38px; height:38px; flex-shrink:0; }

        /* FAQ */
        .faq-section { max-width:760px; margin:0 auto 100px; padding:0 28px; }
        .faq-list { display:flex; flex-direction:column; gap:14px; }
        .faq-item {
          background:rgba(255,255,255,0.8); backdrop-filter:blur(10px);
          border:1px solid rgba(255,255,255,0.6); border-radius:18px;
          overflow:hidden; transition:all 0.3s ease;
          box-shadow:0 4px 18px rgba(12,45,32,0.02);
        }
        .faq-item.open {
          border-color:rgba(197,160,89,0.2);
          box-shadow:0 12px 32px rgba(12,45,32,0.04);
        }
        .faq-question {
          padding:22px 26px; display:flex; justify-content:space-between;
          align-items:center; font-weight:700; font-size:15px; color:var(--p);
          cursor:pointer; user-select:none; transition:background 0.2s;
        }
        .faq-question:hover { background:rgba(197,160,89,0.04); }
        .faq-chevron {
          width:22px; height:22px; transition:transform 0.3s ease;
          color:var(--a); flex-shrink:0;
        }
        .faq-item.open .faq-chevron { transform:rotate(180deg); }
        .faq-answer {
          max-height:0; overflow:hidden; transition:all 0.32s cubic-bezier(0.4,0,0.2,1);
          color:var(--tm); font-size:14px; line-height:1.7;
        }
        .faq-item.open .faq-answer {
          max-height:200px; padding:0 26px 24px;
          border-top:1px solid rgba(12,45,32,0.04);
        }

        /* FOOTER */
        .mawaddah-footer {
          background:linear-gradient(135deg,#061a13,#0c2d20);
          color:rgba(250,248,245,0.8); padding:64px 28px 28px;
          text-align:center;
        }
        .footer-logo {
          font-size:30px; font-weight:700; letter-spacing:-1px;
          background:linear-gradient(135deg,var(--al),var(--a));
          -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
          margin-bottom:14px;
        }
        .footer-divider { border:none; border-top:1px solid rgba(250,248,245,0.08); margin:32px 0 20px; }

        /* RESPONSIVE */
        @media(max-width:968px) {
          .hero-section { grid-template-columns:1fr; text-align:center; gap:40px; padding:48px 20px; }
          .hero-badge,.hero-bullet-item { align-self:center; justify-content:center; }
          .auth-card-wrapper { justify-content:center; }
          .navbar-links { display:none; }
          .pwa-section { grid-template-columns:1fr; padding:40px 24px; gap:32px; text-align:center; }
          .pwa-qr-container { display:none !important; }
          .hero-title-main { font-size:32px; }
        }
        @media(max-width:600px) {
          .navbar-install { display:none; }
          .navbar-login,.navbar-cta { padding:8px 14px; font-size:13px; }
          .auth-card-modern-landing { padding:28px 20px; }
        }
      `}} />

      {/* 1. Navbar */}
      <nav className="mawaddah-navbar">
        <div className="navbar-container">
          <a href="#" className="navbar-logo">
            {/* Custom Premium Vector Logo */}
            <svg width="40" height="40" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ verticalAlign: "middle", marginLeft: "10px" }}>
              <circle cx="32" cy="32" r="30" fill="url(#navGrad)" stroke="rgba(197, 160, 89, 0.2)" strokeWidth="1.5"/>
              <circle cx="26" cy="32" r="9" stroke="url(#goldGrad)" strokeWidth="3" fill="none"/>
              <circle cx="38" cy="32" r="9" stroke="url(#goldGrad)" strokeWidth="3" fill="none"/>
              <path d="M32 16L34 21L39 23L34 25L32 30L30 25L25 23L30 21Z" fill="url(#goldGrad)"/>
              <defs>
                <linearGradient id="navGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#ffffff"/>
                  <stop offset="100%" stopColor="#f5f0e6"/>
                </linearGradient>
                <linearGradient id="goldGrad" x1="20" y1="20" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#d4af37"/>
                  <stop offset="50%" stopColor="#f3e5ab"/>
                  <stop offset="100%" stopColor="#aa7c11"/>
                </linearGradient>
              </defs>
            </svg>
            مودة
          </a>

          <div className="navbar-links">
            <a onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>الرئيسية</a>
            <a onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}>مبادئنا</a>
            <a onClick={() => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" })}>رحلتك معنا</a>
            <a onClick={() => document.getElementById("pwa")?.scrollIntoView({ behavior: "smooth" })}>تثبيت التطبيق</a>
            <a onClick={() => document.getElementById("faq")?.scrollIntoView({ behavior: "smooth" })}>الأسئلة الشائعة</a>
          </div>

          <div className="navbar-ctas">
            <button onClick={handleInstallApp} className="navbar-install">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "4px" }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              تثبيت التطبيق
            </button>
            <button onClick={scrollToAuth} className="navbar-login">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "4px" }}><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
              دخول
            </button>
            <button onClick={scrollToAuth} className="navbar-cta">
              ابدأ الآن
            </button>
          </div>
        </div>
      </nav>

      {/* 2. Hero Section */}
      <section className="hero-section">
        {/* Right - Hero Info */}
        <div className="hero-info">
          <div className="hero-badge">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L9.09 8.26L2 9.27L7 14.14L5.82 21.02L12 17.77L18.18 21.02L17 14.14L22 9.27L14.91 8.26L12 2z"/></svg>
            الزواج الشرعي الجاد والآمن
          </div>
          <h1 className="hero-title-main">
            مودة: رفيقك الحلال<br />
            <span>لبناء بيت مسلم مستقر</span>
          </h1>
          <p className="hero-desc">
            منصة وقورة بضوابط شرعية صارمة، مصممة خصيصاً لمساعدتك في العثور على شريك حياتك برباط مقدس يجمع العائلات بخصوصية تامة وبدون عبث.
          </p>

          <div className="hero-bullet-list">
            <div className="hero-bullet-item">
              <div className="hero-bullet-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0c2d20" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              <span>خصوصية وسرية تامة للملفات والصور</span>
            </div>
            <div className="hero-bullet-item">
              <div className="hero-bullet-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0c2d20" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <span>ربط مباشر بأولياء الأمور بمجرد التوافق</span>
            </div>
            <div className="hero-bullet-item">
              <div className="hero-bullet-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0c2d20" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <span>نظام صارم يحظر التسلية والتلاعب تماماً</span>
            </div>
          </div>
        </div>

        {/* Left - Auth Card */}
        <div id="auth-section" className="auth-card-wrapper" style={{ scrollMarginTop: "120px" }}>
          <div className="auth-card-modern-landing">
            <div className="auth-header">
              {/* Premium Inline Vector Icon */}
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: "16px" }}>
                <circle cx="32" cy="32" r="30" fill="url(#heroGrad)" stroke="rgba(197, 160, 89, 0.2)" strokeWidth="2"/>
                <circle cx="25" cy="32" r="10" stroke="url(#heroGoldGrad)" strokeWidth="3.5" fill="none"/>
                <circle cx="39" cy="32" r="10" stroke="url(#heroGoldGrad)" strokeWidth="3.5" fill="none"/>
                <path d="M32 15L34.5 21L40.5 23.5L34.5 26L32 32L29.5 26L23.5 23.5L29.5 21Z" fill="url(#heroGoldGrad)"/>
                <defs>
                  <linearGradient id="heroGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#ffffff"/>
                    <stop offset="100%" stopColor="#f5f0e6"/>
                  </linearGradient>
                  <linearGradient id="heroGoldGrad" x1="20" y1="20" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#d4af37"/>
                    <stop offset="50%" stopColor="#f3e5ab"/>
                    <stop offset="100%" stopColor="#aa7c11"/>
                  </linearGradient>
                </defs>
              </svg>
              <h2>تسجيل الدخول / إنشاء حساب</h2>
              <p>مرحباً بك في منصة مودة الرسمية</p>
            </div>

            {step === "phone" && (
              <form onSubmit={handleSendOTP} className="auth-form" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div className="input-group" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontWeight: "700", fontSize: "14px", color: "var(--t)" }}>أنا:</label>
                  <div className="gender-select-landing">
                    <button
                      type="button"
                      className={`gender-btn-landing ${gender === "MALE" ? "active" : ""}`}
                      onClick={() => setGender("MALE")}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "6px" }}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      عريس جاد
                    </button>
                    <button
                      type="button"
                      className={`gender-btn-landing ${gender === "FEMALE" ? "active" : ""}`}
                      onClick={() => setGender("FEMALE")}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "6px" }}><path d="M12 2a5 5 0 1 0 5 5 5 5 0 0 0-5-5zm0 18v-3m-3 3h6m-3-11v3"/><circle cx="12" cy="7" r="5" stroke="currentColor" strokeWidth="2.5" fill="none"/></svg>
                      عروسة جادة
                    </button>
                  </div>
                </div>

                <div className="input-group" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontWeight: "700", fontSize: "14px", color: "var(--t)" }}>رقم الموبايل:</label>
                  <input
                    type="tel"
                    className="input-field"
                    placeholder="01XXXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    maxLength={11}
                    dir="ltr"
                    style={{
                      width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid var(--bdr)",
                      background: "white", color: "var(--t)", fontSize: "15px", fontFamily: "IBM Plex Sans Arabic"
                    }}
                  />
                </div>

                {error && (
                  <p className="error-msg" style={{ color: "#f85149", fontSize: "13px", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", margin: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    {error}
                  </p>
                )}

                <button type="submit" className="navbar-cta" disabled={loading} style={{ width: "100%", padding: "14px", fontSize: "16px", justifyContent: "center" }}>
                  {loading ? "جاري الإرسال..." : "المتابعة والتحقق"}
                </button>
              </form>
            )}

            {step === "otp" && (
              <div className="auth-form" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div className="input-group" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <label style={{ textAlign: "center", fontWeight: "700", fontSize: "14px" }}>رمز التحقق مرسل إلى {phone}</label>
                  <div className="otp-inputs" style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => { otpRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        className="otp-input"
                        value={digit}
                        onChange={(e) => handleOTPChange(i, e.target.value)}
                        onKeyDown={(e) => handleOTPKeyDown(i, e)}
                        style={{
                          width: "44px", height: "50px", textAlign: "center", fontSize: "20px", fontWeight: "800",
                          borderRadius: "10px", border: "2px solid var(--bdr)", background: "white", color: "var(--t)"
                        }}
                      />
                    ))}
                  </div>
                </div>

                {error && (
                  <p className="error-msg" style={{ color: "#f85149", fontSize: "13px", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", margin: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    {error}
                  </p>
                )}
                
                <button type="button" className="navbar-cta" onClick={() => setStep("phone")} style={{ width: "100%", padding: "12px", background: "transparent", border: "1px solid var(--p)", color: "var(--p) !important", boxShadow: "none", justifyContent: "center" }}>
                  تعديل رقم الهاتف
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 3. Features Section */}
      <section id="features" className="features-section" style={{ scrollMarginTop: "80px" }}>
        <div className="section-header">
          <h2>مبادئنا وضوابطنا الشرعية</h2>
          <p>منصة مودة ليست مكاناً للتعارف العشوائي أو التسلية، بل مسار مبارك منضبط ومصمم لحمايتك.</p>
        </div>

        <div className="features-grid">
          {/* Card 1 */}
          <div className="feature-card-modern">
            <div className="card-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--a)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg></div>
            <h3>خصوصية تامة وحماية كاملة</h3>
            <p>لا يستطيع أي مستخدم تصفح صورك أو بياناتك الخاصة بشكل عشوائي. الخوارزمية تعرض ملفك فقط لمن يتوافق معك فكرياً وشرعياً.</p>
          </div>

          {/* Card 2 */}
          <div className="feature-card-modern">
            <div className="card-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--a)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
            <h3>ربط رسمي ومباشر بالأولياء</h3>
            <p>سد منافذ العبث! بمجرد حدوث القبول الصامت المتبادل، يقوم النظام فوراً بعرض رقم التواصل مع ولي أمر العروس لتنسيق اللقاء الشرعي في الواقع.</p>
          </div>

          {/* Card 3 */}
          <div className="feature-card-modern">
            <div className="card-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--a)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
            <h3>صفر تسالي أو حسابات وهمية</h3>
            <p>نقوم بتجميد أي حساب غير نشط لأكثر من 24 ساعة فوراً، ونمنع تجميع المحادثات، مما يضمن أن كل شخص يظهر لك هو إنسان حقيقي وجاد حالياً.</p>
          </div>

          {/* Card 4 */}
          <div className="feature-card-modern">
            <div className="card-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--a)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg></div>
            <h3>بيئة إسلامية وقورة</h3>
            <p>دردشاتنا تخضع لرقابة إدارية وأخلاقية صارمة تمنع تبادل الروابط أو الأرقام خارج إطار التوافق الرسمي لحمايتك وضمان طهارة التواصل.</p>
          </div>
        </div>
      </section>

      {/* 4. How it works Section */}
      <section id="how" className="how-section" style={{ scrollMarginTop: "80px" }}>
        <div className="section-header">
          <h2>رحلتك نحو الزواج الشرعي في مودة</h2>
          <p>خطوات يسيرة، شرعية، وآمنة تبدأ من هاتفك وتنتهي في بيت الحلال المبارك.</p>
        </div>

        <div className="how-timeline">
          <div className="timeline-step">
            <div className="step-num">١</div>
            <h4>تسجيل موثق وآمن</h4>
            <p>سجل برقم هاتفك وجنسك، ويتم تفعيل الحساب بكود OTP سري فوري.</p>
          </div>

          <div className="timeline-step">
            <div className="step-num">٢</div>
            <h4>بناء الملف التفضيلي</h4>
            <p>املأ بياناتك الشرعية ومواصفات شريك أحلامك بكل دقة وأهمية.</p>
          </div>

          <div className="timeline-step">
            <div className="step-num">٣</div>
            <h4>ترشيحات ذكية منتقاة</h4>
            <p>تعرض لك الخوارزمية ملفات مخصصة ومتوافقة معك تماماً يومياً.</p>
          </div>

          <div className="timeline-step">
            <div className="step-num">٤</div>
            <h4>شات آمن ومنضبط</h4>
            <p>عند القبول المتبادل الصامت، يفتح شات محمي ووقور بلا أرقام أو تلاعب.</p>
          </div>

          <div className="timeline-step">
            <div className="step-num">٥</div>
            <h4>إشهار وكشف الأرقام</h4>
            <p>إذا اتفقتما، اضغطا على القبول المتبادل لتكشف أرقام الأولياء لتنسيق الرؤية الشرعية.</p>
          </div>
        </div>
      </section>

      {/* 5. PWA Section */}
      <section id="pwa" className="pwa-section" style={{ scrollMarginTop: "80px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <h2 style={{ fontSize: "32px", fontWeight: "800", color: "var(--primary)" }}>تثبيت تطبيق مودة على هاتفك (PWA)</h2>
          <p style={{ fontSize: "16px", color: "var(--text-muted)", lineHeight: "1.6" }}>
            تطبيق مودة خفيف وسريع ويدعم جميع الهواتف الذكية. يمكنك تثبيته مباشرة من متصفحك مجاناً وبدون الحاجة لزيارة متجر التطبيقات:
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="pwa-install-row" style={{ display: "flex", gap: "14px", alignItems: "center" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--pl)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
              <div style={{ fontSize: "14px", lineHeight: "1.6" }}>
                <strong>هواتف أندرويد (Chrome):</strong> امسح الرمز وافتح الرابط، اضغط على النقاط الثلاث العلوية للمتصفح واختر <strong>(تثبيت التطبيق)</strong>.
              </div>
            </div>
            <div className="pwa-install-row" style={{ display: "flex", gap: "14px", alignItems: "center" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--a)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
              <div style={{ fontSize: "14px", lineHeight: "1.6" }}>
                <strong>هواتف آيفون (Safari):</strong> امسح الرمز وافتح الرابط، اضغط على زر <strong>مشاركة (Share)</strong> بالأسفل ثم اختر <strong>(Add to Home Screen)</strong>.
              </div>
            </div>
          </div>
        </div>

        {/* QR Code Container */}
        <div className="pwa-qr-container">
          <img 
            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrUrl)}`} 
            alt="تحميل تطبيق مودة" 
            style={{ width: "150px", height: "150px", borderRadius: "12px" }} 
          />
          <div style={{ textAlign: "center" }}>
            <h4 style={{ fontWeight: "800", color: "var(--primary)", fontSize: "16px" }}>امسح الرمز السريع</h4>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>افتح كاميرا هاتفك وامسح الرمز لتثبيت التطبيق فوراً.</p>
          </div>
        </div>
      </section>

      {/* 6. FAQ Section */}
      <section id="faq" className="faq-section" style={{ scrollMarginTop: "80px" }}>
        <div className="section-header">
          <h2>الأسئلة الشائعة</h2>
          <p>كل ما تود معرفته عن منصة مودة والضوابط الشرعية للأمان.</p>
        </div>

        <div className="faq-list">
          {/* FAQ 1 */}
          <div className={`faq-item ${faqOpen === 0 ? "open" : ""}`}>
            <div className="faq-question" onClick={() => setFaqOpen(faqOpen === 0 ? null : 0)}>
              <span>هل منصة مودة مجانية بالكامل؟</span>
              <svg className="faq-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            <div className="faq-answer">
              نعم، منصة مودة مجانية بالكامل لجميع الباحثين والباحثات عن العفة والزواج الشرعي. نحن لا نفرض أي رسوم اشتراك، وهدفنا النبيل والمبارك هو تيسير بناء بيوت مسلمة مستقرة وصالحة.
            </div>
          </div>

          {/* FAQ 2 */}
          <div className={`faq-item ${faqOpen === 1 ? "open" : ""}`}>
            <div className="faq-question" onClick={() => setFaqOpen(faqOpen === 1 ? null : 1)}>
              <span>كيف تحمي المنصة خصوصية الفتيات؟</span>
              <svg className="faq-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            <div className="faq-answer">
              خصوصية الفتيات هي أولى أولوياتنا. لا يمكن لأي مشترك تصفح الصور أو الملفات عشوائياً. تعرض البيانات فقط لمن يملك نقاط توافق عالية. كما أننا نحظر بشدة تبادل أي أرقام هواتف أو وسائل تواصل شخصية خارج إطار كشف التوافق المتبادل الرسمي للولي.
            </div>
          </div>

          {/* FAQ 3 */}
          <div className={`faq-item ${faqOpen === 2 ? "open" : ""}`}>
            <div className="faq-question" onClick={() => setFaqOpen(faqOpen === 2 ? null : 2)}>
              <span>ماذا يحدث عند حدوث التوافق المبدئي المزدوج؟</span>
              <svg className="faq-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            <div className="faq-answer">
              بمجرد ضغط الطرفين على "التوافق المبدئي" خلال مرحلة الشات المنضبط، يقوم النظام تلقائياً بكشف رقم هاتف ولي أمر العروس للعريس، ويرسل لهما تنبيهاً مباركاً لحث العريس على الاتصال بولي العروس للتنسيق السريع للرؤية الشرعية في الواقع.
            </div>
          </div>
        </div>
      </section>

      {/* 7. Footer */}
      <footer className="mawaddah-footer">
        <div className="footer-logo">مودة</div>
        <p style={{ fontSize: "14px", opacity: 0.8, maxWidth: "500px", margin: "0 auto 24px auto", lineHeight: "1.6" }}>
          منصة إسلامية وقورة بضوابط شرعية صارمة تسهل لك طريق العفة وبناء بيت مسلم مستقر.
        </p>

        <div className="footer-links" style={{ display: "flex", gap: "24px", justifyContent: "center", fontSize: "13px" }}>
          <a style={{ color: "white", textDecoration: "none" }}>شروط الاستخدام</a>
          <a style={{ color: "white", textDecoration: "none" }}>سياسة الخصوصية</a>
          <a style={{ color: "white", textDecoration: "none" }}>الدعم الإداري والشرعي</a>
        </div>

        <div className="footer-divider" />
        <p style={{ fontSize: "12px", opacity: 0.6 }}>جميع الحقوق محفوظة لمنصة مودة © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
