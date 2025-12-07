// api/webhook.js

async function webhook(req, res) {
  // ✅ Health Check
  if (req.method === "GET") {
    return res.status(200).send("Webhook Running ✅");
  }

  // ✅ Allow only POST for EasyOrders
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const data = req.body;

    // -------------------------
    // 1) بيانات العميل والطلب
    // -------------------------
    const customerName =
      data.full_name || data.name || data.customer_name || "عميلنا العزيز";

    const customerPhone =
      data.phone || data.phone_alt || data.customer_phone || "";

    const orderId = data.short_id || data.order_id || data.id || "";
    const address = data.address || data.government || "";

    // تنظيف الباراميترات للتمبلت (مفيش سطور جديدة ولا Tabs)
    const cleanParam = (text) => {
      if (!text) return "";
      return text.toString().replace(/[\r\n\t]+/g, " ").trim();
    };

    // -------------------------
    // 2) توحيد صيغة رقم الموبايل
    // -------------------------
    let raw = customerPhone.toString().replace(/[^0-9]/g, "");

    // السعودية
    if (raw.startsWith("05") && raw.length === 10) {
      raw = "966" + raw.substring(1);
    }
    // مصر
    else if (raw.startsWith("01") && raw.length === 11) {
      raw = "20" + raw.substring(1);
    }
    // السودان
    else if (raw.startsWith("09") && raw.length === 10) {
      raw = "249" + raw.substring(1);
    }
    // اليمن
    else if (raw.startsWith("7") && raw.length === 9) {
      raw = "967" + raw;
    }

    const normalizedPhone = raw;
    console.log("📞 Normalized Phone:", normalizedPhone);

    // -------------------------
    // 3) متغيرات الـ SaaS (Paramedics)
    // -------------------------
    const API_BASE_URL = process.env.SAAS_API_BASE_URL;
    const VENDOR_UID = process.env.SAAS_VENDOR_UID;
    const API_TOKEN = process.env.SAAS_API_TOKEN;

    if (!API_BASE_URL || !VENDOR_UID || !API_TOKEN) {
      console.error("❌ Missing Environment Variables");
      return res.status(500).json({ error: "missing_env" });
    }

    // -------------------------
    // 4) Payload الخاص بالتمبلت
    // -------------------------
    const payload = {
      phone_number: normalizedPhone,
      template_name: "order_confirmation",
      template_language: "en", // التمبلت اللي عملناه EN في الداشبورد
      field_1: cleanParam(customerName),       // {{1}} اسم العميل
      field_2: cleanParam(String(orderId)),    // {{2}} رقم الطلب
      field_3: cleanParam(address),            // {{3}} العنوان
      contact: {
        first_name: cleanParam(customerName),
        phone_number: normalizedPhone,
        country: "auto",
      },
    };

    const endpoint = `${API_BASE_URL}/${VENDOR_UID}/contact/send-template-message`;

    console.log("🚀 Sending to SaaS:", endpoint, payload);

    const saasRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

    const responseData = await saasRes.json().catch(() => null);

    if (!saasRes.ok) {
      console.error("❌ SaaS API Error:", responseData);
      return res
        .status(500)
        .json({ error: "saas_api_error", details: responseData });
    }

    console.log("✅ SaaS Response:", responseData);
    return res.status(200).json({ status: "sent", data: responseData });
  } catch (err) {
    console.error("❌ Webhook Error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
}

// ❗ أهم سطر: التصدير بصيغة CommonJS
module.exports = webhook;
