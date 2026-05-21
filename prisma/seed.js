const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const GOVS = [
  "CAIRO", "GIZA", "ALEXANDRIA", "DAKAHLIA", "SHARQIA",
  "GHARBIA", "QALIUBIYA", "MONUFIA", "BEHEIRA", "MINYA",
];

const MALES = [
  { phone: "01000000001", age: 26, gov: "CAIRO", postGov: "CAIRO", marital: "SINGLE", religious: 4, edu: "UNIVERSITY", height: "170-174", weight: "70-74", skin: "WHEAT", msg: "أبحث عن شريكة حياة صالحة تجمعني وإياها طاعة الله. أسعى للاستقرار والبناء." },
  { phone: "01000000002", age: 30, gov: "GIZA", postGov: "GIZA", marital: "SINGLE", religious: 3, edu: "UNIVERSITY", height: "175-179", weight: "75-79", skin: "WHITE", msg: "مهندس أعمل في قطاع التقنية. أبحث عن شريكة تفهمني وتشاركني طموحاتي." },
  { phone: "01000000003", age: 28, gov: "CAIRO", postGov: "CAIRO", marital: "SINGLE", religious: 5, edu: "MASTERS", height: "170-174", weight: "65-69", skin: "WHEAT", msg: "حافظ للقرآن الكريم. أسعى لتكوين أسرة على أسس دينية متينة." },
  { phone: "01000000004", age: 33, gov: "ALEXANDRIA", postGov: "ALEXANDRIA", marital: "DIVORCED", religious: 3, edu: "UNIVERSITY", height: "175-179", weight: "80-84", skin: "WHITE", msg: "طبيب. الحياة علّمتني كثيراً وأبحث عن شريكة ناضجة تفهم معنى الحياة." },
  { phone: "01000000005", age: 27, gov: "GIZA", postGov: "CAIRO", marital: "SINGLE", religious: 4, edu: "UNIVERSITY", height: "165-169", weight: "65-69", skin: "BROWN", msg: "مدرّس وأحب القراءة. أبحث عن شريكة تحب العلم والثقافة." },
  { phone: "01000000006", age: 31, gov: "QALIUBIYA", postGov: "CAIRO", marital: "SINGLE", religious: 4, edu: "UNIVERSITY", height: "170-174", weight: "70-74", skin: "WHEAT", msg: "أعمل في المجال المالي. أقدّر الهدوء والاستقرار في الحياة الزوجية." },
  { phone: "01000000007", age: 25, gov: "CAIRO", postGov: "CAIRO", marital: "SINGLE", religious: 5, edu: "UNIVERSITY", height: "175-179", weight: "70-74", skin: "WHITE", msg: "طالب دكتوراه وأسعى لخدمة ديني ووطني. أبحث عن من تشاركني هذا المسار." },
  { phone: "01000000008", age: 35, gov: "DAKAHLIA", postGov: "DAKAHLIA", marital: "WIDOWED", religious: 4, edu: "HIGH_SCHOOL", height: "165-169", weight: "75-79", skin: "BROWN", msg: "رجل عملي ومستقر. أبحث عن شريكة جادة وصادقة لتأسيس بيت سعيد." },
  { phone: "01000000009", age: 29, gov: "GHARBIA", postGov: "GHARBIA", marital: "SINGLE", religious: 3, edu: "UNIVERSITY", height: "170-174", weight: "70-74", skin: "WHEAT", msg: "محاسب. أحب الحياة البسيطة وأقدّر الهدوء والراحة في المنزل." },
  { phone: "01000000010", age: 32, gov: "MINYA", postGov: "MINYA", marital: "SINGLE", religious: 4, edu: "UNIVERSITY", height: "175-179", weight: "80-84", skin: "BROWN", msg: "طبيب أسنان. أبحث عن شريكة صالحة من أهل الصعيد." },
];

const FEMALES = [
  { phone: "01100000001", age: 23, gov: "CAIRO", postGov: "CAIRO", marital: "SINGLE", religious: 4, edu: "UNIVERSITY", height: "155-159", weight: "50-54", skin: "WHITE", hijab: "HIJAB", msg: "طالبة دراسات عليا. أبحث عن شريك يعينني على طاعة الله وبناء بيت راقٍ." },
  { phone: "01100000002", age: 26, gov: "GIZA", postGov: "GIZA", marital: "SINGLE", religious: 3, edu: "UNIVERSITY", height: "160-164", weight: "55-59", skin: "WHEAT", hijab: "HIJAB", msg: "صيدلانية. أبحث عن شريك جاد ومستقر يقدّر المرأة المتعلمة." },
  { phone: "01100000003", age: 24, gov: "CAIRO", postGov: "CAIRO", marital: "SINGLE", religious: 5, edu: "UNIVERSITY", height: "155-159", weight: "50-54", skin: "WHITE", hijab: "NIQAB", msg: "حافظة للقرآن ومعلمة. أبحث عن شريك ملتزم يكون ريحاناً لي في الدنيا والآخرة." },
  { phone: "01100000004", age: 29, gov: "ALEXANDRIA", postGov: "ALEXANDRIA", marital: "DIVORCED", religious: 3, edu: "MASTERS", height: "160-164", weight: "55-59", skin: "WHITE", hijab: "HIJAB", msg: "أستاذة جامعية. الحياة علّمتني الكثير وأبحث عن شريك ناضج يفهم ويقدّر." },
  { phone: "01100000005", age: 22, gov: "GIZA", postGov: "CAIRO", marital: "SINGLE", religious: 4, edu: "UNIVERSITY", height: "155-159", weight: "45-49", skin: "WHEAT", hijab: "HIJAB", msg: "مدرّسة شابة تحب التعليم والأطفال. أبحث عن بيت دافئ ومستقر." },
  { phone: "01100000006", age: 27, gov: "QALIUBIYA", postGov: "CAIRO", marital: "SINGLE", religious: 4, edu: "UNIVERSITY", height: "160-164", weight: "55-59", skin: "WHEAT", hijab: "HIJAB", msg: "محاسبة. أبحث عن شريك يوازن بين الدين والدنيا ويقدّر المرأة." },
  { phone: "01100000007", age: 25, gov: "CAIRO", postGov: "CAIRO", marital: "SINGLE", religious: 5, edu: "UNIVERSITY", height: "155-159", weight: "50-54", skin: "WHITE", hijab: "NIQAB", msg: "طالبة علم شرعي. أسعى لأسرة تقوم على التعاون في طاعة الله." },
  { phone: "01100000008", age: 31, gov: "DAKAHLIA", postGov: "DAKAHLIA", marital: "WIDOWED", religious: 4, edu: "HIGH_SCHOOL", height: "155-159", weight: "55-59", skin: "BROWN", hijab: "HIJAB", msg: "ربة بيت وأم لطفلة واحدة. أبحث عن شريك صالح يكمل مسيرتي." },
  { phone: "01100000009", age: 24, gov: "GHARBIA", postGov: "GHARBIA", marital: "SINGLE", religious: 3, edu: "UNIVERSITY", height: "160-164", weight: "50-54", skin: "WHEAT", hijab: "HIJAB", msg: "مهندسة شابة. أبحث عن شريك عملي ومحترم يقدّر الاستقرار." },
  { phone: "01100000010", age: 26, gov: "MINYA", postGov: "MINYA", marital: "SINGLE", religious: 4, edu: "UNIVERSITY", height: "155-159", weight: "50-54", skin: "BROWN", hijab: "HIJAB", msg: "طبيبة من الصعيد. أبحث عن شريك ملتزم من بيئة محترمة." },
];

async function seed() {
  console.log("🌱 بدء إنشاء بيانات الاختبار...");

  // حذف البيانات القديمة (غير المسؤول)
  await prisma.rating.deleteMany({});
  await prisma.complaint.deleteMany({});
  await prisma.followUpLog.deleteMany({});
  await prisma.match.deleteMany({});
  await prisma.botMessage.deleteMany({});
  await prisma.preference.deleteMany({});
  await prisma.profile.deleteMany({});
  await prisma.otpCode.deleteMany({});

  // حذف مستخدمي الاختبار فقط
  await prisma.user.deleteMany({
    where: { phone: { startsWith: "010000000" } },
  });
  await prisma.user.deleteMany({
    where: { phone: { startsWith: "011000000" } },
  });

  const createdMales = [];
  const createdFemales = [];

  // إنشاء الذكور
  for (const m of MALES) {
    const user = await prisma.user.create({
      data: {
        phone: m.phone,
        gender: "MALE",
        isVerified: true,
        status: "ACTIVE",
        reputationScore: 100 + Math.floor(Math.random() * 50),
        profile: {
          create: {
            age: m.age,
            currentGovernorate: m.gov,
            postMarriageGovernorate: m.postGov,
            maritalStatus: m.marital,
            childrenCount: m.marital !== "SINGLE" ? 1 : null,
            religiousLevel: m.religious,
            educationLevel: m.edu,
            heightCategory: m.height,
            weightCategory: m.weight,
            skinColor: m.skin,
            personalMessage: m.msg,
            completenessScore: 100,
          },
        },
      },
    });
    createdMales.push(user);
    console.log(`✅ ذكر: ${m.phone}`);
  }

  // إنشاء الإناث
  for (const f of FEMALES) {
    const user = await prisma.user.create({
      data: {
        phone: f.phone,
        gender: "FEMALE",
        isVerified: true,
        status: "ACTIVE",
        reputationScore: 100 + Math.floor(Math.random() * 50),
        profile: {
          create: {
            age: f.age,
            currentGovernorate: f.gov,
            postMarriageGovernorate: f.postGov,
            maritalStatus: f.marital,
            childrenCount: f.marital !== "SINGLE" ? 1 : null,
            religiousLevel: f.religious,
            educationLevel: f.edu,
            heightCategory: f.height,
            weightCategory: f.weight,
            skinColor: f.skin,
            hijabType: f.hijab,
            guardianPhone: `0100${Math.floor(Math.random() * 9000000 + 1000000)}`,
            personalMessage: f.msg,
            completenessScore: 100,
          },
        },
      },
    });
    createdFemales.push(user);
    console.log(`✅ أنثى: ${f.phone}`);
  }

  console.log("\n✅ تم إنشاء البيانات بنجاح!");
  console.log(`👨 ${createdMales.length} ذكر`);
  console.log(`👩 ${createdFemales.length} أنثى`);
  console.log("\n📱 أرقام للاختبار:");
  console.log("ذكر:  01000000001 → 01000000010");
  console.log("أنثى: 01100000001 → 01100000010");
  console.log("الكود التطويري: 123456");

  await prisma.$disconnect();
  await pool.end();
}

seed().catch(async (e) => {
  console.error("❌ خطأ في الـ Seed:", e);
  await prisma.$disconnect();
  await pool.end();
  process.exit(1);
});
