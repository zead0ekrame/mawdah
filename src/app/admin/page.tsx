"use client";

import { useEffect, useState } from "react";

interface Stats {
  totalUsers: number;
  totalMatches: number;
  totalMarriages: number;
  totalComplaints: number;
}

interface Complaint {
  id: string;
  reason: string;
  status: string;
  createdAt: string;
  complainant: { phone: string; gender: string; reputationScore: number };
  respondent: { phone: string; gender: string; reputationScore: number };
}

interface AdminUser {
  id: string;
  phone: string;
  gender: string;
  status: string;
  reputationScore: number;
  createdAt: string;
  profile?: { age: number; currentGovernorate: string; completenessScore: number } | null;
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activeTab, setActiveTab] = useState<"stats" | "complaints" | "users" | "notifications">("stats");
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/admin/stats").then((r) => r.json()).then(setStats).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab === "complaints") {
      fetch("/api/admin/complaints").then((r) => r.json()).then((d) => setComplaints(d.complaints ?? [])).catch(() => {});
    }
    if (activeTab === "users") {
      fetch("/api/admin/users").then((r) => r.json()).then((d) => setUsers(d.users ?? [])).catch(() => {});
    }
  }, [activeTab]);

  const handleComplaint = async (complaintId: string, action: "WARN" | "SUSPEND" | "BAN" | "DISMISS") => {
    setBusy(true);
    const res = await fetch("/api/admin/complaints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ complaintId, action, note }),
    });
    setBusy(false);
    if (res.ok) {
      setNote("");
      const data = await fetch("/api/admin/complaints").then((r) => r.json());
      setComplaints(data.complaints ?? []);
    }
  };

  const updateUserStatus = async (userId: string, status: string) => {
    setBusy(true);
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, status }),
    });
    setBusy(false);
    if (res.ok) {
      setUsers((current) => current.map((user) => user.id === userId ? { ...user, status } : user));
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "24px", fontFamily: "'IBM Plex Sans Arabic', 'Cairo', sans-serif" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
          <span style={{ display: "inline-flex", color: "var(--primary)" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </span>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)" }}>لوحة إدارة مودة</h1>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>متابعة الثقة، الشكاوى، وحالة المستخدمين</p>
          </div>
        </div>

        {stats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16, marginBottom: 32 }}>
            {[
              { label: "المستخدمون", value: stats.totalUsers, color: "#2d9e5f", icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
              { label: "التوافقات", value: stats.totalMatches, color: "#c5a059", icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg> },
              { label: "الزيجات", value: stats.totalMarriages, color: "#2d9e5f", icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
              { label: "الشكاوى المعلقة", value: stats.totalComplaints, color: "#f85149", icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> },
            ].map((s) => (
              <div key={s.label} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 16px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                <div style={{ color: "var(--text-muted)" }}>{s.icon}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {(["stats", "complaints", "users", "notifications"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "8px 18px",
                borderRadius: 20,
                border: activeTab === tab ? "none" : "1px solid var(--border)",
                background: activeTab === tab ? "var(--primary)" : "transparent",
                color: activeTab === tab ? "white" : "var(--text-muted)",
                fontFamily: "'IBM Plex Sans Arabic', 'Cairo', sans-serif",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              {{ stats: "إحصاءات", complaints: "شكاوى", users: "مستخدمون", notifications: "إشعارات" }[tab]}
            </button>
          ))}
        </div>

        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 24, color: "var(--text-muted)", fontSize: 14 }}>
          {activeTab === "stats" && "الإحصاءات الأساسية جاهزة بالأعلى. راقب الشكاوى والسمعة يومياً لأنها أهم مؤشرات جودة المنتج."}
          {activeTab === "complaints" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <textarea className="input-field" rows={2} placeholder="ملاحظة إدارية اختيارية" value={note} onChange={(e) => setNote(e.target.value)} style={{ fontFamily: "inherit" }} />
              {complaints.length === 0 ? "لا توجد شكاوى حالياً" : complaints.map((complaint) => (
                <div key={complaint.id} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                  <strong style={{ color: "var(--text)" }}>{complaint.reason}</strong>
                  <span>الحالة: {complaint.status} · بتاريخ {new Date(complaint.createdAt).toLocaleDateString("ar-EG")}</span>
                  <span>المشتكي: {complaint.complainant.phone} ({complaint.complainant.gender}) · ضده: {complaint.respondent.phone} ({complaint.respondent.gender})</span>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="reject-btn" disabled={busy} onClick={() => handleComplaint(complaint.id, "WARN")}>تحذير</button>
                    <button className="reject-btn" disabled={busy} onClick={() => handleComplaint(complaint.id, "SUSPEND")}>إيقاف مؤقت</button>
                    <button className="reject-btn" disabled={busy} onClick={() => handleComplaint(complaint.id, "BAN")} style={{ color: "var(--danger)", borderColor: "var(--danger)" }}>حظر</button>
                    <button className="accept-btn" disabled={busy} onClick={() => handleComplaint(complaint.id, "DISMISS")}>رفض الشكوى</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {activeTab === "users" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {users.map((user) => (
                <div key={user.id} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 14, display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center" }}>
                  <div>
                    <strong style={{ color: "var(--text)" }}>{user.phone}</strong>
                    <p style={{ margin: "4px 0 0" }}>
                      {user.gender === "MALE" ? "عريس" : "عروسة"} · {user.status} · سمعة {user.reputationScore}
                      {user.profile ? ` · ${user.profile.age} سنة · اكتمال ${user.profile.completenessScore}%` : " · بلا ملف"}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="reject-btn" disabled={busy} onClick={() => updateUserStatus(user.id, "ACTIVE")}>تنشيط</button>
                    <button className="reject-btn" disabled={busy} onClick={() => updateUserStatus(user.id, "PAUSED")}>إيقاف</button>
                    <button className="reject-btn" disabled={busy} onClick={() => updateUserStatus(user.id, "BANNED")} style={{ color: "var(--danger)", borderColor: "var(--danger)" }}>حظر</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {activeTab === "notifications" && <NotificationsPanel />}
        </div>
      </div>
    </div>
  );
}

function NotificationsPanel() {
  return (
    <div>
      <h2 style={{ fontSize: 18, color: "var(--text)", marginBottom: 16 }}>إرسال إشعار جماعي</h2>
      <textarea id="notification-text" className="input-field" placeholder="مثال: مودة لقت لك ملفات جديدة ممكن تناسبك" rows={4} style={{ width: "100%", marginBottom: 16, fontFamily: "'IBM Plex Sans Arabic', 'Cairo', sans-serif" }} />
      <button
        className="primary-btn"
        onClick={async () => {
          const el = document.getElementById("notification-text") as HTMLTextAreaElement;
          const text = el?.value;
          if (!text?.trim()) return alert("الرجاء كتابة نص الإشعار");
          const res = await fetch("/api/admin/notifications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: text }),
          });
          alert(res.ok ? "تم إرسال الإشعار بنجاح" : "حدث خطأ أثناء الإرسال");
          if (res.ok) el.value = "";
        }}
        style={{ width: 200 }}
      >
        إرسال الإشعار
      </button>
    </div>
  );
}
