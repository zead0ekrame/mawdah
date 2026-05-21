import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { generateGeminiResponse } from "@/lib/bot-ai";
import { isEgyptianMobile, normalizePhoneLike } from "@/lib/moderation";

type Gender = "MALE" | "FEMALE";
type SetupStep =
  | "name"
  | "age"
  | "marital"
  | "childrenCount"
  | "wivesCount"
  | "currentGovernorate"
  | "postMarriageGovernorate"
  | "religiousLevel"
  | "educationLevel"
  | "heightCategory"
  | "weightCategory"
  | "skinColor"
  | "messageManual"
  | "hijabType"
  | "guardianPhone"
  | "review";

type SetupDraft = {
  name: string;
  age: string;
  maritalStatus: string;
  childrenCount: string;
  currentWivesCount: string;
  currentGovernorate: string;
  postMarriageGovernorate: string;
  religiousLevel: string;
  educationLevel: string;
  heightCategory: string;
  weightCategory: string;
  skinColor: string;
  personalMessage: string;
  hijabType: string;
  guardianPhone: string;
};

const emptyDraft: SetupDraft = {
  name: "",
  age: "",
  maritalStatus: "",
  childrenCount: "",
  currentWivesCount: "",
  currentGovernorate: "",
  postMarriageGovernorate: "",
  religiousLevel: "",
  educationLevel: "",
  heightCategory: "",
  weightCategory: "",
  skinColor: "",
  personalMessage: "",
  hijabType: "",
  guardianPhone: "",
};

const MARITAL_VALUES = ["SINGLE", "DIVORCED", "WIDOWED", "MARRIED_SEEKING_POLYGAMY"] as const;
const GOV_VALUES = [
  "CAIRO", "GIZA", "ALEXANDRIA", "ASWAN", "ASSIUT", "BENI_SUEF", "PORT_SAID", "DAKAHLIA", "DAMIETTA", "SUEZ",
  "SHARQIA", "GHARBIA", "FAIYUM", "KAFR_EL_SHEIKH", "LUXOR", "MATRUH", "MINYA", "MONUFIA", "NEW_VALLEY",
  "NORTH_SINAI", "QENA", "QALIUBIYA", "RED_SEA", "SOHAG", "SOUTH_SINAI", "ISMAILIA", "BEHEIRA",
] as const;
const EDU_VALUES = ["BELOW_HIGH_SCHOOL", "HIGH_SCHOOL", "UNIVERSITY", "MASTERS", "PHD"] as const;
const SKIN_VALUES = ["WHITE", "WHEAT", "BROWN", "DARK"] as const;
const HIJAB_VALUES = ["NIQAB", "HIJAB", "NONE"] as const;

const STEP_VALUES: SetupStep[] = [
  "name", "age", "marital", "childrenCount", "wivesCount", "currentGovernorate", "postMarriageGovernorate",
  "religiousLevel", "educationLevel", "heightCategory", "weightCategory", "skinColor", "messageManual",
  "hijabType", "guardianPhone", "review",
];

const QUICK_OPTIONS: Partial<Record<SetupStep, string[]>> = {
  marital: ["أعزب / عزباء", "مطلق / مطلقة", "أرمل / أرملة", "متزوج ويطلب التعدد"],
  childrenCount: ["لا يوجد", "1", "2", "3+"],
  wivesCount: ["1", "2", "3"],
  currentGovernorate: ["القاهرة", "الجيزة", "الإسكندرية", "الدقهلية", "الشرقية", "الغربية", "المنوفية", "القليوبية"],
  postMarriageGovernorate: ["نفس المحافظة", "القاهرة", "الجيزة", "الإسكندرية", "الدقهلية", "الشرقية", "الغربية", "المنوفية"],
  religiousLevel: ["متوسط", "ملتزم", "ملتزم جداً", "قليل الالتزام"],
  educationLevel: ["دون ثانوي", "ثانوي", "جامعي", "ماجستير", "دكتوراه"],
  heightCategory: ["155-159 سم", "160-164 سم", "165-169 سم", "170-174 سم", "175-179 سم", "180-184 سم"],
  weightCategory: ["55-59 كجم", "60-64 كجم", "65-69 كجم", "70-74 كجم", "75-79 كجم", "80-84 كجم"],
  skinColor: ["أبيض", "قمحي", "أسمر", "داكن"],
  hijabType: ["منقبة", "محجبة", "غير محجبة"],
  review: ["اعتماد الملف", "تعديل"],
};

function isOneOf<T extends readonly string[]>(values: T, value: unknown): value is T[number] {
  return typeof value === "string" && values.includes(value as T[number]);
}

function cleanText(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function normalizeDigits(value: unknown) {
  return cleanText(value)
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
}

function asRange(value: unknown, min: number, max: number) {
  const text = normalizeDigits(value).replace(/\s/g, "");
  const match = text.match(/^(\d{2,3})-(\d{2,3})/);
  if (!match) return "";
  const start = Number(match[1]);
  const end = Number(match[2]);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < min || end > max || start > end) return "";
  return `${start}-${end}`;
}

function sanitizeDraft(value: unknown, gender: Gender): SetupDraft {
  const input = typeof value === "object" && value ? value as Partial<SetupDraft> : {};
  const age = Number(normalizeDigits(input.age).match(/\d+/)?.[0] ?? "");
  const religiousLevel = Number(normalizeDigits(input.religiousLevel).match(/\d+/)?.[0] ?? "");
  const phone = normalizePhoneLike(input.guardianPhone ?? "");
  const maritalStatus = isOneOf(MARITAL_VALUES, input.maritalStatus)
    && (gender === "MALE" || input.maritalStatus !== "MARRIED_SEEKING_POLYGAMY")
    ? input.maritalStatus
    : "";

  return {
    name: cleanText(input.name, 28),
    age: age >= 18 && age <= 70 ? String(age) : "",
    maritalStatus,
    childrenCount: ["0", "1", "2", "3", "3+"].includes(String(input.childrenCount ?? "")) ? String(input.childrenCount) : "",
    currentWivesCount: ["1", "2", "3"].includes(String(input.currentWivesCount ?? "")) ? String(input.currentWivesCount) : "",
    currentGovernorate: isOneOf(GOV_VALUES, input.currentGovernorate) ? input.currentGovernorate : "",
    postMarriageGovernorate: isOneOf(GOV_VALUES, input.postMarriageGovernorate) ? input.postMarriageGovernorate : "",
    religiousLevel: religiousLevel >= 1 && religiousLevel <= 5 ? String(religiousLevel) : "",
    educationLevel: isOneOf(EDU_VALUES, input.educationLevel) ? input.educationLevel : "",
    heightCategory: asRange(input.heightCategory, 130, 220),
    weightCategory: asRange(input.weightCategory, 35, 180),
    skinColor: isOneOf(SKIN_VALUES, input.skinColor) ? input.skinColor : "",
    personalMessage: cleanText(input.personalMessage, 900),
    hijabType: gender === "FEMALE" && isOneOf(HIJAB_VALUES, input.hijabType) ? input.hijabType : "",
    guardianPhone: gender === "FEMALE" && isEgyptianMobile(phone) ? phone : "",
  };
}

function mergeNonEmptyPatch(base: SetupDraft, patch: unknown) {
  const merged: Record<keyof SetupDraft, string> = { ...base };
  if (!patch || typeof patch !== "object") return merged;
  for (const [key, value] of Object.entries(patch)) {
    if (!(key in merged) || typeof value !== "string") continue;
    const cleaned = value.trim();
    if (cleaned || cleaned === "0") merged[key as keyof SetupDraft] = cleaned;
  }
  return merged;
}

function nextStepFor(draft: SetupDraft, gender: Gender): SetupStep {
  if (!draft.name) return "name";
  if (!draft.age) return "age";
  if (!draft.maritalStatus) return "marital";
  if (["DIVORCED", "WIDOWED"].includes(draft.maritalStatus) && !draft.childrenCount) return "childrenCount";
  if (draft.maritalStatus === "MARRIED_SEEKING_POLYGAMY" && !draft.currentWivesCount) return "wivesCount";
  if (!draft.currentGovernorate) return "currentGovernorate";
  if (!draft.postMarriageGovernorate) return "postMarriageGovernorate";
  if (!draft.religiousLevel) return "religiousLevel";
  if (!draft.educationLevel) return "educationLevel";
  if (!draft.heightCategory) return "heightCategory";
  if (!draft.weightCategory) return "weightCategory";
  if (!draft.skinColor) return "skinColor";
  if (draft.personalMessage.trim().length < 35) return "messageManual";
  if (gender === "FEMALE" && !draft.hijabType) return "hijabType";
  if (gender === "FEMALE" && !draft.guardianPhone) return "guardianPhone";
  return "review";
}

function safeStep(value: unknown, fallback: SetupStep): SetupStep {
  return typeof value === "string" && STEP_VALUES.includes(value as SetupStep) ? value as SetupStep : fallback;
}

function fallbackReply(step: SetupStep, draft: SetupDraft) {
  const name = draft.name ? ` يا ${draft.name}` : "";
  const prompts: Record<SetupStep, string> = {
    name: "أهلاً، أنا أنيس. خلينا نجهز ملفك في شات بسيط وطبيعي. تحب أناديك بإيه؟",
    age: `تشرفت${name}. كام سنة عندك؟`,
    marital: `تمام${name}. حالتك الاجتماعية إيه؟`,
    childrenCount: "هل عندك أبناء؟ اختار العدد أو اكتبه براحتك.",
    wivesCount: "كم زوجة حالية؟",
    currentGovernorate: "ساكن حالياً في أي محافظة؟",
    postMarriageGovernorate: "وتفضل السكن بعد الزواج في أي محافظة؟",
    religiousLevel: "وصفك لمستوى الالتزام الديني الأقرب لك إيه؟",
    educationLevel: "مستوى التعليم إيه؟ ولو تحب اذكر شغلك كمان.",
    heightCategory: "طولك تقريباً كام سم؟",
    weightCategory: "وزنك تقريباً كام كجم؟",
    skinColor: "لون البشرة الأقرب لك إيه؟",
    messageManual: "احكيلي براحتك عن شخصيتك وحياتك اليومية، وإيه أهم حاجة بتدور عليها في الزواج. ينفع تكتب إجابة طويلة.",
    hijabType: "نوع الحجاب إيه؟",
    guardianPhone: "اكتبي رقم ولي الأمر المصري. الرقم لن يظهر إلا بعد توافق كامل.",
    review: `جميل${name}. جمعت بيانات الملف، وهعرضه عليك للمراجعة قبل الاعتماد.`,
  };
  return prompts[step];
}

function extractJson(text: string) {
  const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("Gemini returned non JSON setup payload");
  }
}

function setupPrompt(params: {
  text: string;
  currentStep: SetupStep;
  draft: SetupDraft;
  gender: Gender;
  history: Array<{ role: string; text: string }>;
}) {
  const { text, currentStep, draft, gender, history } = params;
  const isMale = gender === "MALE";
  return `أنت Gemini داخل منصة "أنيس"، ومطلوب منك إدارة شات إعداد الملف الشخصي.
تكلم بلهجة مصرية هادئة ومحترمة، كأنك مساعد ذكي حقيقي. سؤال واحد فقط في الرد.

أرجع JSON فقط بدون markdown:
{
  "reply": "رسالة قصيرة طبيعية للمستخدم. لو فهمت إجابته اشكره بلطف ثم اسأل عن الحقل التالي. لو الإجابة غير صالحة اشرح السبب واسأل نفس السؤال.",
  "patch": {
    "name": "",
    "age": "",
    "maritalStatus": "",
    "childrenCount": "",
    "currentWivesCount": "",
    "currentGovernorate": "",
    "postMarriageGovernorate": "",
    "religiousLevel": "",
    "educationLevel": "",
    "heightCategory": "",
    "weightCategory": "",
    "skinColor": "",
    "personalMessage": "",
    "hijabType": "",
    "guardianPhone": ""
  }
}

القواعد:
- استخرج فقط ما أنت واثق منه من رسالة المستخدم الحالية والسياق، ولا تخترع بيانات.
- لو المستخدم كتب "تقولي زياد" أو "ناديني زياد" فالاسم هو "زياد" فقط.
- افهم الأرقام العربية والمصرية بالكلام: سبعتاشر=17، تمنتاشر/تمانتاشر=18، تلاتة وعشرين=23.
- السن المقبول 18 إلى 70. لو أقل من 18 لا تضع age في patch، ورد بوضوح أن التسجيل متاح من 18 سنة فأكثر.
- الحالة الاجتماعية: ${isMale ? "SINGLE أو DIVORCED أو WIDOWED أو MARRIED_SEEKING_POLYGAMY" : "SINGLE أو DIVORCED أو WIDOWED فقط"}.
- المحافظات يجب أن تكون واحدة من: ${GOV_VALUES.join(", ")}.
- محافظة السكن بعد الزواج مطلوبة، ولو قال "نفس المحافظة" استخدم currentGovernorate الحالي.
- التدين قيمة من 1 إلى 5: غير ملتزم=1، قليل=2، متوسط=3، ملتزم=4، ملتزم جداً=5.
- التعليم: BELOW_HIGH_SCHOOL, HIGH_SCHOOL, UNIVERSITY, MASTERS, PHD.
- الطول والوزن بصيغة نطاق مثل 170-174.
- لون البشرة: WHITE, WHEAT, BROWN, DARK.
- الرسالة الشخصية: عندما يجيب عن شخصيته وأهدافه، اكتبها أنت بصيغة "أنا..." في personalMessage بشكل محترم وجاد، ولا تضع أرقام تواصل.
${isMale ? "- تجاهل hijabType وguardianPhone." : "- للأنثى: hijabType واحد من NIQAB, HIJAB, NONE، ورقم ولي الأمر لازم موبايل مصري يبدأ بـ 01."}
- الحقل الحالي المطلوب غالباً: ${currentStep}.
- البيانات الحالية:
${JSON.stringify(draft)}
- آخر سياق:
${history.map((m) => `${m.role}: ${m.text}`).join("\n").slice(-2500)}
- رسالة المستخدم الحالية:
${text || "(ابدأ المحادثة بتحية واسأل عن الاسم)"}`;
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  try {
    const { action, text, history, draft, step } = await request.json();

    if (action === "setup_turn" || action === "setup_chat") {
      const gender = session.gender as Gender;
      const currentDraft = sanitizeDraft({ ...emptyDraft, ...(draft ?? {}) }, gender);
      const currentStep = safeStep(step, nextStepFor(currentDraft, gender));
      const safeHistory = Array.isArray(history)
        ? history.slice(-12).map((message) => ({
          role: cleanText(message?.role, 16) || "user",
          text: cleanText(message?.text, 500),
        }))
        : [];

      try {
        const raw = await generateGeminiResponse(
          session.userId,
          setupPrompt({ text: cleanText(text, 1000), currentStep, draft: currentDraft, gender, history: safeHistory }),
          "أنت مساعد إعداد ملف شخصي. يجب أن ترد JSON صحيح فقط، بدون شرح خارجي."
        );
        const parsed = extractJson(raw) as { reply?: unknown; patch?: unknown };
        const mergedDraft = sanitizeDraft(mergeNonEmptyPatch(currentDraft, parsed.patch), gender);
        const nextStep = nextStepFor(mergedDraft, gender);
        const reply = cleanText(parsed.reply, 650) || fallbackReply(nextStep, mergedDraft);

        return NextResponse.json({
          reply,
          patch: mergedDraft,
          nextStep,
          done: nextStep === "review",
          options: QUICK_OPTIONS[nextStep] ?? [],
        });
      } catch (error) {
        console.error("[setup_turn Gemini]", error);
        const nextStep = nextStepFor(currentDraft, gender);
        return NextResponse.json({
          reply: fallbackReply(nextStep, currentDraft),
          patch: currentDraft,
          nextStep,
          done: nextStep === "review",
          options: QUICK_OPTIONS[nextStep] ?? [],
        });
      }
    }

    // ─── REVIEW: Check personal message ──────────────────────────────
    if (action === "review") {
      const prompt = `قم بمراجعة هذه النبذة الشخصية لمستخدم في تطبيق زواج إسلامي:
"${text}"

أرجع JSON فقط:
{
  "prohibited": boolean,
  "warning": string | null,
  "reason": string | null
}`;
      try {
        const reviewRes = await generateGeminiResponse(session.userId, prompt, "system");
        const cleaned = reviewRes.replace(/```json/g, "").replace(/```/g, "").trim();
        return NextResponse.json(JSON.parse(cleaned));
      } catch {
        return NextResponse.json({ prohibited: false, warning: null, reason: null });
      }
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[bot-message]", error);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
