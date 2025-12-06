// api/webhook.js

export default async function handler(req, res) {
  // Health check
  if (req.method === "GET") {
    return res
      .status(200)
      .send("EasyOrders WhatsApp middleware is running ✅");
  }

  // Only allow POST for EasyOrders webhook
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const data = req.body;

    console.log(
      "Incoming EasyOrders Payload:",
      JSON.stringify(data, null, 2)
    );

    // 1) نجيب البيانات من EasyOrders
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

    const orderId =
      data.short_id || data.order_id || data.id || "";

    const totalPrice =
      data.total_cost ||
      data.total_price ||
      data.total ||
      data.cost ||
      "";

    // لو مفيش رقم تليفون نرجع Error
    if (!customerPhone) {
      console.error("No phone number in payload");
      return res.status(400).json({ error: "missing_phone" });
    }

    // 2) تنظيف رقم التليفون وتحويله لصيغة دولية
    let raw = customerPhone.toString().replace(/[^0-9]/g, "");

    // -----------------------------
    // دعم دول: السعودية - مصر - اليمن - السودان
    // -----------------------------

    // السعودية 🇸🇦 (05xxxxxxxx)
    if (raw.startsWith("05") && raw.length === 10) {
      raw = "966" + raw.substring(1); // 9665xxxxxxx
    }
    // مصر 🇪🇬 (01xxxxxxxxx)
    else if (raw.startsWith("01") && raw.length === 11) {
      raw = "20" + raw.substring(1); // 2010xxxxxxx
    }
    // السودان 🇸🇩 (09xxxxxxxx)
    else if (raw.startsWith("09") && raw.length === 10) {
      raw = "249" + raw.substring(1); // 2499xxxxxxx
    }
    // اليمن 🇾🇪 (7xxxxxxxx)
    else if (raw.startsWith("7") && raw.length === 9) {
      raw = "967" + raw; // 9677xxxxxxx
    }
    // لو الرقم أصلاً دولي جاهز
    else if (
      raw.startsWith("966") ||
      raw.startsWith("20") ||
      raw.startsWith("249") ||
      raw.startsWith("967")
    ) {
      // سيبه زي ما هو
    } else {
      // fallback - لو مش معروف خليه زي ما هو
      console.log("❗ رقم غير معروف الدولة, using raw:", raw);
    }

    const normalizedPhone = raw;
    console.log("Normalized Phone:", normalizedPhone);

    // 3) بيانات الواتساب من Environment Variables في Vercel
    const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
    const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID;

    // اسم التمبلت واللغة
    const TEMPLATE_NAME = "welcome_message"; // اسم التمبلت في Meta
    const TEMPLATE_LANG =
      process.env.WHATSAPP_TEMPLATE_LANG || "ar";

    if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
      console.error("Missing WhatsApp env vars");
      return res
        .status(500)
        .json({ error: "missing_whatsapp_config" });
    }

    // 4) جسم الرسالة باستخدام TEMPLATE مش text عادي
    const payload = {
      messaging_product: "whatsapp",
      to: normalizedPhone,
      type: "template",
      template: {
        name: TEMPLATE_NAME,
        language: { code: TEMPLATE_LANG },
        components: [
          {
            type: "body",
            parameters: [
              // {{1}} = اسم العميل
              { type: "text", text: customerName || "" },

              // {{2}} = رقم الطلب
              { type: "text", text: String(orderId || "") },

              // {{3}} = إجمالي السعر
              { type: "text", text: String(totalPrice || "") },
            ],
          },
        ],
      },
    };

    // 5) نبعته لـ WhatsApp Cloud API
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
    console.log("WhatsApp API Response:", waData);

    if (!waRes.ok) {
      console.error(
        "WhatsApp API Error:",
        waRes.status,
        waData
      );
      return res
        .status(500)
        .json({ error: "whatsapp_error", details: waData });
    }

    // كل حاجة تمام
    return res.status(200).json({ status: "sent", waData });
  } catch (err) {
    console.error("Error in webhook handler:", err);
    return res.status(500).json({ error: "internal_error" });
  }
}
