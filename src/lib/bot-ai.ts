import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export const SYSTEM_INSTRUCTION = `
أنت اسمك "أنيس"، المساعد الذكي والودود لمنصة "أنيس" للزواج الشرعي في مصر.
تتحدث بلهجة مصرية عامية محترمة، راقية، ومُشجعة جداً (مثل أخ أو صديق ناصح أمين).
أنت شخصية متدينة باعتدال وتوازن، لسانك عطر بالدعاء الخفيف الجميل والمناسب للموقف.
على سبيل المثال: إذا كان المستخدم يتمنى الزواج، ادعُ له بـ "ربنا يرزقك الزوج الصالح ويقر عينك" أو "ربنا يرزقك الزوجة الصالحة"، وإذا كان محبطاً ادعُ له بـ "ربنا ييسرلك الخير ويعوضك بأحسن مما تتمنى".
مهمتك: الرد على استفسارات المستخدم، مساعدته نفسياً، وتوجيهه لاستخدام المنصة، وبث الأمل والطمأنينة في نفسه.
استخدم إيموجي خفيفة ومعبرة (مثل 💚، 😊، 🤲، ✨).

[تعليمات هامة]:
- حافظ على توازن الشخصية: كن ودوداً وبشوشاً، واستخدم الدعاء بشكل طبيعي وغير مبالغ فيه (سطر واحد في نهاية الرد يكفي).
- إذا سأل عن توفر عروض، انظر لعدد العروض التي تنتظر قراره وأخبره بلطف.
- إذا طلب الذهاب لصفحة معينة، أخبره أن يضغط على الأزرار السريعة أسفل الشاشة أو يكتب الأمر (مثال: /browse).
- الرد يجب أن يكون قصيراً، دافئاً، ومباشراً (في حدود 3 إلى 4 أسطر).
`;

export async function generateChatReply(text: string, session: any, profile: any, recentMessages: any[], pendingMatchesCount: number, fullyMatchedCount: number) {
  if (!apiKey) throw new Error("GEMINI_API_KEY is missing");

  const isProfileComplete = profile ? profile.completenessScore === 100 : false;
  
  const contextualInstruction = `
${SYSTEM_INSTRUCTION}

[معلومات المستخدم الحالي التي يجب أن تعرفها ولا تخبره بها صراحة بل استخدمها في السياق]:
- الجنس: ${session.gender === "MALE" ? "ذكر" : "أنثى"}
- هل ملفه مكتمل؟ ${isProfileComplete ? "نعم" : "لا، يجب أن تكمله من صفحة الإعدادات"}
- عدد عروض التوافق التي تنتظر قراره الآن: ${pendingMatchesCount}
- عدد التوافقات الناجحة (تم كشف الرقم): ${fullyMatchedCount}
- السن: ${profile?.age || "غير محدد"}
- المحافظة: ${profile?.currentGovernorate || "غير محدد"}
`;

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction: contextualInstruction });

  const chatHistory = recentMessages.reverse().map(msg => ({
    role: msg.isFromBot ? "model" : "user",
    parts: [{ text: msg.content }],
  }));

  if (chatHistory.length > 0) {
    chatHistory.pop(); 
  }

  // Ensure chat history starts with a 'user' message and alternates perfectly
  const formattedHistory: any[] = [];
  let expectedRole = "user";
  for (const msg of chatHistory) {
    if (msg.role === expectedRole) {
      formattedHistory.push(msg);
      expectedRole = expectedRole === "user" ? "model" : "user";
    }
  }

  const chat = model.startChat({ history: formattedHistory });
  const result = await chat.sendMessage(text);
  return result.response.text();
}

export async function generateMatchNotification(userId: string, isMale: boolean, otherUserPhone: string, matchDetails: any) {
  if (!apiKey) return null;

  const prompt = `
أنت الآن تبادر بإرسال إشعار (رسالة من تلقاء نفسك) للمستخدم لتبشره بحدوث "توافق مزدوج" (Mutual Match) ناجح.
المستخدم هو: ${isMale ? "عريس (ذكر)" : "عروسة (أنثى)"}.
رقم التواصل الذي يجب أن تعطيه للمستخدم هو: ${otherUserPhone} (${isMale ? "هذا رقم ولي أمر العروسة" : "هذا رقم العريس"}).

قم بصياغة رسالة إشعار ودودة جداً تفرح المستخدم، بلهجتك المصرية الراقية المعتادة، وبارك له، وأعطه الرقم، وانصحه باحترام وتدين أن يبدأ التواصل على بركة الله.
اختم الرسالة بدعاء جميل بالتوفيق وإتمام الأمر على خير.
`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction: SYSTEM_INSTRUCTION });
    const result = await model.generateContent(prompt);
    const content = result.response.text();
    
    await prisma.botMessage.create({
      data: {
        userId,
        isFromBot: true,
        messageType: "CONTACT_REVEALED",
        content,
      },
    });
    
    return true;
  } catch (e) {
    console.error("AI Notification Error:", e);
    return false;
  }
}

export async function generateGeminiResponse(userId: string, prompt: string, systemInstruction?: string) {
  if (!apiKey) throw new Error("GEMINI_API_KEY is missing");
  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash", 
    systemInstruction: systemInstruction === "system" ? SYSTEM_INSTRUCTION : systemInstruction 
  });
  const result = await model.generateContent(prompt);
  return result.response.text();
}
