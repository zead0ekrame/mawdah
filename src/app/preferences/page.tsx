"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const WEIGHT_LABELS: Record<number, string> = {
  1: "مفضل",
  2: "مهم",
  3: "ضروري جداً",
  4: "شرط لا أتنازل عنه",
};

const WEIGHT_SHORT_LABELS: Record<number, string> = {
  1: "مفضل",
  2: "مهم",
  3: "ضروري",
  4: "شرط",
};

const WEIGHT_COLORS: Record<number, string> = {
  1: "#2d9e5f",
  2: "#c9a84c",
  3: "#d29922",
  4: "#f85149",
};

interface Pref {
  trait: string;
  label: string;
  type: "select" | "range" | "bool";
  options?: { value: string; label: string }[];
  genderOnly?: "MALE" | "FEMALE";
}

const PREFERENCES: Pref[] = [
  {
    trait: "AGE_MIN", label: "الحد الأدنى للسن", type: "range",
    options: Array.from({ length: 40 }, (_, i) => ({ value: String(18 + i), label: String(18 + i) })),
  },
  {
    trait: "AGE_MAX", label: "الحد الأقصى للسن", type: "range",
    options: Array.from({ length: 40 }, (_, i) => ({ value: String(18 + i), label: String(18 + i) })),
  },
  {
    trait: "EDUCATION_LEVEL_MIN", label: "أدنى مستوى تعليم", type: "select",
    options: [
      { value: "BELOW_HIGH_SCHOOL", label: "دون ثانوي" },
      { value: "HIGH_SCHOOL", label: "ثانوي" },
      { value: "UNIVERSITY", label: "جامعي" },
      { value: "MASTERS", label: "ماجستير" },
      { value: "PHD", label: "دكتوراه" },
    ],
  },
  {
    trait: "POST_MARRIAGE_GOVERNORATE",
    label: "مكان الاستقرار بعد الزواج",
    type: "select",
    genderOnly: "FEMALE",
    options: [
      { value: "CAIRO", label: "القاهرة" }, { value: "GIZA", label: "الجيزة" }, { value: "ALEXANDRIA", label: "الإسكندرية" },
      { value: "ASWAN", label: "أسوان" }, { value: "ASSIUT", label: "أسيوط" }, { value: "BENI_SUEF", label: "بني سويف" },
      { value: "PORT_SAID", label: "بور سعيد" }, { value: "DAKAHLIA", label: "الدقهلية" }, { value: "DAMIETTA", label: "دمياط" },
      { value: "SUEZ", label: "السويس" }, { value: "SHARQIA", label: "الشرقية" }, { value: "GHARBIA", label: "الغربية" },
      { value: "FAIYUM", label: "الفيوم" }, { value: "KAFR_EL_SHEIKH", label: "كفر الشيخ" }, { value: "LUXOR", label: "الأقصر" },
      { value: "MATRUH", label: "مطروح" }, { value: "MINYA", label: "المنيا" }, { value: "MONUFIA", label: "المنوفية" },
      { value: "NEW_VALLEY", label: "الوادي الجديد" }, { value: "NORTH_SINAI", label: "شمال سيناء" }, { value: "QENA", label: "قنا" },
      { value: "QALIUBIYA", label: "القليوبية" }, { value: "RED_SEA", label: "البحر الأحمر" }, { value: "SOHAG", label: "سوهاج" },
      { value: "SOUTH_SINAI", label: "جنوب سيناء" }, { value: "ISMAILIA", label: "الإسماعيلية" }, { value: "BEHEIRA", label: "البحيرة" },
      { value: "OTHER", label: "دولة أخرى خارج مصر" }
    ],
  },
  {
    trait: "ACCEPTS_CHILDREN", label: "يقبل من لديه أبناء", type: "bool",
  },
  {
    trait: "ACCEPTS_DIVORCED", label: "يقبل مطلق/مطلقة", type: "bool",
  },
  {
    trait: "ACCEPTS_WIDOWED", label: "يقبل أرمل/أرملة", type: "bool",
  },
  {
    trait: "ACCEPTS_POLYGAMY", label: "تقبل التعدد", type: "bool",
    genderOnly: "FEMALE",
  },
  {
    trait: "HIJAB_TYPE_PREFERENCE", label: "نوع الحجاب المفضّل", type: "select",
    genderOnly: "MALE",
    options: [
      { value: "NIQAB", label: "منقبة" },
      { value: "KHIMAR", label: "مختمرة" },
      { value: "HIJAB", label: "محجبة" },
      { value: "NONE", label: "غير محجبة" },
    ],
  },
];

const getDynamicLabel = (trait: string, gender: "MALE" | "FEMALE", defaultLabel: string) => {
  if (gender === "FEMALE") {
    switch (trait) {
      case "ACCEPTS_CHILDREN": return "تقبلين من لديه أبناء؟";
      case "ACCEPTS_DIVORCED": return "تقبلين مطلقاً؟";
      case "ACCEPTS_WIDOWED": return "تقبلين أرملاً؟";
      case "ACCEPTS_POLYGAMY": return "تقبلين التعدد؟";
      default: return defaultLabel;
    }
  } else {
    switch (trait) {
      case "ACCEPTS_CHILDREN": return "تقبل من لديها أبناء؟";
      case "ACCEPTS_DIVORCED": return "تقبل مطلقة؟";
      case "ACCEPTS_WIDOWED": return "تقبل أرملة؟";
      default: return defaultLabel;
    }
  }
};

interface PrefEntry {
  value: string;
  weight: number;
  enabled: boolean;
}

export default function PreferencesPage() {
  const router = useRouter();
  const [gender, setGender] = useState<"MALE" | "FEMALE">("MALE");
  const [prefs, setPrefs] = useState<Record<string, PrefEntry>>({});
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  // States for confirmation modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [contactPhone, setContactPhone] = useState("");
  const [contactMethod, setContactMethod] = useState("WHATSAPP");
  const [agreed, setAgreed] = useState(false);
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d.gender) setGender(d.gender);
    }).catch(() => {});
    fetch("/api/profile").then(r => r.json()).then(d => {
      if (d.profile?.guardianPhone) {
        const [phone, method] = d.profile.guardianPhone.split("|");
        setContactPhone(phone || "");
        setContactMethod(method || "WHATSAPP");
      }
      if (d.preferences?.length) {
        const map: Record<string, PrefEntry> = {};
        d.preferences.forEach((p: any) => {
          map[p.trait] = { value: p.value, weight: p.weight, enabled: true };
        });
        setPrefs(map);
      }
    }).catch(() => {});
  }, []);

  const updatePref = (trait: string, key: "value" | "weight", val: string | number) => {
    setPrefs(prev => {
      const current = prev[trait] || { value: "", weight: 2, enabled: true };
      return {
        ...prev,
        [trait]: { ...current, [key]: val, enabled: true },
      };
    });
  };

  const handleSaveClick = () => {
    setValidationError("");
    setShowConfirmModal(true);
  };

  const confirmAndSave = async () => {
    if (!contactPhone || !/^01[0125]\d{8}$/.test(contactPhone)) {
      setValidationError("يرجى إدخال رقم هاتف محمول مصري صحيح مكون من 11 رقماً ويبدأ بـ 01");
      return;
    }
    if (!agreed) {
      setValidationError("يجب قراءة الشروط والموافقة وتأكيد جديتك للمتابعة");
      return;
    }

    setLoading(true);
    setValidationError("");

    // 1. Save the contact phone + channel to Profile
    const guardianPhoneValue = gender === "FEMALE" ? `${contactPhone}|${contactMethod}` : contactPhone;
    const profileRes = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guardianPhone: guardianPhoneValue }),
    });

    if (!profileRes.ok) {
      const d = await profileRes.json();
      setValidationError(d.error || "فشل في حفظ رقم التواصل");
      setLoading(false);
      return;
    }

    // 2. Save the Preferences
    const entries = Object.entries(prefs)
      .filter(([, v]) => v.value && v.value !== "")
      .map(([trait, v]) => ({ trait, value: v.value, weight: v.weight }));

    const res = await fetch("/api/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferences: entries }),
    });

    setLoading(false);
    if (res.ok) {
      setSaved(true);
      setShowConfirmModal(false);
      setTimeout(() => router.push("/browse"), 1500);
    } else {
      setValidationError("فشل في حفظ التفضيلات");
    }
  };

  const visiblePrefs = PREFERENCES.filter(p => !p.genderOnly || p.genderOnly === gender);

  return (
    <div className="main-content" style={{ minHeight: "calc(100vh - 80px)", background: "var(--bg)", padding: "40px 24px", fontFamily: "'IBM Plex Sans Arabic', 'Cairo', sans-serif" }}>
      <div style={{ maxWidth: 600, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24, background: "var(--bg-card)", padding: 32, borderRadius: 24, border: "1px solid var(--border)", boxShadow: "0 20px 40px rgba(0,0,0,0.1)" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => router.back()}
            style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 16px", color: "var(--text-muted)", cursor: "pointer", fontFamily: "'IBM Plex Sans Arabic', 'Cairo', sans-serif", display: "flex", alignItems: "center", gap: "6px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            <span>رجوع</span>
          </button>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)" }}>تفضيلاتك في شريك الحياة</h1>
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>حدّد المواصفات التي تبحث عنها، والخوارزمية ستهتم بالباقي</p>
          </div>
        </div>

        {/* Bot hint */}
        <div style={{
          background: "var(--bot-bubble)", border: "1px solid var(--border)",
          borderRadius: "var(--radius)", borderBottomRightRadius: "var(--radius-sm)",
          padding: "12px 16px", fontSize: 13, color: "var(--text)", lineHeight: 1.6,
        }}>
          <strong>شرط لا أتنازل عنه</strong> يعني أن من لا ينطبق عليه الشرط لن يظهر لك مطلقاً.
          <br />استخدمه فقط مع الأمور الحاسمة والمصيرية بالنسبة لك.
        </div>

        {/* Preferences list */}
        {visiblePrefs.map(pref => {
          const entry = prefs[pref.trait];
          const hasValue = entry?.value && entry.value !== "";

          return (
            <div key={pref.trait} style={{
              background: "var(--bg-card)",
              border: `1px solid ${hasValue ? "var(--primary-light)" : "var(--border)"}`,
              boxShadow: hasValue ? "0 4px 12px rgba(14,90,67,0.06)" : "none",
              borderRadius: "16px",
              padding: "20px",
              transition: "all 0.25s ease",
            }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <span style={{ fontSize: "15px", fontWeight: "bold", color: "var(--text)" }}>{getDynamicLabel(pref.trait, gender, pref.label)}</span>
                {hasValue && (
                  <span style={{ fontSize: "12px", color: "var(--primary)", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    <span>مفعّل</span>
                  </span>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {/* Value Input */}
                {pref.type === "select" && (
                  <select className="input-field" value={entry?.value || ""}
                    onChange={e => updatePref(pref.trait, "value", e.target.value)}
                    style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid var(--border)", fontFamily: "'IBM Plex Sans Arabic', 'Cairo', sans-serif", fontSize: "14px", cursor: "pointer" }}>
                    <option value="">لا يهم / غير محدد</option>
                    {pref.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                )}

                {pref.type === "range" && (
                  <select className="input-field" value={entry?.value || ""}
                    onChange={e => updatePref(pref.trait, "value", e.target.value)}
                    style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid var(--border)", fontFamily: "'IBM Plex Sans Arabic', 'Cairo', sans-serif", fontSize: "14px", cursor: "pointer" }}>
                    <option value="">لا يهم / غير محدد</option>
                    {pref.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                )}

                {pref.type === "bool" && (
                  <div style={{ display: "flex", gap: "8px" }}>
                    {[
                      { v: "true", l: "نعم" },
                      { v: "false", l: "لا" },
                      { v: "", l: "لا يهم" }
                    ].map(opt => {
                      const isSelected = (entry?.value || "") === opt.v;
                      return (
                        <button key={opt.v}
                          type="button"
                          onClick={() => updatePref(pref.trait, "value", opt.v)}
                          style={{
                            flex: 1, padding: "10px 8px", borderRadius: "10px",
                            border: `1px solid ${isSelected ? "var(--primary)" : "var(--border)"}`,
                            background: isSelected ? "var(--bot-bubble)" : "transparent",
                            color: isSelected ? "var(--primary)" : "var(--text-muted)",
                            fontFamily: "'IBM Plex Sans Arabic', 'Cairo', sans-serif", fontSize: "13px", fontWeight: isSelected ? "bold" : "normal", cursor: "pointer",
                            transition: "all 0.2s"
                          }}
                        >{opt.l}</button>
                      );
                    })}
                  </div>
                )}

                {/* Weight selector - enabled only when value is set */}
                <div style={{ opacity: hasValue ? 1 : 0.5, transition: "opacity 0.2s", marginTop: "4px" }}>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px", fontWeight: "bold" }}>مدى أهمية هذا الشرط</p>
                  <div style={{ display: "flex", gap: "6px" }}>
                    {[1, 2, 3, 4].map(w => {
                      const currentWeight = entry?.weight || 2;
                      const isSelected = currentWeight === w;
                      return (
                        <button key={w}
                          type="button"
                          disabled={!hasValue}
                          onClick={() => updatePref(pref.trait, "weight", w)}
                          style={{
                            flex: 1, padding: "8px 4px",
                            borderRadius: "8px", border: "none",
                            background: isSelected && hasValue ? WEIGHT_COLORS[w] : "var(--bg-input)",
                            color: isSelected && hasValue ? "white" : "var(--text-muted)",
                            fontFamily: "'IBM Plex Sans Arabic', 'Cairo', sans-serif", fontSize: "11px", cursor: hasValue ? "pointer" : "not-allowed",
                            transition: "all 0.2s", fontWeight: isSelected && hasValue ? "bold" : "normal",
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {WEIGHT_SHORT_LABELS[w]}
                        </button>
                      );
                    })}
                  </div>
                  {hasValue && (
                    <p style={{ fontSize: "11px", color: WEIGHT_COLORS[entry?.weight ?? 2], marginTop: "6px", textAlign: "center", fontWeight: "bold" }}>
                      {WEIGHT_LABELS[entry?.weight ?? 2]}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {saved && (
          <p style={{ textAlign: "center", color: "var(--success)", fontSize: 14 }}>
            تم الحفظ بنجاح! جاري التوجيه...
          </p>
        )}

        <button className="primary-btn" onClick={handleSaveClick} disabled={loading}>
          {loading ? "جاري الحفظ..." : "حفظ التفضيلات"}
        </button>

        <p style={{ textAlign: "center", fontSize: 12, color: "var(--text-muted)" }}>
          يمكنك تعديل تفضيلاتك في أي وقت من الإعدادات
        </p>
      </div>

      {/* Final Safety and Seriousness Confirmation Modal */}
      {showConfirmModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.65)", display: "flex", justifyContent: "center", alignItems: "center",
          zIndex: 9999, padding: "20px", backdropFilter: "blur(4px)"
        }}>
          <div style={{
            background: "var(--bg-card)", maxWidth: "550px", width: "100%", borderRadius: "24px",
            padding: "32px", border: "1px solid var(--border)", boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
            display: "flex", flexDirection: "column", gap: "20px", maxHeight: "90vh", overflowY: "auto",
            fontFamily: "'IBM Plex Sans Arabic', 'Cairo', sans-serif"
          }}>
            {/* Modal Title */}
            <div style={{ textAlign: "center" }}>
              <span style={{ display: "inline-flex", justifyContent: "center", color: "#f85149" }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </span>
              <h2 style={{ fontSize: "20px", fontWeight: "800", color: "var(--text)", marginTop: "10px" }}>
                تأكيد هام جداً وجديّة الطلب
              </h2>
              <div style={{ height: "4px", width: "60px", background: "var(--primary)", margin: "12px auto", borderRadius: "2px" }} />
            </div>

            {/* Message Details based on Gender */}
            {gender === "FEMALE" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "14px", lineHeight: "1.6", color: "var(--text)" }}>
                <p style={{ fontWeight: "bold", color: "var(--primary-light)", textAlign: "center" }}>
                  أختي الفاضلة، منصة مودة هي منصة جادة للزواج الشرعي وليست للتسلية أو اللعب.
                </p>
                <p>
                  معظم الرجال المشتركين لدينا أشخاص جادون وعاقلون يبحثون عن الاستقرار والبيت الصالح. في حال حدوث أي مضايقة أو ثبوت عدم جدية من أي مشترك يتم <strong>حظره فوراً ونهائياً</strong> من المنصة.
                </p>
                <p style={{ background: "rgba(248,81,73,0.06)", border: "1px dashed #f85149", padding: "12px", borderRadius: "10px", color: "#f85149", fontWeight: "bold" }}>
                  تنبيه حاسم: إدخال رقم تواصل وهمي أو غير صحيح يؤدي لحظر حسابك تماماً وتلقائياً.
                </p>
                
                <div style={{ background: "var(--bot-bubble)", padding: "16px", borderRadius: "12px", border: "1px solid var(--border)" }}>
                  <strong style={{ color: "var(--primary-light)", display: "block", marginBottom: "6px" }}>نصائح هامة لحمايتك وخصوصيتك:</strong>
                  <ul style={{ paddingRight: "16px", margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
                    <li>يفضّل بشدة أن يكون رقم التواصل الذي تضعينه هو <strong>رقم والدك، شقيقك، أو شخص مسؤول عنكِ</strong>، وذلك لضمان وقار التواصل وجديته الشرعية التامة.</li>
                    <li>إذا اضطررتِ للتواصل بنفسك، <strong>لا تضعي رقمك الشخصي الأساسي أبداً</strong> لعدم التعرض لأي مضايقات محتملة (يمكنك استخدام رقم ثانوي أو مخصص للغرض).</li>
                  </ul>
                </div>

                <p style={{ fontSize: "13px", color: "var(--text-muted)", background: "var(--bg-input)", padding: "10px", borderRadius: "8px" }}>
                  <strong>نظام التواصل:</strong> المنصة لا تحتوى حالياً على محادثات (شات) مباشرة، ولكن عند حدوث توافق كامل ومزدوج (موافقة الطرفين على بعضهما), يكشف النظام تلقائياً بيانات التواصل المحددة هنا لكل منكما ليتواصل العريس مع أهل العروس مباشرة.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "14px", lineHeight: "1.6", color: "var(--text)" }}>
                <p style={{ fontWeight: "bold", color: "var(--primary-light)", textAlign: "center" }}>
                  أخي الفاضل، منصة مودة هي منصة جادة للزواج الشرعي ونسير بضوابط صارمة جداً.
                </p>
                <p>
                  أي شكوى تصلنا من عدم الجدية، أو سوء الخلق، أو محاولة التسلية ببنات الناس، سيترتب عليها <strong>حظر حسابك ورقمك نهائياً وفوراً</strong> دون أي نقاش أو تراجع.
                </p>
                <p style={{ background: "rgba(248,81,73,0.06)", border: "1px dashed #f85149", padding: "12px", borderRadius: "10px", color: "#f85149", fontWeight: "bold" }}>
                  تنبيه حاسم: يجب إدخال رقم هاتف صحيح ستستخدمه للتواصل مع أهل العروسة. إدخال أي رقم وهمي أو غير صحيح يعرض حسابك للحظر الفوري والنهائي.
                </p>

                <div style={{ background: "var(--bot-bubble)", padding: "16px", borderRadius: "12px", border: "1px solid var(--border)" }}>
                  <strong style={{ color: "var(--primary-light)", display: "block", marginBottom: "6px" }}>توجيهات هامة للمطابقة:</strong>
                  <ul style={{ paddingRight: "16px", margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
                    <li>بما أنك العريس، <strong>فأنت ملزم شرعاً وأخلاقاً بالمبادرة والاتصال بولي العروسة فور حدوث التوافق التام وكشف البيانات دون أي تأخير أو تسويف</strong>.</li>
                    <li><strong>تنبيه بالغ الأهمية:</strong> يجب أن تتواصل معهم <strong>من نفس الرقم</strong> الذي تسجله في الأسفل حتى يعرف ولي أمر العروسة هويتك ولا يتعرض اتصالك للتجاهل أو الرفض.</li>
                  </ul>
                </div>

                <p style={{ fontSize: "13px", color: "var(--text-muted)", background: "var(--bg-input)", padding: "10px", borderRadius: "8px" }}>
                  <strong>نظام التواصل:</strong> المنصة لا تحتوى حالياً على محادثات (شات) مباشرة، ولكن عند حدوث توافق كامل ومزدوج (موافقة الطرفين على بعضهما)، يكشف النظام تلقائياً بيانات التواصل المحددة هنا للطرف الآخر لتتمكن من الاتصال بولي العروسة مباشرة.
                </p>
              </div>
            )}

            {/* Form Input fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "10px", borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "14px", fontWeight: "bold", marginBottom: "6px", color: "var(--text)" }}>
                  {gender === "FEMALE" ? "رقم هاتف التواصل للولي أو المسؤول" : "رقم الهاتف الذي ستتواصل منه مع أهل العروسة"}
                </label>
                <input
                  type="tel"
                  required
                  value={contactPhone}
                  onChange={e => setContactPhone(e.target.value)}
                  placeholder="01xxxxxxxxx"
                  style={{
                    width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid var(--border)",
                    background: "var(--bg-input)", color: "var(--text)", fontFamily: "'IBM Plex Sans Arabic', 'Cairo', sans-serif", fontSize: "15px"
                  }}
                />
              </div>

              {gender === "FEMALE" && (
                <div>
                  <label style={{ display: "block", fontSize: "14px", fontWeight: "bold", marginBottom: "6px", color: "var(--text)" }}>
                    قناة التواصل المفضلة
                  </label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {[
                      { v: "WHATSAPP", l: "واتساب" },
                      { v: "TELEGRAM", l: "تليجرام" },
                      { v: "PHONE_CALL", l: "اتصال هاتفي" }
                    ].map(ch => (
                      <button
                        key={ch.v}
                        type="button"
                        onClick={() => setContactMethod(ch.v)}
                        style={{
                          flex: 1, padding: "10px 8px", borderRadius: "10px",
                          border: `1px solid ${contactMethod === ch.v ? "var(--primary)" : "var(--border)"}`,
                          background: contactMethod === ch.v ? "var(--bot-bubble)" : "transparent",
                          color: contactMethod === ch.v ? "var(--primary)" : "var(--text-muted)",
                          fontFamily: "'IBM Plex Sans Arabic', 'Cairo', sans-serif", fontSize: "13px", fontWeight: contactMethod === ch.v ? "bold" : "normal",
                          cursor: "pointer", transition: "all 0.2s"
                        }}
                      >
                        {ch.l}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Consent checkbox */}
            <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", marginTop: "8px" }}>
              <input
                type="checkbox"
                id="agreed-checkbox"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                style={{ marginTop: "4px", width: "16px", height: "16px", cursor: "pointer" }}
              />
              <label htmlFor="agreed-checkbox" style={{ fontSize: "13px", color: "var(--text)", cursor: "pointer", userSelect: "none", lineHeight: "1.4" }}>
                أوافق وأقر بجدية طلبي التامة للزواج الشرعي ومسؤوليتي الكاملة عن دقة بياناتي والتزامي بالضوابط والآداب.
              </label>
            </div>

            {validationError && (
              <p style={{ color: "#f85149", fontSize: "13px", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", margin: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                {validationError}
              </p>
            )}

            {/* Action buttons */}
            <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                style={{
                  flex: 1, padding: "14px", borderRadius: "12px", border: "1px solid var(--border)",
                  background: "transparent", color: "var(--text-muted)", fontFamily: "'IBM Plex Sans Arabic', 'Cairo', sans-serif", fontSize: "15px",
                  fontWeight: "bold", cursor: "pointer"
                }}
              >
                إلغاء وتعديل
              </button>
              <button
                type="button"
                onClick={confirmAndSave}
                disabled={loading}
                style={{
                  flex: 1.5, padding: "14px", borderRadius: "12px", border: "none",
                  background: "linear-gradient(135deg, var(--primary), var(--primary-light))", color: "white",
                  fontFamily: "'IBM Plex Sans Arabic', 'Cairo', sans-serif", fontSize: "15px", fontWeight: "bold", cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 12px rgba(14,90,67,0.2)"
                }}
              >
                {loading ? "جاري الحفظ..." : "تأكيد وحفظ التفضيلات"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
