const PHONE_PATTERN = /(?:\+?20|0)?1[0125][\s.-]?\d{3}[\s.-]?\d{4}/;
const URL_PATTERN = /(https?:\/\/|www\.|t\.me\/|wa\.me\/|facebook\.com|fb\.com|instagram\.com)/i;
const HANDLE_PATTERN = /(^|\s)@[\w.]{3,}/;
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

const BLOCKED_WORDS = [
  "جنس",
  "سكس",
  "اباح",
  "عاري",
  "عارية",
  "صور خاصة",
];

export function findProfileMessageIssues(message: string): string[] {
  const text = message.trim();
  const issues: string[] = [];

  if (PHONE_PATTERN.test(text)) {
    issues.push("لا تكتب رقم هاتف أو واتساب في الرسالة الشخصية");
  }
  if (URL_PATTERN.test(text) || HANDLE_PATTERN.test(text) || EMAIL_PATTERN.test(text)) {
    issues.push("لا تكتب روابط أو حسابات تواصل قبل التوافق الكامل");
  }
  if (BLOCKED_WORDS.some((word) => text.includes(word))) {
    issues.push("استخدم صياغة محترمة ومناسبة لهدف الزواج الشرعي");
  }

  return issues;
}

export function normalizePhoneLike(value: unknown) {
  if (typeof value !== "string") return "";
  return value.replace(/\D/g, "");
}

export function isEgyptianMobile(phone: string) {
  return /^01[0125]\d{8}$/.test(phone);
}
