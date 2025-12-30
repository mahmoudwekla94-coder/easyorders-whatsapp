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
    // 1) Store Tag
    // =========================
    const storeTagRaw = req.query?.storeTag || "";
    const storeTag = storeTagRaw ? `[${storeTagRaw}]` : "";
    console.log("🏪 Store Tag:", storeTagRaw || "NO_TAG");

    // =========================
    // 2) بيانات العميل
    // =========================
    const customerName =
      data.full_name ||
      data.name ||
      data.customer_name ||
      "Customer";

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

    // =========================
    // 3) المنتج
    // =========================
    const firstItem = data.cart_items?.[0] || {};
    const productName = firstItem.product?.name || "Product";
    const quantity = firstItem.quantity ?? 1;

    const price =
      firstItem.price ??
      data.total_cost ??
      data.cost ??
      "";

    let addressAndProduct = address || "";

    if (productName) {
      addressAndProduct += (addressAndProduct ? " - " : "") + productName;
    }

    addressAndProduct += ` - Qty: ${quantity}`;

    if (price !== "") {
      addressAndProduct += ` - Price: ${price}`;
    }

    const clean = (v) =>
      v ? v.toString().replace(/[\r\n\t]+/g, " ").trim() : "";

    // =========================
    // 4) Normalize Phone
    // =========================
    let raw = customerPhone.toString().replace(/[^0-9]/g, "");

    if (raw.startsWith("05") && raw.length === 10) raw = "966" + raw.slice(1);
    else if (raw.startsWith("01") && raw.length === 11) raw = "20" + raw.slice(1);
    else if (raw.startsWith("09") && raw.length === 10) raw = "249" + raw.slice(1);
    else if (raw.startsWith("7") && raw.length === 9) raw = "967" + raw;

    console.log("📞 Normalized Phone:", raw);

    // =========================
    // 5) ENV الخاصة بالويبهوك2
    // =========================
    const API_BASE_URL = process.env.SAAS_API_BASE_URL_2;
    const VENDOR_UID  = process.env.SAAS_VENDOR_UID_2;
    const API_TOKEN   = process.env.SAAS_API_TOKEN_2;

    if (!API_BASE_URL || !VENDOR_UID || !API_TOKEN) {
      console.error("❌ Missing ENV for webhook2");
      return res.status(500).json({ error: "missing_env_webhook2" });
    }

    // =========================
    // 6) Payload
    // =========================
    const payload = {
      phone_number: raw,
      template_name: "1st_utility",
      template_language: "en",
      field_1: clean(customerName),
      field_2: clean(`${orderId} ${storeTag}`),
      field_3: clean(addressAndProduct),
      contact: {
        first_name: clean(customerName),
        phone_number: raw,
        country: "auto",
      },
    };

    const endpoint = `${API_BASE_URL}/${VENDOR_UID}/contact/send-template-message`;

    // 🔥 السطر اللي انت طالبه
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

    console.log("✅ SaaS Response (webhook2):", responseData);

    if (!saasRes.ok || responseData?.result === "failed") {
      console.error("❌ SaaS Failed (webhook2):", responseData);
      return res.status(500).json({
        error: "saas_failed",
        details: responseData,
      });
    }

    return res.status(200).json({ status: "sent" });

  } catch (err) {
    console.error("❌ Webhook2 Error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
}

module.exports = webhook2;
