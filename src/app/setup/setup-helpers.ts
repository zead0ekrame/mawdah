export type Step =
  | "name" | "age" | "marital" | "children_count" | "wives_count"
  | "location" | "religious" | "education"
  | "height" | "weight" | "skin"
  | "message_choice" | "message_bot" | "message_manual" | "message_review"
  | "hijab" | "guardian_phone" | "done";

export interface FormData {
  maritalStatus: string; childrenCount: string; currentWivesCount: string;
  currentGovernorate: string; religiousLevel: string; educationLevel: string;
  heightCategory: string; weightCategory: string; skinColor: string;
  personalMessage: string; hijabType: string; guardianPhone: string;
}

export interface ChatMsg { from: "bot" | "user"; text: string; }

export const defaultForm: FormData = {
  maritalStatus: "", childrenCount: "", currentWivesCount: "",
  currentGovernorate: "", religiousLevel: "", educationLevel: "",
  heightCategory: "", weightCategory: "", skinColor: "",
  personalMessage: "", hijabType: "", guardianPhone: "",
};

export const GOVERNORATES = [
  { value: "CAIRO", label: "القاهرة" }, { value: "GIZA", label: "الجيزة" },
  { value: "ALEXANDRIA", label: "الإسكندرية" }, { value: "ASWAN", label: "أسوان" },
  { value: "ASSIUT", label: "أسيوط" }, { value: "BENI_SUEF", label: "بني سويف" },
  { value: "PORT_SAID", label: "بور سعيد" }, { value: "DAKAHLIA", label: "الدقهلية" },
  { value: "DAMIETTA", label: "دمياط" }, { value: "SUEZ", label: "السويس" },
  { value: "SHARQIA", label: "الشرقية" }, { value: "GHARBIA", label: "الغربية" },
  { value: "FAIYUM", label: "الفيوم" }, { value: "KAFR_EL_SHEIKH", label: "كفر الشيخ" },
  { value: "LUXOR", label: "الأقصر" }, { value: "MATRUH", label: "مطروح" },
  { value: "MINYA", label: "المنيا" }, { value: "MONUFIA", label: "المنوفية" },
  { value: "NEW_VALLEY", label: "الوادي الجديد" }, { value: "NORTH_SINAI", label: "شمال سيناء" },
  { value: "QENA", label: "قنا" }, { value: "QALIUBIYA", label: "القليوبية" },
  { value: "RED_SEA", label: "البحر الأحمر" }, { value: "SOHAG", label: "سوهاج" },
  { value: "SOUTH_SINAI", label: "جنوب سيناء" }, { value: "ISMAILIA", label: "الإسماعيلية" },
  { value: "BEHEIRA", label: "البحيرة" },
];

export const HEIGHT_CATEGORIES = Array.from({ length: 13 }, (_, i) => {
  const min = 140 + i * 5;
  return { value: `${min}-${min + 4}`, label: `${min}–${min + 4} سم` };
});

export const WEIGHT_CATEGORIES = Array.from({ length: 17 }, (_, i) => {
  const min = 40 + i * 5;
  return { value: `${min}-${min + 4}`, label: `${min}–${min + 4} كجم` };
});

export function getBotQuestion(step: Step, name: string, gender: "MALE" | "FEMALE"): string {
  const m = gender === "MALE";
  switch (step) {
    case "name": return "أهلاً! 👋 أنا أنيس، مساعدك الشخصي. عشان أكلمك صح، ممكن تقولي اسمك أيه؟";
    case "age": return `أهلاً ${name}! 😊 كام سنة عندك؟`;
    case "marital": return `تمام يا ${name}! حالتك الاجتماعية؟ 💍`;
    case "children_count": return "وعندك أبناء؟";
    case "wives_count": return "وكام زوجة معاك دلوقتي؟";
    case "location": return `وساكن فين دلوقتي يا ${name}؟ 🏙️`;
    case "religious": return `مستوى التزامك الديني إيه يا ${name}؟ 🕌`;
    case "education": return "وتعليمك؟ 🎓";
    case "height": return `طولك في نطاق أيه تقريباً يا ${name}؟ 📏`;
    case "weight": return "ووزنك تقريباً؟ ⚖️";
    case "skin": return "ولون بشرتك؟ 🎨";
    case "message_choice": return `وصلنا لآخر حاجة يا ${name}! 💬\nرسالتك الشخصية هي أهم حاجة في ملفك — دي اللي ${m ? "يشوفها" : "تشوفها"} الطرف التاني أول ما يفتح ملفك.\n\nتحب أساعدك أكتبها، ولا تفضل تكتبها بنفسك؟`;
    case "message_manual": return `براحتك يا ${name}! اكتب كل اللي تحب تقوله عن نفسك وأهدافك ✍️`;
    case "message_review": return `دي رسالتك يا ${name}، شوف لو حابب تعدل فيها حاجة 👇`;
    case "hijab": return `وأخيراً يا ${name}، نوع حجابك؟`;
    case "guardian_phone": return "محتاج رقم ولي أمرك — مش هيتكشف إلا بعد التوافق الكامل 🔒";
    default: return "";
  }
}

export function getAnswerLabel(step: Step, value: string, gender: "MALE" | "FEMALE"): string {
  const m = gender === "MALE";
  if (step === "marital") {
    const map: Record<string, string> = {
      SINGLE: m ? "أعزب" : "عزباء",
      DIVORCED: m ? "مطلق" : "مطلقة",
      WIDOWED: m ? "أرمل" : "أرملة",
      MARRIED_SEEKING_POLYGAMY: "متزوج ويطلب التعدد",
    };
    return map[value] || value;
  }
  if (step === "location") return GOVERNORATES.find(g => g.value === value)?.label || value;
  if (step === "religious") {
    const map: Record<string, string> = { "1": "غير ملتزم", "2": "قليل الالتزام", "3": "متوسط", "4": "ملتزم", "5": "ملتزم جداً" };
    return map[value] || value;
  }
  if (step === "education") {
    const map: Record<string, string> = { BELOW_HIGH_SCHOOL: "دون ثانوي", HIGH_SCHOOL: "ثانوي", UNIVERSITY: "جامعي", MASTERS: "ماجستير", PHD: "دكتوراه" };
    return map[value] || value;
  }
  if (step === "skin") {
    const map: Record<string, string> = { WHITE: "أبيض", WHEAT: "قمحي", BROWN: "أسمر", DARK: "داكن" };
    return map[value] || value;
  }
  if (step === "hijab") {
    const map: Record<string, string> = { NIQAB: "منقبة", HIJAB: "محجبة", NONE: "غير محجبة" };
    return map[value] || value;
  }
  if (step === "children_count") return value === "0" ? "لا يوجد أبناء" : `${value} ${value === "1" ? "ابن" : "أبناء"}`;
  if (step === "wives_count") return `${value} زوجة`;
  if (step === "message_choice") return value === "bot" ? "🤖 ساعدني يا أنيس" : "✍️ هكتبها بنفسي";
  if (step === "age") return `${value} سنة`;
  return value;
}

export function getNextStep(current: Step, form: FormData, gender: "MALE" | "FEMALE"): Step | null {
  switch (current) {
    case "name": return "age";
    case "age": return "marital";
    case "marital":
      if (form.maritalStatus === "DIVORCED" || form.maritalStatus === "WIDOWED") return "children_count";
      if (form.maritalStatus === "MARRIED_SEEKING_POLYGAMY") return "wives_count";
      return "location";
    case "children_count": return "location";
    case "wives_count": return "location";
    case "location": return "religious";
    case "religious": return "education";
    case "education": return "height";
    case "height": return "weight";
    case "weight": return "skin";
    case "skin": return "message_choice";
    case "message_choice": return null;
    case "message_bot": return null;
    case "message_manual": return "message_review";
    case "message_review": return gender === "FEMALE" ? "hijab" : null;
    case "hijab": return "guardian_phone";
    case "guardian_phone": return null;
    default: return null;
  }
}

export const ALL_STEPS: Step[] = [
  "name", "age", "marital", "location", "religious", "education",
  "height", "weight", "skin", "message_choice", "message_review"
];

export function getProgress(step: Step): number {
  const order: Step[] = [
    "name", "age", "marital", "children_count", "wives_count",
    "location", "religious", "education", "height", "weight", "skin",
    "message_choice", "message_bot", "message_manual", "message_review",
    "hijab", "guardian_phone"
  ];
  const idx = order.indexOf(step);
  return idx < 0 ? 100 : Math.round((idx / (order.length - 1)) * 100);
}
