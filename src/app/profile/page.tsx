"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  EDU_LABELS,
  GOV_LABELS,
  HIJAB_LABELS,
  MARITAL_LABELS,
  SKIN_LABELS,
} from "@/lib/labels";

const getMaritalLabel = (status: string, gender: "MALE" | "FEMALE") => {
  if (status === "SINGLE") return gender === "FEMALE" ? "عزباء" : "أعزب";
  if (status === "DIVORCED") return gender === "FEMALE" ? "مطلقة" : "مطلق";
  if (status === "WIDOWED") return gender === "FEMALE" ? "أرملة" : "أرمل";
  if (status === "MARRIED_SEEKING_POLYGAMY") return "متزوج يطلب التعدد";
  return status;
};

interface Profile {
  age: number;
  currentGovernorate: string;
  maritalStatus: string;
  childrenCount?: number | null;
  currentWivesCount?: number | null;
  religiousLevel: number;
  educationLevel: string;
  heightCategory: string;
  weightCategory: string;
  skinColor: string;
  personalMessage: string;
  hijabType?: string | null;
  completenessScore: number;
}

interface User {
  phone: string;
  gender: "MALE" | "FEMALE";
  status: string;
  reputationScore: number;
  createdAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "نشط",
  PAUSED: "متوقف مؤقتاً",
  STOPPED: "متوقف",
  UNDER_FOLLOWUP: "قيد المتابعة",
  BANNED: "محظور",
};

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/profile").then((r) => r.json()),
      fetch("/api/auth/me").then((r) => r.json()),
    ])
      .then(([profileData, userData]) => {
        setProfile(profileData.profile ?? null);
        setUser(userData);
      })
      .finally(() => setLoading(false));
  }, []);

  const setStatus = async (action: "PAUSE" | "RESUME" | "STOP") => {
    setBusy(true);
    setMessage("");
    const res = await fetch("/api/account/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    setBusy(false);
    if (res.ok) {
      setUser((current) => current ? { ...current, status: data.status } : current);
      setMessage("تم تحديث حالة الحساب");
    } else {
      setMessage(data.error || "حدث خطأ");
    }
  };

  const exportAccount = async () => {
    setBusy(true);
    setMessage("");
    const res = await fetch("/api/account");
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(data.error || "تعذر تصدير البيانات");
      return;
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mawaddah-account-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage("تم تجهيز ملف بياناتك");
  };

  const deleteAccount = async () => {
    const ok = window.confirm("حذف الحساب نهائي ولا يمكن التراجع عنه. هل أنت متأكد؟");
    if (!ok) return;
    setBusy(true);
    const res = await fetch("/api/account", { method: "DELETE" });
    setBusy(false);
    if (res.ok) router.push("/");
    else setMessage("تعذر حذف الحساب الآن");
  };

  if (loading) {
    return (
      <div className="main-content" style={{ display: "flex", flexDirection: "column", gap: "16px", justifyContent: "center", alignItems: "center", minHeight: "calc(100vh - 80px)", fontFamily: "'IBM Plex Sans Arabic', 'Cairo', sans-serif" }}>
        <div className="loading-spinner"></div>
        <p style={{ color: "var(--text-muted)", fontSize: "16px" }}>جاري تحميل ملفك الشخصي...</p>
      </div>
    );
  }

  return (
    <div className="main-content" style={{ display: "flex", flexDirection: "column", gap: "24px", minHeight: "calc(100vh - 80px)", fontFamily: "'IBM Plex Sans Arabic', 'Cairo', sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "16px", marginTop: "16px" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: "bold", color: "var(--primary)", margin: 0 }}>ملفي الشخصي</h1>
          <p style={{ color: "var(--text-muted)", marginTop: "8px", fontSize: "16px" }}>إدارة وتعديل بيانات ملفك الشخصي</p>
        </div>
        <button className="primary-btn" onClick={() => router.push("/setup")} style={{ width: "auto", padding: "8px 24px" }}>
          تعديل الملف
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {!profile || !user ? (
          <div className="no-more-box">
            <div style={{ marginBottom: "16px", color: "var(--accent)" }}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto" }}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            </div>
            <h2 className="no-more-title">ملفك غير مكتمل</h2>
            <p className="no-more-text">أكمل بياناتك حتى تبدأ الترشيحات.</p>
            <button className="btn-approve" onClick={() => router.push("/setup")}>إكمال الملف</button>
          </div>
        ) : (
          <>
            <section className="profile-card">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <div>
                  <h2 style={{ fontSize: 22, color: "var(--text)", marginBottom: 4 }}>
                    {user.gender === "MALE" ? "ملف عريس" : "ملف عروسة"}
                  </h2>
                  <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
                    {STATUS_LABELS[user.status] ?? user.status} · السمعة {user.reputationScore}
                  </p>
                </div>
                <span className="profile-badge">{profile.completenessScore}% اكتمال</span>
              </div>

              <div className="profile-grid">
                <Info label="السن" value={`${profile.age} سنة`} />
                <Info label="الهاتف" value={user.phone} />
                <Info label="الحالة" value={getMaritalLabel(profile.maritalStatus, user.gender as "MALE" | "FEMALE")} />
                <Info label="المحافظة" value={GOV_LABELS[profile.currentGovernorate] ?? profile.currentGovernorate} />
                <Info label="التعليم" value={EDU_LABELS[profile.educationLevel] ?? profile.educationLevel} />
                <Info label="الطول" value={`${profile.heightCategory} سم`} />
                <Info label="الوزن" value={`${profile.weightCategory} كجم`} />
                <Info label="البشرة" value={SKIN_LABELS[profile.skinColor] ?? profile.skinColor} />
                {profile.hijabType && <Info label="الحجاب" value={HIJAB_LABELS[profile.hijabType] ?? profile.hijabType} />}
              </div>

              <div className="personal-msg-box">
                <div className="personal-msg-label">رسالتك الشخصية</div>
                <p className="personal-msg-text">{profile.personalMessage}</p>
              </div>
            </section>

            <section className="profile-card">
              <h2 style={{ fontSize: 16, color: "var(--text)" }}>إدارة الحساب</h2>
              <div className="action-btns">
                <button className="accept-btn" onClick={() => router.push("/preferences")}>التفضيلات</button>
                {user.status === "PAUSED" ? (
                  <button className="accept-btn" disabled={busy} onClick={() => setStatus("RESUME")}>استئناف</button>
                ) : (
                  <button className="reject-btn" disabled={busy} onClick={() => setStatus("PAUSE")}>إيقاف مؤقت</button>
                )}
              </div>
              <div className="action-btns">
                <button className="reject-btn" disabled={busy} onClick={exportAccount}>تصدير بياناتي</button>
                <button className="reject-btn" disabled={busy} onClick={deleteAccount} style={{ color: "var(--danger)", borderColor: "var(--danger)" }}>
                  حذف الحساب
                </button>
              </div>
              {message && <p className="error-msg" style={{ color: message.includes("تم") ? "var(--success)" : "var(--danger)" }}>{message}</p>}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-badge">
      <div>
        <div className="info-label">{label}</div>
        <div className="info-value">{value}</div>
      </div>
    </div>
  );
}
