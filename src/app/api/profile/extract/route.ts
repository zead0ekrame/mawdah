import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { generateGeminiResponse } from "@/lib/bot-ai";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  try {
    const { history } = await request.json();
    const isMale = session.gender === "MALE";

    const systemPrompt = `أنت خبير في استخراج البيانات.
قم بتحليل محادثة بين مساعد الذكاء الاصطناعي (أنيس) والمستخدم (${isMale ? "عريس" : "عروسة"}).
مهمتك استخراج بيانات الملف الشخصي للمستخدم من المحادثة، وإرجاعها في شكل JSON فقط، بدون أي نصوص إضافية أو علامات Markdown.

المخطط (Schema) المطلوب بالضبط:
{
  "name": "string",
  "age": "number (مثال: 25)",
  "maritalStatus": "SINGLE" | "DIVORCED" | "WIDOWED" | "MARRIED_SEEKING_POLYGAMY",
  "childrenCount": "string (0, 1, 2, 3+) - إذا لم ينطبق اتركها فارغة",
  "currentWivesCount": "string (1, 2, 3) - إذا لم ينطبق اتركها فارغة",
  "currentGovernorate": "CAIRO|GIZA|ALEXANDRIA|ASWAN|ASSIUT|BENI_SUEF|PORT_SAID|DAKAHLIA|DAMIETTA|SUEZ|SHARQIA|GHARBIA|FAIYUM|KAFR_EL_SHEIKH|LUXOR|MATRUH|MINYA|MONUFIA|NEW_VALLEY|NORTH_SINAI|QENA|QALIUBIYA|RED_SEA|SOHAG|SOUTH_SINAI|ISMAILIA|BEHEIRA",
  "religiousLevel": "string (1, 2, 3, 4, 5)",
  "educationLevel": "BELOW_HIGH_SCHOOL" | "HIGH_SCHOOL" | "UNIVERSITY" | "MASTERS" | "PHD",
  "heightCategory": "string (مثال: 165-169)",
  "weightCategory": "string (مثال: 70-74)",
  "skinColor": "WHITE" | "WHEAT" | "BROWN" | "DARK",
  "personalMessage": "string (الرسالة التي صاغها المساعد في النهاية أو أي وصف للذات)",
  "hijabType": "NIQAB" | "HIJAB" | "NONE" (للبنات فقط، للرجال اتركها ""),
  "guardianPhone": "string (مثال: 01xxxxxxxxx)" (للبنات فقط، للرجال اتركها "")
}

حلل المحادثة التالية، واستخرج القيم الصحيحة. إذا كان هناك حقل غير مذكور أو غير واضح، استخدم تقديرك بناءً على الإجابات (مثلاً: "في الكلية" -> UNIVERSITY).
`;

    const chatText = history.map((m: any) => `${m.role === "bot" ? "أنيس" : "المستخدم"}: ${m.text}`).join("\n");

    try {
      const response = await generateGeminiResponse(session.userId, chatText, systemPrompt);
      // Clean possible markdown wrapper
      const cleaned = response.replace(/\`\`\`json/g, "").replace(/\`\`\`/g, "").trim();
      const extractedData = JSON.parse(cleaned);

      return NextResponse.json({ success: true, data: extractedData });
    } catch (e) {
      console.error("[profile extract parse error]", e);
      return NextResponse.json({ error: "فشل استخراج البيانات" }, { status: 500 });
    }

  } catch (error) {
    console.error("[profile extract error]", error);
    return NextResponse.json({ error: "حدث خطأ عام" }, { status: 500 });
  }
}
