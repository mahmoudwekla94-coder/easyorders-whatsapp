// api/webhook2.js

async function webhook2(req, res) {
  // =========================
  // 0) Health Check
  // =========================
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      message: "Webhook2 Running ✅",
    });
  }

  // =========================
  // Allow only POST
  // =========================
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const data = req.body || {};

    // =========================
    // 1) Store Tag من URL
    // =========================
    const storeTagRaw = (req.query && req.query.storeTag) || "";
    const storeTag = storeTagRaw ? `[${storeTagRaw}]` : "";
    console.log("🏪 Store Tag:", storeTagRaw || "NO_TAG");

    // =========================
    // 2) بيانات العميل والطلب
    // =========================
    const customerName =
      data.full_name ||
      data.name ||
      data.customer_name ||
      "عميلنا العزيز";

    const customerPhone =
      data.phone ||
      data.phone_alt ||
      data.customer_phone ||
      "";

    const orderId =
      data.short_id ||
      data.order_id ||
      data.id ||
      "";

    const address =
      data.address ||
      data.government ||
      "";

    // أول منتج
    const firstItem = data.cart_items?.[0] || {};
    const productName = firstItem.product?.name || "منتجك";
    const quantity =
      firstItem.quantity != null ? firstItem.quantity : 1;

    const price =
      firstItem.price != null
        ? firstItem.price
        : data.total_cost != null
        ? data.total_cost
        : data.cost != null
        ? data.cost
        : "";

    // =========================
    // 3) تجهيز المتغير {{3}}
    // =========================
    let addressAndProduct = address || "";

    if (productName) {
      addressAndProduct +=
        (addressAndProduct ? " - " : "") + productName;
    }

    if (quantity) {
      addressAndProduct += ` - الكمية: ${quantity}`;
    }

    if (price !== "") {
      addressAndProduct += ` - السعر: ${price}`;
    }

    const cleanParam = (text) => {
      if (!text) return "";
      return text
        .toString()
        .replace(/[\r\n\t]+/g, " ")
        .trim();
    };

    // =========================
    // 4) Normalize Phone
    // =========================
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

    // =========================
    // 5) ENV الخاصة بالويبهوك2 فقط
    // =========================
    const API_BASE_URL = process.env.SAAS_API_BASE_URL_2;
    const VENDOR_UID  = process.env.SAAS_VENDOR_UID_2;
    const API_TOKEN   = process.env.SAAS_API_TOKEN_2;

    if (!API_BASE_URL || !VENDOR_UID || !API_TOKEN) {
      console.error("❌ Missing ENV for webhook2");
      return res.status(500).json({
        error: "missing_env_webhook2",
      });
    }

    // =========================
    // 6) Payload التمبلت
    // first_utility / ar
    // =========================
    const payload = {
      phone_number: normalizedPhone,
      template_name: "first_utility",
      template_language: "ar",
      field_1: cleanParam(customerName),                    // {1}
      field_2: cleanParam(`${orderId} ${storeTag}`.trim()), // {2}
      field_3: cleanParam(addressAndProduct),               // {3}
      contact: {
        first_name: cleanParam(customerName),
        phone_number: normalizedPhone,
        country: "auto",
      },
    };

    const endpoint = `${API_BASE_URL}/${VENDOR_UID}/contact/send-template-message`;

    console.log("🚀 Sending to SaaS (webhook2):", payload);

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
      console.error("❌ SaaS Error (webhook2):", responseData);
      return res.status(500).json({
        error: "saas_api_error",
        details: responseData,
      });
    }

    console.log("✅ SaaS Response (webhook2):", responseData);
    return res.status(200).json({
      status: "sent",
      data: responseData,
    });
  } catch (err) {
    console.error("❌ Webhook2 Error:", err);
    return res.status(500).json({
      error: "internal_error",
    });
  }
}

module.exports = webhook2;
