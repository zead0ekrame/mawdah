import { prisma } from "./prisma";
import { PreferenceTrait, RatingType } from "@prisma/client";

// ============================================================
// الأوزان الافتراضية — تُستخدم فقط قبل وجود سجل في الـ DB
// ============================================================
const DEFAULT_WEIGHTS = {
  religious: 0.28,
  geographic: 0.22,
  postMarriage: 0.15,
  family: 0.15,
  education: 0.12,
  physical: 0.08,
};

async function getWeights() {
  return prisma.algorithmWeights.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...DEFAULT_WEIGHTS },
    update: {},
  });
}

// ============================================================
// الطبقة 1: الفلاتر الصلبة
// ============================================================
function checkHardFilters(mp: any, fp: any, mPrefs: any[], fPrefs: any[]): boolean {
  const w4Male = mPrefs.filter((p) => p.weight === 4);
  const w4Female = fPrefs.filter((p) => p.weight === 4);

  for (const pref of w4Male) {
    if (!prefMatchesFemale(pref, fp)) return false;
  }
  for (const pref of w4Female) {
    if (!prefMatchesMale(pref, mp)) return false;
  }

  // التعدد
  if (mp.maritalStatus === "MARRIED_SEEKING_POLYGAMY") {
    const accepts = fPrefs.find((p) => p.trait === "ACCEPTS_POLYGAMY");
    if (!accepts || accepts.value === "false") return false;
  }

  return true;
}

// ============================================================
// مطابقة التفضيلات
// ============================================================
function prefMatchesFemale(pref: any, fp: any): boolean {
  switch (pref.trait as PreferenceTrait) {
    case "AGE_MIN": return fp.age >= parseInt(pref.value);
    case "AGE_MAX": return fp.age <= parseInt(pref.value);
    case "RELIGIOUS_LEVEL_MIN": return fp.religiousLevel >= parseInt(pref.value);
    case "ACCEPTS_CHILDREN": return pref.value === "true" || (fp.childrenCount ?? 0) === 0;
    case "ACCEPTS_DIVORCED": return pref.value === "true" || fp.maritalStatus !== "DIVORCED";
    case "ACCEPTS_WIDOWED": return pref.value === "true" || fp.maritalStatus !== "WIDOWED";
    case "HIJAB_TYPE_PREFERENCE": return fp.hijabType === pref.value;
    case "CURRENT_GOVERNORATE": return fp.currentGovernorate === pref.value;
    case "POST_MARRIAGE_GOVERNORATE": return fp.currentGovernorate === pref.value;
    case "HEIGHT_MIN": return parseInt(fp.heightCategory?.split("-")[0] ?? "0") >= parseInt(pref.value);
    case "WEIGHT_MIN": return parseInt(fp.weightCategory?.split("-")[0] ?? "0") >= parseInt(pref.value);
    case "WEIGHT_MAX": return parseInt(fp.weightCategory?.split("-")[1] ?? "999") <= parseInt(pref.value);
    case "SKIN_COLOR": return fp.skinColor === pref.value;
    default: return true;
  }
}

function prefMatchesMale(pref: any, mp: any): boolean {
  switch (pref.trait as PreferenceTrait) {
    case "AGE_MIN": return mp.age >= parseInt(pref.value);
    case "AGE_MAX": return mp.age <= parseInt(pref.value);
    case "RELIGIOUS_LEVEL_MIN": return mp.religiousLevel >= parseInt(pref.value);
    case "ACCEPTS_CHILDREN": return pref.value === "true" || (mp.childrenCount ?? 0) === 0;
    case "ACCEPTS_DIVORCED": return pref.value === "true" || mp.maritalStatus !== "DIVORCED";
    case "ACCEPTS_WIDOWED": return pref.value === "true" || mp.maritalStatus !== "WIDOWED";
    case "CURRENT_GOVERNORATE": return mp.currentGovernorate === pref.value;
    case "POST_MARRIAGE_GOVERNORATE": return mp.currentGovernorate === pref.value;
    case "HEIGHT_MIN": return parseInt(mp.heightCategory?.split("-")[0] ?? "0") >= parseInt(pref.value);
    case "WEIGHT_MIN": return parseInt(mp.weightCategory?.split("-")[0] ?? "0") >= parseInt(pref.value);
    case "WEIGHT_MAX": return parseInt(mp.weightCategory?.split("-")[1] ?? "999") <= parseInt(pref.value);
    case "SKIN_COLOR": return mp.skinColor === pref.value;
    default: return true;
  }
}

// ============================================================
// الطبقة 2: حساب أبعاد التوافق
// ============================================================
function calcReligious(mp: any, fp: any): number {
  const diff = Math.abs(mp.religiousLevel - fp.religiousLevel);
  return Math.max(0, 1 - diff * 0.25);
}

function calcGeo(mp: any, fp: any): number {
  return mp.currentGovernorate === fp.currentGovernorate ? 1 : 0.3;
}

// توافق توقعات ما بعد الزواج — جديد
function calcPostMarriage(mp: any, fp: any): number {
  if (mp.currentGovernorate === fp.currentGovernorate) return 1.0;
  // محافظات متجاورة → نقطة جزئية
  const adjacent: Record<string, string[]> = {
    CAIRO: ["GIZA", "QALIUBIYA"],
    GIZA: ["CAIRO", "FAIYUM", "BENI_SUEF"],
    ALEXANDRIA: ["BEHEIRA", "MATRUH"],
    QALIUBIYA: ["CAIRO", "SHARQIA", "GHARBIA"],
    SHARQIA: ["QALIUBIYA", "DAKAHLIA", "ISMAILIA"],
    GHARBIA: ["MONUFIA", "DAKAHLIA", "KAFR_EL_SHEIKH"],
  };
  const mAdj = adjacent[mp.currentGovernorate] ?? [];
  if (mAdj.includes(fp.currentGovernorate)) return 0.6;
  return 0.1;
}

function calcFamily(mp: any, fp: any): number {
  let score = 0.5;
  // كلاهما أعزب → أعلى توافق
  if (mp.maritalStatus === "SINGLE" && fp.maritalStatus === "SINGLE") score = 1.0;
  // كلاهما مطلق/أرمل → توافق جيد
  else if (
    ["DIVORCED", "WIDOWED"].includes(mp.maritalStatus) &&
    ["DIVORCED", "WIDOWED"].includes(fp.maritalStatus)
  ) score = 0.85;
  // مزيج → متوسط
  else if (mp.maritalStatus === "SINGLE" || fp.maritalStatus === "SINGLE") score = 0.6;

  // خصم لو في أولاد وكلاهما ليس مستعداً لذلك (بيتعالج في Hard Filters بس نضيف وزن إضافي)
  if ((mp.childrenCount ?? 0) > 2 || (fp.childrenCount ?? 0) > 2) score -= 0.1;

  return Math.max(0, Math.min(1, score));
}

function calcEducation(mp: any, fp: any): number {
  const levels = ["BELOW_HIGH_SCHOOL", "HIGH_SCHOOL", "UNIVERSITY", "MASTERS", "PHD"];
  const diff = Math.abs(levels.indexOf(mp.educationLevel) - levels.indexOf(fp.educationLevel));
  return Math.max(0, 1 - diff * 0.25);
}

function calcPhysical(mp: any, fp: any, mPrefs: any[]): number {
  let score = 0.5;

  // لون البشرة
  if (mp.skinColor === fp.skinColor) score += 0.2;

  // الطول (الذكر يفضّل الأنثى بطول معين — تفضيل شائع)
  const skinPref = mPrefs.find((p) => p.trait === "SKIN_COLOR");
  if (!skinPref || skinPref.value === fp.skinColor) score += 0.15;

  // الوزن — هل ضمن نطاق معقول؟
  const fWeightMin = parseInt(fp.weightCategory?.split("-")[0] ?? "0");
  if (fWeightMin >= 45 && fWeightMin <= 90) score += 0.15; // نطاق متوسط مقبول

  return Math.min(1, score);
}

// ============================================================
// الطبقة 3: تطبيق أوزان التفضيلات 1-3
// ============================================================
function applyPreferenceWeights(
  baseScore: number,
  mp: any,
  fp: any,
  mPrefs: any[],
  fPrefs: any[]
): number {
  let score = baseScore;
  const penaltyMap: Record<number, number> = { 3: 0.15, 2: 0.08, 1: 0.03 };

  for (const pref of mPrefs.filter((p) => p.weight < 4)) {
    if (!prefMatchesFemale(pref, fp)) score -= penaltyMap[pref.weight] || 0;
  }
  for (const pref of fPrefs.filter((p) => p.weight < 4)) {
    if (!prefMatchesMale(pref, mp)) score -= penaltyMap[pref.weight] || 0;
  }

  return score;
}

// ============================================================
// الطبقة 4: التعلم من القرارات (Decision-Based Learning)
// يحسب معامل تعديل الـ Score بناءً على سجل رفض الأنثى
// ============================================================
async function getDecisionLearningMultiplier(
  maleId: string,
  femaleId: string
): Promise<number> {
  // جلب آخر 15 رفض من الأنثى
  const femaleRejections = await prisma.match.findMany({
    where: { femaleId, femaleDecision: "REJECTED" },
    include: { male: { include: { profile: true } } },
    orderBy: { femaleDecidedAt: "desc" },
    take: 15,
  });

  if (femaleRejections.length < 3) return 1.0; // بيانات غير كافية → محايد

  const candidate = await prisma.user.findUnique({
    where: { id: maleId },
    include: { profile: true },
  });
  if (!candidate?.profile) return 1.0;

  let penaltyCount = 0;
  const cp = candidate.profile;

  for (const rejection of femaleRejections) {
    const rp = rejection.male?.profile;
    if (!rp) continue;

    let similarityCount = 0;
    if (rp.maritalStatus === cp.maritalStatus) similarityCount++;
    if (Math.abs(rp.age - cp.age) <= 3) similarityCount++;
    if (rp.educationLevel === cp.educationLevel) similarityCount++;
    if (rp.religiousLevel === cp.religiousLevel) similarityCount++;
    if (rp.currentGovernorate === cp.currentGovernorate) similarityCount++;

    // إذا كان 3 سمات أو أكثر مشتركة → يُحسب تشابهاً
    if (similarityCount >= 3) penaltyCount++;
  }

  // كلما زاد عدد الملفات المشابهة المرفوضة، قلّت الفرصة
  if (penaltyCount >= 5) return 0.3;
  if (penaltyCount >= 3) return 0.55;
  if (penaltyCount >= 2) return 0.75;
  return 1.0;
}

// ============================================================
// الطبقة 5: Collaborative Filtering (داخلي — لا يُعرض للمستخدمين)
// "أناث مشبهة لهذه الأنثى وافقوا على هذا النوع من الملفات؟"
// ============================================================
async function getCollaborativeScore(maleId: string, femaleId: string): Promise<number> {
  const female = await prisma.user.findUnique({
    where: { id: femaleId },
    include: { profile: true },
  });
  if (!female?.profile) return 0;

  const fp = female.profile;

  // البحث عن أناث مشبهة (نفس العمر ±3، نفس المحافظة، نفس مستوى الالتزام ±1)
  const similarFemales = await prisma.profile.findMany({
    where: {
      userId: { not: femaleId },
      age: { gte: fp.age - 3, lte: fp.age + 3 },
      currentGovernorate: fp.currentGovernorate,
      religiousLevel: { gte: fp.religiousLevel - 1, lte: fp.religiousLevel + 1 },
    },
    select: { userId: true },
    take: 30,
  });

  if (similarFemales.length < 5) return 0; // عينة غير كافية

  const similarFemaleIds = similarFemales.map((f) => f.userId);

  // هل الأناث المشبهة وافقوا على هذا الذكر أو ملفات مشابهة له؟
  const approvals = await prisma.match.count({
    where: {
      femaleId: { in: similarFemaleIds },
      maleId,
      femaleDecision: "APPROVED",
    },
  });

  const rejections = await prisma.match.count({
    where: {
      femaleId: { in: similarFemaleIds },
      maleId,
      femaleDecision: "REJECTED",
    },
  });

  const total = approvals + rejections;
  if (total < 3) return 0; // بيانات غير كافية

  // نسبة القبول → نقاط إضافية أو خصم
  const approvalRate = approvals / total;
  if (approvalRate >= 0.7) return 15; // إقبال عالي
  if (approvalRate >= 0.5) return 7;
  if (approvalRate <= 0.2) return -10; // رفض عالي
  return 0;
}

// ============================================================
// الطبقة 6: عوامل الظهور والسمعة
// ============================================================
async function getVisibilityBoost(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      matchesAsMale: {
        where: { status: { in: ["FULLY_MATCHED", "UNDER_FOLLOWUP"] } },
      },
    },
  });

  if (!user?.profile) return 0;

  let boost = 0;

  if (user.profile.completenessScore >= 100) boost += 20;

  const hoursActive = (Date.now() - user.lastActiveAt.getTime()) / 3600000;
  if (hoursActive <= 48) boost += 10;

  const daysSinceCreated = (Date.now() - user.createdAt.getTime()) / 86400000;
  if (daysSinceCreated <= 7) boost += 10; // cold start

  if (user.reputationScore >= 120) boost += 5;
  if (user.profile.completenessScore < 50) boost -= 15;
  if (hoursActive > 24 * 30) boost -= 10;

  // خفض الظهور لو عنده توافقات معلقة كتير
  const pending = user.matchesAsMale.length;
  if (pending === 2) boost -= 30;
  else if (pending === 3) boost -= 60;
  else if (pending >= 4) boost -= 100;

  return boost;
}

// ============================================================
// Pacing: نظام الحزمة اليومية الديناميكية
// الحد الافتراضي: 5 عروض في اليوم
// يزيد أو ينقص حسب: نشاط المستخدم + سمعتها + مرحلة التسجيل
// ============================================================
async function getDailyBatchLimit(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });

  let limit = 5;
  if (!user) return limit;

  const daysSince = (Date.now() - user.createdAt.getTime()) / 86400000;
  if (daysSince <= 7) limit += 2;
  if (user.reputationScore >= 130) limit += 1;
  if (user.profile?.completenessScore === 100) limit += 1;

  // خفض العروض لو كثرت قرارات الرفض في 3 أيام
  const recentRejections = await prisma.match.count({
    where: {
      OR: [
        { femaleId: userId, femaleDecision: "REJECTED", femaleDecidedAt: { gte: new Date(Date.now() - 3 * 86400000) } },
        { maleId: userId, maleDecision: "REJECTED", maleDecidedAt: { gte: new Date(Date.now() - 3 * 86400000) } },
      ],
    },
  });
  if (recentRejections >= 10) limit = Math.max(2, limit - 2);
  else if (recentRejections >= 5) limit = Math.max(3, limit - 1);

  return limit;
}

async function isReadyForNewMatch(userId: string): Promise<boolean> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

  // 1. الحد الأقصى للمحادثات النشطة المتزامنة (لحث المستخدم على التركيز والجدية)
  const MAX_ACTIVE_CHATS = 2; 
  const activeChats = await prisma.match.count({
    where: {
      OR: [
        { maleId: userId, status: "CHAT_PHASE" },
        { femaleId: userId, status: "CHAT_PHASE" }
      ]
    }
  });
  if (activeChats >= MAX_ACTIVE_CHATS) return false;

  // 2. الحد الأقصى للموافقات النشطة المعلقة (PENDING_FEMALE للذكر، PENDING_MALE للأنثى)
  // يمنع تجميع الموافقات الصامتة دون ردود فعل حقيقية (تمت زيادته إلى 5 لمنح الفتيات فرصة للتفكير دون تعطيل الشباب)
  const MAX_ACTIVE_APPROVALS = 5;
  const activePendingApprovals = await prisma.match.count({
    where: {
      OR: [
        { femaleId: userId, femaleDecision: "APPROVED", status: "PENDING_MALE" },
        { maleId: userId, maleDecision: "APPROVED", status: "PENDING_FEMALE" }
      ]
    }
  });
  if (activePendingApprovals >= MAX_ACTIVE_APPROVALS) return false;

  // 3. الحد الأقصى لعدد التوافقات المكتملة وكشف الأرقام أسبوعياً (التوافقات المبدئية والخطوبة الشرعية)
  // إذا حصل المستخدم على كشف أرقام مرتين هذا الأسبوع، يتوقف ظهور ملفات جديدة ليركز على التواصل الهاتفي مع الولي وعقد اللقاءات
  const MAX_WEEKLY_REVEALS = 2;
  const revealsThisWeek = await prisma.match.count({
    where: {
      OR: [
        { maleId: userId },
        { femaleId: userId }
      ],
      status: { in: ["FULLY_MATCHED", "UNDER_FOLLOWUP"] },
      contactsRevealedAt: { gte: sevenDaysAgo }
    }
  });
  if (revealsThisWeek >= MAX_WEEKLY_REVEALS) return false;

  // 4. الحد الأسبوعي للمحادثات الجديدة (لتفادي محادثات التسلية السريعة)
  const WEEKLY_CHATS_LIMIT = 5;
  const chatsThisWeek = await prisma.match.count({
    where: {
      OR: [
        { maleId: userId, status: { in: ["CHAT_PHASE", "FULLY_MATCHED", "UNDER_FOLLOWUP"] } },
        { femaleId: userId, status: { in: ["CHAT_PHASE", "FULLY_MATCHED", "UNDER_FOLLOWUP"] } }
      ],
      updatedAt: { gte: sevenDaysAgo }
    }
  });
  if (chatsThisWeek >= WEEKLY_CHATS_LIMIT) return false;

  // 5. الحد الأسبوعي الأقصى للملفات المعروضة الكلي
  const WEEKLY_SHOW_LIMIT = 25;
  const shownThisWeek = await prisma.match.count({
    where: {
      OR: [
        { femaleId: userId, createdAt: { gte: sevenDaysAgo } },
        { maleId: userId, createdAt: { gte: sevenDaysAgo } }
      ]
    }
  });
  if (shownThisWeek >= WEEKLY_SHOW_LIMIT) return false;

  // 6. الحد اليومي للملفات المعروضة (نظام الحزمة اليومية الديناميكية)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const shownToday = await prisma.match.count({
    where: {
      OR: [
        { femaleId: userId, createdAt: { gte: today } },
        { maleId: userId, createdAt: { gte: today } }
      ]
    }
  });
  const dailyLimit = await getDailyBatchLimit(userId);

  return shownToday < dailyLimit;
}

// ============================================================
// الظهور الاستثنائي الثاني
// شروطه: مضى 30 يوم + لم يُتخذ قرار + درجة التوافق > 80
// ============================================================
async function shouldAllowSecondAppearance(
  existingMatch: any,
  compatibilityScore: number
): Promise<boolean> {
  if (!existingMatch) return false;
  if (existingMatch.appearanceCount >= 2) return false; // الحد الأقصى مرتين
  if (existingMatch.femaleDecision === "REJECTED") return false; // رفضت → لا تعود
  if (existingMatch.femaleDecision === "APPROVED") return false; // وافقت → لا حاجة

  const daysSinceFirst =
    (Date.now() - existingMatch.createdAt.getTime()) / 86400000;

  return daysSinceFirst >= 30 && compatibilityScore >= 80;
}

// ============================================================
// حساب العروض المتزامنة النشطة للطرف الآخر
// لا يحسب العروض للغائبين (>24 ساعة) أو غير النشطين لضمان العدالة
// ============================================================
async function getActiveExposuresCount(userId: string): Promise<number> {
  const activeThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const matches = await prisma.match.findMany({
    where: {
      OR: [
        {
          maleId: userId,
          maleDecision: null,
          createdAt: { gte: activeThreshold },
        },
        {
          femaleId: userId,
          femaleDecision: null,
          createdAt: { gte: activeThreshold },
        },
        { maleId: userId, femaleDecision: "APPROVED", maleDecision: null },
        { femaleId: userId, maleDecision: "APPROVED", femaleDecision: null }
      ]
    },
    include: {
      male: { select: { status: true, lastActiveAt: true } },
      female: { select: { status: true, lastActiveAt: true } }
    }
  });

  let activeExposures = 0;
  for (const m of matches) {
    const isMaleCandidate = m.maleId === userId;
    const otherUser = isMaleCandidate ? m.female : m.male;

    if (
      otherUser &&
      otherUser.status === "ACTIVE" &&
      otherUser.lastActiveAt.getTime() >= activeThreshold.getTime()
    ) {
      activeExposures++;
    }
  }

  return activeExposures;
}

// ============================================================
// حساب التوافق الكامل (تجمع كل الطبقات)
// ============================================================
export function calculateCompatibilityInMemory(
  male: any,
  female: any,
  W: any
): number {
  if (!male?.profile || !female?.profile) return 0;

  const mp = male.profile;
  const fp = female.profile;
  const mPrefs = male.preferences || [];
  const fPrefs = female.preferences || [];

  // الطبقة 1
  if (!checkHardFilters(mp, fp, mPrefs, fPrefs)) return 0;

  // الطبقة 2 — تستخدم الأوزان الديناميكية
  const raw =
    calcReligious(mp, fp) * W.religious +
    calcGeo(mp, fp) * W.geographic +
    calcPostMarriage(mp, fp) * W.postMarriage +
    calcFamily(mp, fp) * W.family +
    calcEducation(mp, fp) * W.education +
    calcPhysical(mp, fp, mPrefs) * W.physical;

  // الطبقة 3
  const withPrefs = applyPreferenceWeights(raw, mp, fp, mPrefs, fPrefs);

  return Math.max(0, Math.min(100, withPrefs * 100));
}

// حساب التوافق الكامل (تجمع كل الطبقات)
export async function calculateCompatibility(
  maleId: string,
  femaleId: string
): Promise<number> {
  const [male, female, W] = await Promise.all([
    prisma.user.findUnique({
      where: { id: maleId },
      include: { profile: true, preferences: true },
    }),
    prisma.user.findUnique({
      where: { id: femaleId },
      include: { profile: true, preferences: true },
    }),
    getWeights(), // الأوزان الحالية من الـ DB
  ]);

  if (!male || !female) return 0;
  return calculateCompatibilityInMemory(male, female, W);
}

function getDecisionLearningMultiplierInMemory(
  candidate: any,
  femaleRejections: any[]
): number {
  if (femaleRejections.length < 3) return 1.0; // بيانات غير كافية → محايد

  if (!candidate?.profile) return 1.0;

  let penaltyCount = 0;
  const cp = candidate.profile;

  for (const rejection of femaleRejections) {
    const rp = rejection.male?.profile;
    if (!rp) continue;

    let similarityCount = 0;
    if (rp.maritalStatus === cp.maritalStatus) similarityCount++;
    if (Math.abs(rp.age - cp.age) <= 3) similarityCount++;
    if (rp.educationLevel === cp.educationLevel) similarityCount++;
    if (rp.religiousLevel === cp.religiousLevel) similarityCount++;
    if (rp.currentGovernorate === cp.currentGovernorate) similarityCount++;

    // إذا كان 3 سمات أو أكثر مشتركة → يُحسب تشابهاً
    if (similarityCount >= 3) penaltyCount++;
  }

  // كلما زاد عدد الملفات المشابهة المرفوضة، قلّت الفرصة
  if (penaltyCount >= 5) return 0.3;
  if (penaltyCount >= 3) return 0.55;
  if (penaltyCount >= 2) return 0.75;
  return 1.0;
}

function getCollaborativeScoreInMemory(
  maleId: string,
  collabMap: Record<string, { approvals: number, rejections: number }>
): number {
  const stats = collabMap[maleId];
  if (!stats) return 0;

  const total = stats.approvals + stats.rejections;
  if (total < 3) return 0; // بيانات غير كافية

  const approvalRate = stats.approvals / total;
  if (approvalRate >= 0.7) return 15; // إقبال عالي
  if (approvalRate >= 0.5) return 7;
  if (approvalRate <= 0.2) return -10; // رفض عالي
  return 0;
}

function getVisibilityBoostInMemory(user: any): number {
  if (!user?.profile) return 0;

  let boost = 0;

  if (user.profile.completenessScore >= 100) boost += 20;

  const hoursActive = (Date.now() - user.lastActiveAt.getTime()) / 3600000;
  if (hoursActive <= 48) boost += 10;

  const daysSinceCreated = (Date.now() - user.createdAt.getTime()) / 86400000;
  if (daysSinceCreated <= 7) boost += 10; // cold start

  if (user.reputationScore >= 120) boost += 5;
  if (user.profile.completenessScore < 50) boost -= 15;
  if (hoursActive > 24 * 30) boost -= 10;

  // خفض الظهور لو عنده توافقات معلقة كتير
  const pending = user.matchesAsMale?.length ?? 0;
  if (pending === 2) boost -= 30;
  else if (pending === 3) boost -= 60;
  else if (pending >= 4) boost -= 100;

  return boost;
}

function getVisibilityBoostForFemaleInMemory(user: any): number {
  if (!user?.profile) return 0;

  let boost = 0;

  if (user.profile.completenessScore >= 100) boost += 20;

  const hoursActive = (Date.now() - user.lastActiveAt.getTime()) / 3600000;
  if (hoursActive <= 48) boost += 10;

  const daysSinceCreated = (Date.now() - user.createdAt.getTime()) / 86400000;
  if (daysSinceCreated <= 7) boost += 10; // cold start

  if (user.reputationScore >= 120) boost += 5;
  if (user.profile.completenessScore < 50) boost -= 15;
  if (hoursActive > 24 * 30) boost -= 10;

  // خفض الظهور لو عندها توافقات معلقة كتير
  const pending = user.matchesAsFemale?.length ?? 0;
  if (pending === 2) boost -= 30;
  else if (pending === 3) boost -= 60;
  else if (pending >= 4) boost -= 100;

  return boost;
}

// ============================================================
// الدالة الرئيسية: اختيار أفضل ملف للأنثى
// ============================================================
export async function getNextMatchForFemale(
  femaleId: string
): Promise<string | null> {
  // Pacing: هل آن الأوان لعرض جديد؟
  if (!(await isReadyForNewMatch(femaleId))) return null;

  // تحديث وقت نشاط الأنثى الحالية لتنشيط حسابها فوراً بمجرد طلب الاقتراح
  await prisma.user.update({
    where: { id: femaleId },
    data: { lastActiveAt: new Date() }
  });

  const female = await prisma.user.findUnique({
    where: { id: femaleId },
    include: { profile: true, preferences: true },
  });

  if (!female?.profile) return null;

  // الملفات اللي ظهرت مرتين → مستبعدة نهائياً
  const maxAppearanceReached = await prisma.match.findMany({
    where: { femaleId, appearanceCount: { gte: 2 } },
    select: { maleId: true },
  });
  const fullyExcluded = maxAppearanceReached.map((m) => m.maleId);

  // جميع الذكور النشطين المؤهلين (حظر صارم لمن غابوا لأكثر من 24 ساعة)
  const activeThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const candidates = await prisma.user.findMany({
    where: {
      id: { notIn: [femaleId, ...fullyExcluded] },
      gender: "MALE",
      isVerified: true,
      status: "ACTIVE",
      lastActiveAt: { gte: activeThreshold }
    },
    include: {
      profile: true,
      preferences: true,
      matchesAsMale: {
        where: { status: { in: ["FULLY_MATCHED", "UNDER_FOLLOWUP"] } }
      }
    },
  });

  if (candidates.length === 0) return null;

  // فلترة الذكور المستثنين بسبب بلوغ حدود الموافقات، الشات أو التوافقات الأسبوعية
  const eligibleCandidates: any[] = [];
  for (const candidate of candidates) {
    if (await isReadyForNewMatch(candidate.id)) {
      eligibleCandidates.push(candidate);
    }
  }

  if (eligibleCandidates.length === 0) return null;

  // استعلام مسبق لأوزان الخوارزمية
  const W = await getWeights();

  // جلب آخر 15 رفض من الأنثى مرة واحدة فقط
  const femaleRejections = await prisma.match.findMany({
    where: { femaleId, femaleDecision: "REJECTED" },
    include: { male: { include: { profile: true } } },
    orderBy: { femaleDecidedAt: "desc" },
    take: 15,
  });

  // جلب الأناث المشابهة مرة واحدة فقط
  const fp = female.profile;
  const similarFemales = await prisma.profile.findMany({
    where: {
      userId: { not: femaleId },
      age: { gte: fp.age - 3, lte: fp.age + 3 },
      currentGovernorate: fp.currentGovernorate,
      religiousLevel: { gte: fp.religiousLevel - 1, lte: fp.religiousLevel + 1 },
    },
    select: { userId: true },
    take: 30,
  });
  const similarFemaleIds = similarFemales.map((f) => f.userId);

  // جلب التوافقات التعاونية لجميع المرشحين بطلب واحد
  const candidateIds = eligibleCandidates.map(c => c.id);
  const collabMap: Record<string, { approvals: number, rejections: number }> = {};
  if (similarFemaleIds.length >= 5 && candidateIds.length > 0) {
    const collaborativeMatches = await prisma.match.findMany({
      where: {
        femaleId: { in: similarFemaleIds },
        maleId: { in: candidateIds },
        femaleDecision: { in: ["APPROVED", "REJECTED"] }
      },
      select: {
        maleId: true,
        femaleDecision: true
      }
    });

    for (const match of collaborativeMatches) {
      if (!collabMap[match.maleId]) {
        collabMap[match.maleId] = { approvals: 0, rejections: 0 };
      }
      if (match.femaleDecision === "APPROVED") {
        collabMap[match.maleId].approvals++;
      } else if (match.femaleDecision === "REJECTED") {
        collabMap[match.maleId].rejections++;
      }
    }
  }

  // جلب التوافقات الحالية للأنثى مع المرشحين
  const existingMatches = await prisma.match.findMany({
    where: {
      femaleId,
      maleId: { in: candidateIds }
    }
  });
  const existingMatchesMap = new Map<string, any>();
  for (const match of existingMatches) {
    existingMatchesMap.set(match.maleId, match);
  }

  const scored: { id: string; score: number; isSecondChance: boolean }[] = [];

  for (const candidate of eligibleCandidates) {
    if (!candidate.profile) continue;

    const baseScore = calculateCompatibilityInMemory(candidate, female, W);
    if (baseScore <= 0) continue;

    // الطبقة 4: التعلم من القرارات
    const learningMultiplier = getDecisionLearningMultiplierInMemory(
      candidate,
      femaleRejections
    );
    const learnedScore = baseScore * learningMultiplier;

    // الطبقة 5: Collaborative Filtering
    const collabBonus = getCollaborativeScoreInMemory(candidate.id, collabMap);

    // الطبقة 6: عوامل الظهور
    const boost = getVisibilityBoostInMemory(candidate);

    let mutualMatchBoost = 0;
    let isSecondChance = false;

    // هل ظهر من قبل؟
    const existingMatch = existingMatchesMap.get(candidate.id);

    if (existingMatch) {
      // إذا كانت الأنثى قد اتخذت قراراً سابقاً بالقبول أو الرفض
      if (existingMatch.femaleDecision !== null) {
        // فرصة ثانية استثنائية؟
        if (await shouldAllowSecondAppearance(existingMatch, baseScore)) {
          isSecondChance = true;
        } else {
          continue; // يُتجاهل بالكامل
        }
      } else {
        // الأنثى لم تتخذ قرارها بعد (حساب توافق معلق من الذكر) → نعرضه فوراً!
        // وإذا كان الذكر قد أبدى موافقة مسبقة فعلياً، نمنح الملف دفعة إضافية كبرى (+100) لإتمام التوافق المتبادل
        if (existingMatch.maleDecision === "APPROVED") {
          mutualMatchBoost = 100;
        }
      }
    }

    const exposures = await getActiveExposuresCount(candidate.id);
    let exposurePenalty = 0;
    if (exposures === 2) exposurePenalty = 15;
    else if (exposures === 3) exposurePenalty = 30;
    else if (exposures >= 4) exposurePenalty = 50;

    const finalScore = learnedScore + collabBonus + boost + mutualMatchBoost - exposurePenalty;

    scored.push({ id: candidate.id, score: finalScore, isSecondChance });
  }

  if (scored.length === 0) return null;

  // ترتيب حسب الدرجة
  scored.sort((a, b) => b.score - a.score);

  // Diversity injection: كل 5 عروض، 1 ملف من المرتبة 4-7
  const totalShown = await prisma.match.count({ where: { femaleId } });
  if (totalShown > 0 && totalShown % 5 === 0 && scored.length >= 4) {
    const maxDiverseIdx = Math.min(6, scored.length - 1);
    const diverseIndex = 3 + Math.floor(Math.random() * (maxDiverseIdx - 3));
    return scored[diverseIndex].id;
  }

  return scored[0].id;
}

// ============================================================
// الدالة المقابلة للذكر: يتصفح ملفات الإناث بشكل مستقل
// ============================================================
export async function getNextMatchForMale(
  maleId: string
): Promise<string | null> {
  // Pacing
  if (!(await isReadyForNewMatch(maleId))) return null;

  // تحديث وقت نشاط الذكر الحالي لتنشيط حسابه فوراً بمجرد طلب الاقتراح
  await prisma.user.update({
    where: { id: maleId },
    data: { lastActiveAt: new Date() }
  });

  const male = await prisma.user.findUnique({
    where: { id: maleId },
    include: { profile: true, preferences: true },
  });
  if (!male?.profile) return null;

  // الإناث اللي ظهرن مرتين → مستبعدات نهائياً
  const maxReached = await prisma.match.findMany({
    where: { maleId, appearanceCount: { gte: 2 } },
    select: { femaleId: true },
  });
  const fullyExcluded = maxReached.map((m) => m.femaleId);

  // جميع الإناث النشطات المؤهلات (حظر صارم لمن غابوا لأكثر من 24 ساعة)
  const activeThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const candidates = await prisma.user.findMany({
    where: {
      id: { notIn: [maleId, ...fullyExcluded] },
      gender: "FEMALE",
      isVerified: true,
      status: "ACTIVE",
      lastActiveAt: { gte: activeThreshold }
    },
    include: {
      profile: true,
      preferences: true,
      matchesAsFemale: {
        where: { status: { in: ["FULLY_MATCHED", "UNDER_FOLLOWUP"] } }
      }
    },
  });

  if (candidates.length === 0) return null;

  // فلترة الإناث المستثنيات بسبب بلوغ حدود الموافقات، الشات أو التوافقات الأسبوعية
  const eligibleCandidates: any[] = [];
  for (const candidate of candidates) {
    if (await isReadyForNewMatch(candidate.id)) {
      eligibleCandidates.push(candidate);
    }
  }

  if (eligibleCandidates.length === 0) return null;

  const scored: { id: string; score: number }[] = [];
  const W = await getWeights();

  // جلب التوافقات الحالية للذكر مع المرشحات بطلب واحد
  const candidateIds = eligibleCandidates.map((c: any) => c.id);
  const existingMatches = await prisma.match.findMany({
    where: {
      maleId,
      femaleId: { in: candidateIds }
    }
  });
  const existingMatchesMap = new Map<string, any>();
  for (const match of existingMatches) {
    existingMatchesMap.set(match.femaleId, match);
  }

  for (const candidate of eligibleCandidates) {
    if (!candidate.profile) continue;

    // هل ظهرت من قبل؟
    const existingMatch = existingMatchesMap.get(candidate.id);
    let mutualMatchBoost = 0;

    if (existingMatch) {
      // إذا كان الذكر قد اتخذ قراراً سابقاً بالقبول أو الرفض
      if (existingMatch.maleDecision !== null) {
        // فرصة ثانية استثنائية؟
        if (await shouldAllowSecondAppearance(existingMatch, calculateCompatibilityInMemory(male, candidate, W))) {
          // يسمح بالمرور بخصم طفيف
        } else {
          continue; // يُتجاهل بالكامل
        }
      } else {
        // الذكر لم يتخذ قراره بعد (حساب توافق معلق من الأنثى) → نعرضه فوراً!
        // وإذا كانت الأنثى قد أبدت موافقة مسبقة فعلياً، نمنح الملف دفعة إضافية كبرى (+100) لإتمام التوافق المتبادل
        if (existingMatch.femaleDecision === "APPROVED") {
          mutualMatchBoost = 100;
        }
      }
    }

    // الذكر هو maleId، الأنثى هي candidate
    const baseScore = calculateCompatibilityInMemory(male, candidate, W);
    if (baseScore <= 0) continue;

    const boost = getVisibilityBoostForFemaleInMemory(candidate);

    const exposures = await getActiveExposuresCount(candidate.id);
    let exposurePenalty = 0;
    if (exposures === 2) exposurePenalty = 15;
    else if (exposures === 3) exposurePenalty = 30;
    else if (exposures >= 4) exposurePenalty = 50;

    scored.push({
      id: candidate.id,
      score: baseScore + boost + mutualMatchBoost - exposurePenalty
    });
  }

  if (scored.length === 0) return null;

  scored.sort((a, b) => b.score - a.score);

  // Diversity injection
  const totalShown = await prisma.match.count({ where: { maleId } });
  if (totalShown > 0 && totalShown % 5 === 0 && scored.length >= 4) {
    const maxDiverseIdx = Math.min(6, scored.length - 1);
    const diverseIndex = 3 + Math.floor(Math.random() * (maxDiverseIdx - 3));
    return scored[diverseIndex].id;
  }

  return scored[0].id;
}


// ============================================================
// تسجيل الظهور في قاعدة البيانات (يُستدعى بعد عرض الملف)
// ============================================================
export async function recordMatchAppearance(
  maleId: string,
  femaleId: string,
  compatibilityScore: number
): Promise<void> {
  const existing = await prisma.match.findUnique({
    where: { maleId_femaleId: { maleId, femaleId } },
  });

  if (existing) {
    // ظهور ثانٍ استثنائي
    await prisma.match.update({
      where: { id: existing.id },
      data: {
        appearanceCount: { increment: 1 },
        status: "PENDING_FEMALE",
        femaleDecision: null,
        femaleDecidedAt: null,
      },
    });
  } else {
    await prisma.match.create({
      data: {
        maleId,
        femaleId,
        compatibilityScore,
        appearanceCount: 1,
      },
    });
  }
}

// ============================================================
// التدريب الذاتي للأوزان (Self-Training)
// يُشغَّل تلقائياً كل 50 قرار
// ============================================================
export async function trainWeightsIfReady(): Promise<void> {
  const W = await getWeights();

  // شرط الحد الأدنى: 50 قرار جديد منذ آخر تدريب
  const newDecisions = await prisma.match.count({
    where: {
      femaleDecision: { not: null },
      femaleDecidedAt: { gt: W.lastTrainedAt },
    },
  });

  if (newDecisions < 50) return; // لم يحن الوقت بعد

  // جلب آخر 500 قرار للتدريب
  const decisions = await prisma.match.findMany({
    where: { femaleDecision: { not: null } },
    include: {
      male: { include: { profile: true } },
      female: { include: { profile: true } },
    },
    orderBy: { femaleDecidedAt: "desc" },
    take: 500,
  });

  // تجميع نقاط كل بُعد للقرارات المقبولة والمرفوضة
  const accepted = decisions.filter((d) => d.femaleDecision === "APPROVED");
  const rejected = decisions.filter((d) => d.femaleDecision === "REJECTED");

  if (accepted.length < 10 || rejected.length < 10) return; // بيانات غير كافية

  // حساب متوسط كل بُعد في حالتي القبول والرفض
  function avgScores(matches: typeof decisions) {
    const totals = { religious: 0, geographic: 0, postMarriage: 0, family: 0, education: 0, physical: 0 };
    let count = 0;
    for (const m of matches) {
      if (!m.male?.profile || !m.female?.profile) continue;
      const mp = m.male.profile;
      const fp = m.female.profile;
      totals.religious += calcReligious(mp, fp);
      totals.geographic += calcGeo(mp, fp);
      totals.postMarriage += calcPostMarriage(mp, fp);
      totals.family += calcFamily(mp, fp);
      totals.education += calcEducation(mp, fp);
      totals.physical += calcPhysical(mp, fp, []);
      count++;
    }
    if (count === 0) return null;
    return {
      religious: totals.religious / count,
      geographic: totals.geographic / count,
      postMarriage: totals.postMarriage / count,
      family: totals.family / count,
      education: totals.education / count,
      physical: totals.physical / count,
    };
  }

  const acceptedAvg = avgScores(accepted);
  const rejectedAvg = avgScores(rejected);
  if (!acceptedAvg || !rejectedAvg) return;

  // الأبعاد التي ارتفعت في القبول أكثر من الرفض → تستحق وزناً أعلى
  const LEARNING_RATE = 0.05;
  const dims = ["religious", "geographic", "postMarriage", "family", "education", "physical"] as const;

  const newWeights: Record<string, number> = {};
  for (const dim of dims) {
    const signal = acceptedAvg[dim] - rejectedAvg[dim];
    const current = W[dim] as number;
    let updated = current + LEARNING_RATE * signal;
    // حدود الأوزان: لا تنزل عن 0.04 ولا تعلو عن 0.50
    updated = Math.max(0.04, Math.min(0.50, updated));
    newWeights[dim] = updated;
  }

  // Normalize: مجموع الأوزان = 1
  const total = Object.values(newWeights).reduce((s, v) => s + v, 0);
  for (const dim of dims) newWeights[dim] = newWeights[dim] / total;

  // حفظ الأوزان الجديدة
  await prisma.algorithmWeights.update({
    where: { id: "singleton" },
    data: {
      ...newWeights,
      totalDecisions: { increment: newDecisions },
      lastTrainedAt: new Date(),
    },
  });

  // تسجيل في الـ log للمراجعة
  await prisma.weightUpdateLog.create({
    data: {
      ...newWeights,
      decisionBatch: newDecisions,
      trigger: "AUTO_50",
    } as any,
  });
}

// ============================================================
// تحديث نقاط السمعة
// ============================================================
const RATING_SCORE_MAP: Record<string, number> = {
  INITIAL_MATCH: 25,
  RESPECTFUL_NO_MATCH: 8,
  UNFRIENDLY: -25,
  SLOW_RESPONSE: -10,
  FORMAL_COMPLAINT: -50,
  NO_CONTACT: -20,
  NO_RESPONSE: -15,
};

export async function updateReputationScore(
  userId: string,
  ratingType: RatingType
): Promise<void> {
  const delta = RATING_SCORE_MAP[ratingType] || 0;
  await prisma.user.update({
    where: { id: userId },
    data: { reputationScore: { increment: delta } },
  });
}
