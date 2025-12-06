// api/webhook.js

export default async function handler(req, res) {
  // 🔵 Health Check
  if (req.method === "GET") {
    return res.status(200).send("EasyOrders WhatsApp Webhook Running ✅");
  }

  // 🔵 Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const data = req.body;

    console.log("Incoming EasyOrders Payload:", JSON.stringify(data, null, 2));

    // ===============================
    // 1) استخراج بيانات الطلب
    // ===============================

    const customerName =
      data.full_name ||
      data.name ||
      data.customer_name ||
      "عميلنا العزيز";

    let customerPhone =
      data.phone ||
      data.phone_alt ||
      data.customer_phone ||
      "";

    const orderId = data.short_id || data.order_id || data.id || "";
    const address = data.address || data.government || "لم يتم إدخال عنوان";

    // ===============================
    // 2) تنظيف وتوحيد صيغة رقم الهاتف
    // ===============================

    let raw = customerPhone.toString().replace(/[^0-9]/g, "");

    // 🔹 السعودية
    if (raw.startsWith("05") && raw.length === 10) {
      raw = "966" + raw.substring(1);
    }
    // 🔹 مصر
    else if (raw.startsWith("01") && raw.length === 11) {
      raw = "20" + raw.substring(1);
    }
    // 🔹 السودان
    else if (raw.startsWith("09") && raw.length === 10) {
      raw = "249" + raw.substring(1);
    }
    // 🔹 اليمن
    else if (raw.startsWith("7") && raw.length === 9) {
      raw = "967" + raw;
    }
    // 🔹 لو الرقم جاهز دوليًا اتركه كما هو
    else if (
      raw.startsWith("20") ||
      raw.startsWith("966") ||
      raw.startsWith("249") ||
      raw.startsWith("967")
    ) {
    } else {
      console.log("❗ رقم غير معروف الدولة، سيتم استخدامه كما هو:", raw);
    }

    const normalizedPhone = raw;
    console.log("Normalized Phone:", normalizedPhone);

    // ===============================
    // 3) متغيرات واتساب من Vercel
    // ===============================
    const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
    const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID;

    if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
      console.error("❌ Missing WhatsApp Env Vars");
      return res.status(500).json({ error: "missing_env" });
    }

    // ===============================
    // 4) إعداد Payload للتمبلت
    // ===============================

    const payload = {
      messaging_product: "whatsapp",
      to: normalizedPhone,
      type: "template",
      template: {
        name: "order_confirmation", // اسم التمبلت
        language: { code: "ar" }, // عربي — غيّرها لـ en لو عايز إنجليزي
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: customerName }, // {{1}}
              { type: "text", text: String(orderId) }, // {{2}}
              { type: "text", text: address }, // {{3}}
            ],
          },
        ],
      },
    };

    // ===============================
    // 5) إرسال الرسالة إلى WhatsApp API
    // ===============================
    const waRes = await fetch(
      `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_ID}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        },
        body: JSON.stringify(payload),
      }
    );

    const waData = await waRes.json();
    console.log("📨 WhatsApp API Response:", waData);

    if (!waRes.ok) {
      console.error("❌ WhatsApp Error:", waData);
      return res.status(500).json({ error: "whatsapp_error", waData });
    }

    // 🔵 Successful send
    return res.status(200).json({ status: "sent", waData });
  } catch (err) {
    console.error("❌ Webhook Error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
}
