"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const RATING_OPTIONS = [
  { type: "INITIAL_MATCH", label: "تم التوافق وسير على خير", color: "#2d9e5f", forBoth: true },
  { type: "RESPECTFUL_NO_MATCH", label: "محترم/محترمة لكن لم نتوافق", color: "#d4a017", forBoth: true },
  { type: "UNFRIENDLY", label: "غير ودود/غير متجاوبة", color: "#f85149", forBoth: true },
  { type: "SLOW_RESPONSE", label: "يتأخر/تتأخر في الرد", color: "#888", forBoth: true },
  { type: "NO_CONTACT", label: "لم يتواصل بعد 48 ساعة", color: "#888", forBoth: false, femaleOnly: true },
  { type: "NO_RESPONSE", label: "لا يوجد رد أبداً", color: "#888", forBoth: false, maleOnly: true },
  { type: "FORMAL_COMPLAINT", label: "تقديم شكوى رسمية للإدارة", color: "#f85149", forBoth: true },
];

function RateContent() {
  const router = useRouter();
  const params = useSearchParams();
  const matchId = params.get("matchId");

  const [gender, setGender] = useState<"MALE" | "FEMALE">("MALE");
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [hoursElapsed, setHoursElapsed] = useState(0);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d.gender) setGender(d.gender);
    });
    if (matchId) {
      fetch(`/api/matches/info?matchId=${matchId}`).then(r => r.json()).then(d => {
        if (d.hoursElapsed) setHoursElapsed(d.hoursElapsed);
      });
    }
  }, [matchId]);

  const submit = async () => {
    if (!selected || !matchId || submitting) return;
    setSubmitting(true);
    try {
      await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, ratingType: selected }),
      });
      setDone(true);
      setTimeout(() => router.push("/chat"), 2000);
    } catch {
      setSubmitting(false);
    }
  };

  const visibleOptions = RATING_OPTIONS.filter(o => {
    if (o.forBoth) return true;
    if (o.femaleOnly && gender === "FEMALE") return true;
    if (o.maleOnly && gender === "MALE") return true;
    return false;
  }).filter(o => {
    if ((o.type === "NO_CONTACT" || o.type === "NO_RESPONSE") && hoursElapsed < 48) return false;
    if (o.type === "SLOW_RESPONSE" && hoursElapsed < 24) return false;
    return true;
  });

  return (
    <div className="browse-page" style={{ fontFamily: "'IBM Plex Sans Arabic', 'Cairo', sans-serif" }}>
      <div className="browse-header">
        <button className="back-btn" onClick={() => router.push("/chat")}>←</button>
        <h1 className="browse-title" style={{ fontFamily: "inherit" }}>تقييم التجربة</h1>
        <div />
      </div>

      <div className="browse-content" style={{ justifyContent: "center" }}>
        {done ? (
          <div className="no-more-box">
            <div style={{ marginBottom: "16px", color: "var(--accent)" }}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto" }}><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
            </div>
            <h2 className="no-more-title" style={{ fontFamily: "inherit" }}>شكراً على تقييمك!</h2>
            <p className="no-more-text" style={{ fontFamily: "inherit" }}>رأيك يساعدنا في تحسين تجربة الجميع</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
            <p style={{ color: "var(--text-muted)", fontSize: 14, textAlign: "center", marginBottom: 8 }}>
              كيف كانت تجربتك مع هذا التوافق؟
            </p>
            {visibleOptions.map(opt => (
              <button
                key={opt.type}
                onClick={() => setSelected(opt.type)}
                style={{
                  padding: "14px 16px",
                  borderRadius: 12,
                  border: `2px solid ${selected === opt.type ? opt.color : "var(--border)"}`,
                  background: selected === opt.type ? `${opt.color}18` : "var(--bg-card)",
                  color: selected === opt.type ? opt.color : "var(--text)",
                  fontFamily: "'IBM Plex Sans Arabic', 'Cairo', sans-serif",
                  fontSize: 14,
                  cursor: "pointer",
                  textAlign: "right",
                  transition: "all 0.2s",
                  fontWeight: selected === opt.type ? 700 : 400,
                }}
              >
                {opt.label}
              </button>
            ))}
            <button
              className="btn-approve"
              onClick={submit}
              disabled={!selected || submitting}
              style={{ marginTop: 8 }}
            >
              {submitting ? "جاري الإرسال..." : "إرسال التقييم"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RatePage() {
  return (
    <Suspense fallback={<div className="browse-page"><div className="browse-content">جاري التحميل...</div></div>}>
      <RateContent />
    </Suspense>
  );
}
