"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const GOVERNORATES = [
  { value: "CAIRO", label: "القاهرة" }, { value: "GIZA", label: "الجيزة" }, { value: "ALEXANDRIA", label: "الإسكندرية" },
  { value: "ASWAN", label: "أسوان" }, { value: "ASSIUT", label: "أسيوط" }, { value: "BENI_SUEF", label: "بني سويف" },
  { value: "PORT_SAID", label: "بور سعيد" }, { value: "DAKAHLIA", label: "الدقهلية" }, { value: "DAMIETTA", label: "دمياط" },
  { value: "SUEZ", label: "السويس" }, { value: "SHARQIA", label: "الشرقية" }, { value: "GHARBIA", label: "الغربية" },
  { value: "FAIYUM", label: "الفيوم" }, { value: "KAFR_EL_SHEIKH", label: "كفر الشيخ" }, { value: "LUXOR", label: "الأقصر" },
  { value: "MATRUH", label: "مطروح" }, { value: "MINYA", label: "المنيا" }, { value: "MONUFIA", label: "المنوفية" },
  { value: "NEW_VALLEY", label: "الوادي الجديد" }, { value: "NORTH_SINAI", label: "شمال سيناء" }, { value: "QENA", label: "قنا" },
  { value: "QALIUBIYA", label: "القليوبية" }, { value: "RED_SEA", label: "البحر الأحمر" }, { value: "SOHAG", label: "سوهاج" },
  { value: "SOUTH_SINAI", label: "جنوب سيناء" }, { value: "ISMAILIA", label: "الإسماعيلية" }, { value: "BEHEIRA", label: "البحيرة" }
];

const GOVERNORATES_WITH_OTHER = [
  ...GOVERNORATES,
  { value: "OTHER", label: "دولة أخرى خارج مصر" }
];


const EDUCATION_LEVELS = [
  { value: "BELOW_HIGH_SCHOOL", label: "دون ثانوي" },
  { value: "HIGH_SCHOOL", label: "ثانوي" },
  { value: "UNIVERSITY", label: "جامعي" },
  { value: "MASTERS", label: "ماجستير" },
  { value: "PHD", label: "دكتوراه" }
];

const SKIN_COLORS = [
  { value: "WHITE", label: "أبيض" },
  { value: "WHEAT", label: "قمحي" },
  { value: "BROWN", label: "أسمر" },
  { value: "DARK", label: "داكن" }
];

const HIJAB_TYPES = [
  { value: "NIQAB", label: "منقبة" },
  { value: "KHIMAR", label: "مختمرة" },
  { value: "HIJAB", label: "محجبة" },
  { value: "NONE", label: "غير محجبة" }
];

export default function SetupPage() {
  const router = useRouter();
  const [gender, setGender] = useState<"MALE" | "FEMALE" | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    age: "",
    currentGovernorate: "CAIRO",
    postMarriageGovernorate: "CAIRO",
    maritalStatus: "SINGLE",
    childrenCount: "0",
    currentWivesCount: "1",
    religiousLevel: "3",
    educationLevel: "UNIVERSITY",
    heightCategory: "170",
    weightCategory: "70",
    skinColor: "WHEAT",
    personalMessage: "",
    hijabType: "HIJAB",
  });

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(d => {
        if (d.gender) setGender(d.gender);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const maritalOptions = gender === "FEMALE" ? [
    { value: "SINGLE", label: "عزباء" },
    { value: "DIVORCED", label: "مطلقة" },
    { value: "WIDOWED", label: "أرملة" }
  ] : [
    { value: "SINGLE", label: "أعزب" },
    { value: "DIVORCED", label: "مطلق" },
    { value: "WIDOWED", label: "أرمل" },
    { value: "MARRIED_SEEKING_POLYGAMY", label: "متزوج يطلب التعدد" }
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    if (gender === "FEMALE" && formData.maritalStatus === "MARRIED_SEEKING_POLYGAMY") {
      setError("حالة 'متزوج يطلب التعدد' غير متاحة للإناث");
      setSubmitting(false);
      return;
    }

    const payload = {
      age: parseInt(formData.age),
      currentGovernorate: formData.currentGovernorate,
      postMarriageGovernorate: gender === "FEMALE" ? formData.currentGovernorate : formData.postMarriageGovernorate,
      maritalStatus: formData.maritalStatus,
      childrenCount: ["DIVORCED", "WIDOWED"].includes(formData.maritalStatus) ? parseInt(formData.childrenCount) : null,
      currentWivesCount: formData.maritalStatus === "MARRIED_SEEKING_POLYGAMY" ? parseInt(formData.currentWivesCount) : null,
      religiousLevel: parseInt(formData.religiousLevel),
      educationLevel: formData.educationLevel,
      heightCategory: formData.heightCategory,
      weightCategory: formData.weightCategory,
      skinColor: formData.skinColor,
      personalMessage: formData.personalMessage,
      hijabType: gender === "FEMALE" ? formData.hijabType : undefined,
    };

    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        router.push("/preferences");
      } else {
        const d = await res.json();
        setError(d.error || "فشل في حفظ البيانات. تأكد من صحة البيانات (رقم الولي يجب أن يكون مصري صحيح).");
        setSubmitting(false);
      }
    } catch {
      setError("حدث خطأ أثناء الاتصال بالخادم");
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="main-content" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>جاري التحميل...</div>;
  }

  return (
    <div className="main-content" style={{ display: "flex", flexDirection: "column", minHeight: "calc(100vh - 80px)", padding: "40px 24px", alignItems: "center", fontFamily: "'IBM Plex Sans Arabic', 'Cairo', sans-serif" }}>
      <div style={{ background: "var(--bg-card)", borderRadius: "24px", padding: "40px", boxShadow: "0 20px 40px rgba(0,0,0,0.1)", maxWidth: "800px", width: "100%", border: "1px solid var(--border)" }}>
        
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: "bold", color: "var(--primary)", marginBottom: "8px" }}>إعداد الملف الشخصي</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "16px" }}>يرجى تعبئة البيانات التالية بدقة وأمانة، فهذه هي واجهتك للآخرين.</p>
        </div>

        {error && <div style={{ background: "#ffebee", color: "#c62828", padding: "16px", borderRadius: "12px", marginBottom: "24px", textAlign: "center", fontWeight: "bold" }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>السن</label>
              <input required type="number" name="age" min="18" max="90" value={formData.age} onChange={handleChange} style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid var(--border)", fontFamily: "'IBM Plex Sans Arabic', 'Cairo', sans-serif", fontSize: "15px" }} placeholder="مثال: 25" />
            </div>
          </div>

          {gender === "MALE" ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>المحافظة الحالية</label>
                <select name="currentGovernorate" value={formData.currentGovernorate} onChange={handleChange} style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid var(--border)", fontFamily: "'IBM Plex Sans Arabic', 'Cairo', sans-serif", fontSize: "15px" }}>
                  {GOVERNORATES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>مكان الاستقرار بعد الزواج</label>
                <select name="postMarriageGovernorate" value={formData.postMarriageGovernorate} onChange={handleChange} style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid var(--border)", fontFamily: "'IBM Plex Sans Arabic', 'Cairo', sans-serif", fontSize: "15px" }}>
                  {GOVERNORATES_WITH_OTHER.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>المحافظة الحالية</label>
                <select name="currentGovernorate" value={formData.currentGovernorate} onChange={handleChange} style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid var(--border)", fontFamily: "'IBM Plex Sans Arabic', 'Cairo', sans-serif", fontSize: "15px" }}>
                  {GOVERNORATES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>الحالة الاجتماعية</label>
              <select name="maritalStatus" value={formData.maritalStatus} onChange={handleChange} style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid var(--border)", fontFamily: "'IBM Plex Sans Arabic', 'Cairo', sans-serif", fontSize: "15px" }}>
                {maritalOptions.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>المستوى التعليمي</label>
              <select name="educationLevel" value={formData.educationLevel} onChange={handleChange} style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid var(--border)", fontFamily: "'IBM Plex Sans Arabic', 'Cairo', sans-serif", fontSize: "15px" }}>
                {EDUCATION_LEVELS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
          </div>

          {["DIVORCED", "WIDOWED"].includes(formData.maritalStatus) && (
            <div style={{ padding: "16px", background: "var(--bg)", borderRadius: "12px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>عدد الأبناء</label>
              <input required type="number" name="childrenCount" min="0" value={formData.childrenCount} onChange={handleChange} style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid var(--border)", fontFamily: "'IBM Plex Sans Arabic', 'Cairo', sans-serif" }} />
            </div>
          )}
          {formData.maritalStatus === "MARRIED_SEEKING_POLYGAMY" && gender === "MALE" && (
            <div style={{ padding: "16px", background: "var(--bg)", borderRadius: "12px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>عدد الزوجات الحاليات</label>
              <input required type="number" name="currentWivesCount" min="1" max="3" value={formData.currentWivesCount} onChange={handleChange} style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid var(--border)", fontFamily: "'IBM Plex Sans Arabic', 'Cairo', sans-serif" }} />
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "24px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>الطول التقريبي (سم)</label>
              <input required type="number" name="heightCategory" min="140" max="220" value={formData.heightCategory} onChange={handleChange} style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid var(--border)", fontFamily: "'IBM Plex Sans Arabic', 'Cairo', sans-serif" }} />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>الوزن التقريبي (كجم)</label>
              <input required type="number" name="weightCategory" min="40" max="150" value={formData.weightCategory} onChange={handleChange} style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid var(--border)", fontFamily: "'IBM Plex Sans Arabic', 'Cairo', sans-serif" }} />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>لون البشرة</label>
              <select name="skinColor" value={formData.skinColor} onChange={handleChange} style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid var(--border)", fontFamily: "'IBM Plex Sans Arabic', 'Cairo', sans-serif" }}>
                {SKIN_COLORS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
          </div>

          {gender === "FEMALE" && (
            <div style={{ padding: "20px", background: "#fdf8f5", borderRadius: "12px", border: "1px solid #f9e2d6" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>نوع الحجاب</label>
              <select name="hijabType" value={formData.hijabType} onChange={handleChange} style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid var(--border)", fontFamily: "'IBM Plex Sans Arabic', 'Cairo', sans-serif" }}>
                {HIJAB_TYPES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
          )}

          <div>
            <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>الرسالة الشخصية التعريفية (تظهر للجميع)</label>
            <p style={{ fontSize: "13.5px", color: "var(--text-muted)", marginBottom: "12px", lineHeight: "1.6" }}>
              يرجى كتابة نبذة واضحة وصادقة عن نفسك وعن اهتماماتك، مع توضيح المواصفات التي تبحث عنها في شريك حياتك.
              إذا كان لديك أي ظروف أو شروط خاصة (مثل السفر، ظروف العمل، أو غيرها)، يرجى ذكرها هنا بكل صراحة.
              <br />
              <strong>تنبيه هام:</strong> يمنع تماماً وضع أرقام هواتف أو روابط وحسابات تواصل لتجنب حظر حسابك تلقائياً.
            </p>
            <textarea required name="personalMessage" value={formData.personalMessage} onChange={handleChange} rows={6} style={{ width: "100%", padding: "16px", borderRadius: "12px", border: "1px solid var(--border)", fontFamily: "'IBM Plex Sans Arabic', 'Cairo', sans-serif", resize: "vertical", fontSize: "15px", lineHeight: "1.6" }} placeholder="اكتب رسالتك الشخصية هنا بالتفصيل..." />
          </div>

          <button type="submit" disabled={submitting} style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-light))", color: "white", padding: "18px", borderRadius: "12px", fontSize: "18px", fontWeight: "bold", border: "none", cursor: submitting ? "not-allowed" : "pointer", marginTop: "16px", boxShadow: "0 8px 24px rgba(14,90,67,0.3)", transition: "transform 0.2s" }}>
            {submitting ? "جاري الحفظ..." : "حفظ الملف والبدء"}
          </button>
        </form>

      </div>
    </div>
  );
}
