"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

const GOV_LABELS: Record<string, string> = {
  CAIRO: "القاهرة", GIZA: "الجيزة", ALEXANDRIA: "الإسكندرية",
  ASWAN: "أسوان", ASSIUT: "أسيوط", BENI_SUEF: "بني سويف",
  PORT_SAID: "بور سعيد", DAKAHLIA: "الدقهلية", DAMIETTA: "دمياط",
  SUEZ: "السويس", SHARQIA: "الشرقية", GHARBIA: "الغربية",
  FAIYUM: "الفيوم", KAFR_EL_SHEIKH: "كفر الشيخ", LUXOR: "الأقصر",
  MATRUH: "مطروح", MINYA: "المنيا", MONUFIA: "المنوفية",
  NEW_VALLEY: "الوادي الجديد", NORTH_SINAI: "شمال سيناء",
  QENA: "قنا", QALIUBIYA: "القليوبية", RED_SEA: "البحر الأحمر",
  SOHAG: "سوهاج", SOUTH_SINAI: "جنوب سيناء",
  ISMAILIA: "الإسماعيلية", BEHEIRA: "البحيرة", OTHER: "دولة أخرى خارج مصر",
};
const MARITAL_LABELS: Record<string, string> = {
  SINGLE: "أعزب/عزباء", DIVORCED: "مطلق/مطلقة",
  WIDOWED: "أرمل/أرملة", MARRIED_SEEKING_POLYGAMY: "متزوج يطلب التعدد",
};
const EDU_LABELS: Record<string, string> = {
  BELOW_HIGH_SCHOOL: "دون ثانوي", HIGH_SCHOOL: "ثانوي",
  UNIVERSITY: "جامعي", MASTERS: "ماجستير", PHD: "دكتوراه",
};
const HIJAB_LABELS: Record<string, string> = {
  NIQAB: "منقبة", HIJAB: "محجبة", NONE: "غير محجبة",
};
const SKIN_LABELS: Record<string, string> = {
  WHITE: "أبيض", WHEAT: "قمحي", BROWN: "أسمر", DARK: "داكن",
};
const RELIGIOUS_LABELS: Record<number, string> = {
  1: "منخفض", 2: "متوسط", 3: "جيد", 4: "ملتزم", 5: "ملتزم جداً",
};

interface ProfileData {
  matchId: string;
  age: number;
  currentGovernorate: string;
  maritalStatus: string;
  childrenCount?: number;
  currentWivesCount?: number;
  religiousLevel: number;
  educationLevel: string;
  heightCategory: string;
  weightCategory: string;
  skinColor: string;
  hijabType?: string;
  personalMessage: string;
  compatibilityScore: number;
  compatibilityReasons?: string[];
  gender: "MALE" | "FEMALE";
}

const getMaritalLabel = (status: string, gender: "MALE" | "FEMALE") => {
  if (status === "SINGLE") return gender === "FEMALE" ? "عزباء" : "أعزب";
  if (status === "DIVORCED") return gender === "FEMALE" ? "مطلقة" : "مطلق";
  if (status === "WIDOWED") return gender === "FEMALE" ? "أرملة" : "أرمل";
  if (status === "MARRIED_SEEKING_POLYGAMY") return "متزوج يطلب التعدد";
  return status;
};

export default function BrowsePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [deciding, setDeciding] = useState(false);
  const [noMore, setNoMore] = useState(false);
  const [swipeDir, setSwipeDir] = useState<"left" | "right" | null>(null);
  const [todayCount, setTodayCount] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(5);
  const [mutualMatch, setMutualMatch] = useState(false);

  const fetchNext = useCallback(async () => {
    setLoading(true);
    setSwipeDir(null);
    setMutualMatch(false);
    try {
      const res = await fetch("/api/matches/next");
      const data = await res.json();
      if (data.profile) {
        setProfile(data.profile);
        setTodayCount(data.todayCount ?? 0);
        setDailyLimit(data.dailyLimit ?? 5);
        setNoMore(false);
      } else {
        setProfile(null);
        setNoMore(true);
        setTodayCount(data.todayCount ?? 0);
        setDailyLimit(data.dailyLimit ?? 5);
      }
    } catch {
      setNoMore(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNext(); }, [fetchNext]);

  const decide = async (decision: "APPROVED" | "REJECTED") => {
    if (!profile || deciding) return;
    setDeciding(true);
    setSwipeDir(decision === "APPROVED" ? "right" : "left");

    await new Promise((r) => setTimeout(r, 400));

    try {
      const res = await fetch("/api/matches/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: profile.matchId, decision }),
      });
      const data = await res.json();

      // توافق مزدوج! — تأخير ثانية قبل الانتقال لإظهار الاحتفال
      if (data.isFullyMatched) {
        setMutualMatch(true);
        await new Promise((r) => setTimeout(r, 2500));
        router.push("/chat");
        return;
      }
    } finally {
      setDeciding(false);
      fetchNext();
    }
  };

  const compatColor =
    (profile?.compatibilityScore ?? 0) >= 75
      ? "#2d9e5f"
      : (profile?.compatibilityScore ?? 0) >= 50
      ? "#d4a017"
      : "#888";

  return (
    <div className="main-content" style={{ display: "flex", flexDirection: "column", gap: "24px", minHeight: "calc(100vh - 80px)", fontFamily: "'IBM Plex Sans Arabic', 'Cairo', sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "16px", marginTop: "16px" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: "bold", color: "var(--primary)", margin: 0 }}>استكشاف الملفات</h1>
          <p style={{ color: "var(--text-muted)", marginTop: "8px", fontSize: "16px" }}>اسحب أو اختر الملفات المناسبة لك</p>
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", padding: "24px 0" }}>
        {/* توافق مزدوج! */}
        {mutualMatch && (
          <div className="mutual-match-overlay">
            <div className="mutual-match-card">
              <div className="mutual-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--accent)" }}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34"/><path d="M12 2a6.4 6.4 0 0 0-6.4 6.4C5.6 12 9 15 12 15s6.4-3 6.4-6.6A6.4 6.4 0 0 0 12 2z"/></svg>
              </div>
              <h2>توافق مبدئي مبارك!</h2>
              <p>تم القبول المتبادل بنجاح — تم كشف أرقام التواصل في شاشة التوافقات</p>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
            <div className="loading-spinner" style={{ margin: "0 auto 16px auto" }} />
            <p style={{ fontSize: "18px" }}>منصة مودة تبحث عن أفضل الملفات لك...</p>
          </div>
        ) : noMore ? (
          <NoMoreProfiles />
        ) : profile ? (
          <div
            className={`profile-card ${
              swipeDir === "right"
                ? "swipe-right"
                : swipeDir === "left"
                ? "swipe-left"
                : ""
            }`}
          >
            {/* نسبة التوافق */}
            <div className="compat-badge" style={{ borderColor: compatColor }}>
              <div className="compat-arc" style={{ color: compatColor }}>
                {Math.round(profile.compatibilityScore)}%
              </div>
              <span className="compat-label">توافق</span>
            </div>

            {/* المعلومات الأساسية */}
            <div className="profile-basics">
              <div className="profile-age">{profile.age} سنة</div>
              <div className="profile-marital">
                {getMaritalLabel(profile.maritalStatus, profile.gender)}
                {profile.childrenCount ? ` · ${profile.childrenCount} أبناء` : ""}
                {profile.currentWivesCount ? ` · ${profile.currentWivesCount} زوجات` : ""}
              </div>
            </div>

            {/* شبكة التفاصيل */}
            <div className="profile-grid">
              <InfoBadge icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/></svg>} label="التعليم" value={EDU_LABELS[profile.educationLevel] ?? profile.educationLevel} />
              <InfoBadge icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>} label="المحافظة" value={GOV_LABELS[profile.currentGovernorate] ?? profile.currentGovernorate} />
              <InfoBadge icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="9" x2="19" y2="9"/><line x1="5" y1="15" x2="19" y2="15"/><line x1="9" y1="9" x2="9" y2="15"/><line x1="15" y1="9" x2="15" y2="15"/></svg>} label="الطول" value={`${profile.heightCategory} سم`} />
              <InfoBadge icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M12 2v20M3 10c0 4 3 6 3 6s3-2 3-6M15 10c0 4 3 6 3 6s3-2 3-6"/></svg>} label="الوزن" value={`${profile.weightCategory} كجم`} />
              <InfoBadge icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"/><path d="M12 18C15.3137 18 18 15.3137 18 12C18 8.68629 15.3137 6 12 6C8.68629 6 6 8.68629 6 12C6 15.3137 8.68629 18 12 18Z"/></svg>} label="البشرة" value={SKIN_LABELS[profile.skinColor] ?? profile.skinColor} />
              {profile.hijabType && (
                <InfoBadge icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>} label="الحجاب" value={HIJAB_LABELS[profile.hijabType] ?? profile.hijabType} />
              )}
            </div>

            {/* الرسالة الشخصية */}
            <div className="personal-msg-box">
              <div className="personal-msg-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                بكلمات صاحب/صاحبة الملف
              </div>
              <p className="personal-msg-text">{profile.personalMessage}</p>
            </div>

            {profile.compatibilityReasons && profile.compatibilityReasons.length > 0 && (
              <div className="personal-msg-box">
                <div className="personal-msg-label">لماذا ظهر هذا الترشيح؟</div>
                <ul style={{ margin: "8px 18px 0 0", color: "var(--text-muted)", fontSize: 13, lineHeight: 1.8 }}>
                  {profile.compatibilityReasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* أزرار القرار */}
            <div className="decision-btns">
              <button className="btn-reject" onClick={() => decide("REJECTED")} disabled={deciding}>
                ✕<span>تخطّي</span>
              </button>
              <button className="btn-approve" onClick={() => decide("APPROVED")} disabled={deciding}>
                ✓<span>اختيار</span>
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function InfoBadge({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="info-badge">
      <span className="info-icon" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</span>
      <div>
        <div className="info-label">{label}</div>
        <div className="info-value">{value}</div>
      </div>
    </div>
  );
}

function NoMoreProfiles() {
  return (
    <div style={{ textAlign: "center", background: "var(--bg-card)", padding: "48px 32px", borderRadius: "24px", border: "1px dashed var(--border)", maxWidth: "500px", width: "100%" }}>
      <div style={{ marginBottom: "24px", color: "var(--accent)" }}>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto" }}><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
      </div>
      <h2 style={{ fontSize: "24px", fontWeight: "bold", color: "var(--text)", marginBottom: "16px" }}>
        لا توجد ملفات حالياً
      </h2>
      <p style={{ color: "var(--text-muted)", fontSize: "16px", lineHeight: "1.6" }}>
        منصة مودة تبحث عن أنسب الملفات لك. ستصلك ملفات جديدة فور توفرها.
      </p>
    </div>
  );
}
