"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MatchesPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserGender, setCurrentUserGender] = useState<"MALE" | "FEMALE" | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.gender) setCurrentUserGender(data.gender);
      });

    fetch("/api/matches")
      .then((r) => r.json())
      .then((data) => {
        if (data.matches) setMatches(data.matches);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="main-content" style={{ display: "flex", flexDirection: "column", gap: "24px", minHeight: "calc(100vh - 80px)", fontFamily: "'IBM Plex Sans Arabic', 'Cairo', sans-serif" }}>
      {/* Header section */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "16px", marginTop: "16px" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: "bold", color: "var(--primary)", margin: 0 }}>التوافقات الخاصة بك</h1>
          <p style={{ color: "var(--text-muted)", marginTop: "8px", fontSize: "16px" }}>الأشخاص الذين وافقتم على بعضكم البعض، يمكنك التواصل معهم الآن.</p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", marginTop: "80px", color: "var(--text-muted)", flex: 1 }}>
          <div className="loading-spinner"></div>
          <p style={{ marginTop: "16px", fontSize: "18px" }}>جاري تحميل التوافقات...</p>
        </div>
      ) : matches.length === 0 ? (
        <div style={{ 
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", 
          flex: 1, padding: "60px 20px", background: "var(--bg-card)", borderRadius: "24px", 
          border: "1px dashed var(--border)", marginTop: "24px" 
        }}>
          <div style={{ marginBottom: "16px", color: "var(--accent)" }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto" }}><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
          </div>
          <h2 style={{ fontSize: "24px", color: "var(--text)", marginBottom: "12px", fontWeight: "bold" }}>لا توجد ملفات توافق بعد</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "16px", textAlign: "center", maxWidth: "400px", lineHeight: "1.6" }}>
            عندما توافق على شخص ويوافق هو عليك في صفحة الاستكشاف، ستظهر بيانات التواصل الخاصة به هنا مباشرة.
          </p>
          <button 
            className="primary-btn" 
            onClick={() => router.push("/browse")}
            style={{ marginTop: "24px", padding: "12px 32px", width: "auto" }}
          >
            اذهب للاستكشاف
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "24px", marginTop: "16px" }}>
          {matches.map((match) => {
            const isMale = currentUserGender === "MALE";
            // الطرف الآخر
            const otherUser = isMale ? match.female : match.male;
            const otherProfile = otherUser?.profile;

            const rawContact = isMale 
              ? (otherProfile?.guardianPhone)
              : (otherProfile?.guardianPhone || otherUser?.phone);

            const [phoneNum, channel] = String(rawContact ?? "").split("|");
            const contactPhone = phoneNum || rawContact || "غير متوفر";
            const contactChannel = channel || "PHONE_CALL";

            const contactTitle = isMale 
              ? (contactChannel === "WHATSAPP" ? "واتساب ولي الأمر" : contactChannel === "TELEGRAM" ? "تليجرام ولي الأمر" : "رقم ولي الأمر") 
              : (contactChannel === "WHATSAPP" ? "واتساب العريس" : contactChannel === "TELEGRAM" ? "تليجرام العريس" : "رقم العريس");

            return (
              <div
                key={match.id}
                style={{
                  background: "var(--bg-card)",
                  borderRadius: "20px",
                  padding: "24px",
                  border: "1px solid var(--border)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  boxShadow: "0 8px 30px rgba(0,0,0,0.04)",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  cursor: "default"
                }}
                onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.08)"; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 30px rgba(0,0,0,0.04)"; }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, var(--primary), var(--primary-light))",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      boxShadow: "0 4px 12px rgba(14,90,67,0.3)"
                    }}
                  >
                    {isMale ? (
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    ) : (
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 21a6 6 0 0 0-12 0"/><circle cx="12" cy="10" r="4"/></svg>
                    )}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "20px", fontWeight: "bold", color: "var(--text)" }}>
                      {otherProfile?.title || (isMale ? "عروسة متوافقة" : "عريس متوافق")}
                    </h3>
                    <p style={{ margin: 0, fontSize: "14px", color: "var(--text-muted)", marginTop: "4px" }}>
                      {otherProfile?.age} سنة • {otherProfile?.currentGovernorate}
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    background: "var(--bg-input)",
                    padding: "16px 20px",
                    borderRadius: "16px",
                    marginTop: "8px",
                    borderLeft: "4px solid var(--primary-light)",
                  }}
                >
                  <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted)", marginBottom: "8px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>{contactTitle}</span>
                    {contactChannel === "WHATSAPP" && (
                      <span style={{ fontSize: "11px", background: "#e8f5e9", color: "#2e7d32", padding: "2px 8px", borderRadius: "6px", fontWeight: "bold" }}>واتساب</span>
                    )}
                    {contactChannel === "TELEGRAM" && (
                      <span style={{ fontSize: "11px", background: "#e1f5fe", color: "#0288d1", padding: "2px 8px", borderRadius: "6px", fontWeight: "bold" }}>تليجرام</span>
                    )}
                    {contactChannel === "PHONE_CALL" && (
                      <span style={{ fontSize: "11px", background: "#f5f5f5", color: "#616161", padding: "2px 8px", borderRadius: "6px", fontWeight: "bold" }}>مكالمة هاتفية</span>
                    )}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "24px",
                      fontWeight: "bold",
                      color: "var(--text)",
                      letterSpacing: "1.5px",
                      fontFamily: "monospace",
                    }}
                  >
                    {contactPhone}
                  </p>
                </div>

                <div style={{ flex: 1 }}></div>

                <button
                  onClick={() => router.push(`/rate?matchId=${match.id}`)}
                  style={{
                    marginTop: "8px",
                    width: "100%",
                    padding: "14px",
                    borderRadius: "12px",
                    border: "1px solid var(--border)",
                    background: "white",
                    color: "var(--text)",
                    fontSize: "15px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    transition: "all 0.2s"
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = "var(--bg-input)"; e.currentTarget.style.borderColor = "var(--primary-light)"; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = "white"; e.currentTarget.style.borderColor = "var(--border)"; }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  <span>تقييم التجربة</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
