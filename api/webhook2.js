// api/webhook2.js

async function webhook(req, res) {
  if (req.method === "GET") return res.status(200).send("Webhook2 Running ✅");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const data = req.body || {};

    const storeTagRaw = (req.query && req.query.storeTag) || "";
    const storeTag = storeTagRaw ? `[${storeTagRaw}]` : "";
    console.log("🏪 Store Tag:", storeTagRaw || "NO_TAG");

    const customerName = data.full_name || data.name || data.customer_name || "Customer";
    const customerPhone = data.phone || data.phone_alt || data.customer_phone || "";

    const orderId = data.short_id || data.order_id || data.id || "";
    const address = data.address || data.government || "";

    const firstItem = data.cart_items?.[0] || {};
    const productName = firstItem.product?.name || "Product";
    const quantity = firstItem.quantity != null ? firstItem.quantity : 1;

    const price =
      firstItem.price != null
        ? firstItem.price
        : data.total_cost != null
        ? data.total_cost
        : data.cost != null
        ? data.cost
        : "";

    const cleanParam = (text) =>
      text ? text.toString().replace(/[\r\n\t]+/g, " ").trim() : "";

    // {{3}} → Address - Product - Qty - Price
    let addressAndProduct = address || "";
    if (productName) addressAndProduct += (addressAndProduct ? " - " : "") + productName;
    if (quantity != null) addressAndProduct += ` - Qty: ${quantity}`;
    if (price !== "") addressAndProduct += ` - Price: ${price}`;

    // Normalize phone
    let raw = customerPhone.toString().replace(/[^0-9]/g, "");
    if (raw.startsWith("05") && raw.length === 10) raw = "966" + raw.substring(1);
    else if (raw.startsWith("01") && raw.length === 11) raw = "20" + raw.substring(1);
    else if (raw.startsWith("09") && raw.length === 10) raw = "249" + raw.substring(1);
    else if (raw.startsWith("7") && raw.length === 9) raw = "967" + raw;

    const normalizedPhone = raw;
    console.log("📞 Normalized Phone:", normalizedPhone);

    // ENV (_2 only)
    const API_BASE_URL = process.env.SAAS_API_BASE_URL_2;
    const VENDOR_UID = process.env.SAAS_VENDOR_UID2;
    const API_TOKEN = process.env.SAAS_API_TOKEN_2;

    console.log("🔹 ENV CHECK (_2):", {
      API_BASE_URL: API_BASE_URL ? "✅ Set" : "❌ Missing",
      VENDOR_UID: VENDOR_UID ? "✅ Set" : "❌ Missing",
      API_TOKEN: API_TOKEN ? "✅ Set" : "❌ Missing",
    });

    if (!API_BASE_URL || !VENDOR_UID || !API_TOKEN) {
      return res.status(500).json({ error: "missing_env_2" });
    }

    // ✅ params
    const p1 = cleanParam(customerName);
    const p2 = cleanParam(`${orderId} ${storeTag}`.trim());
    const p3 = cleanParam(addressAndProduct);

    // ✅ Mega payload: include ALL possible param formats
    const payload = {
      phone_number: normalizedPhone,
      template_name: "1st_utillty",
      template_language: "en",

      // (A) old style fields
      field_1: p1,
      field_2: p2,
      field_3: p3,

      // (B) array style
      body_params: [p1, p2, p3],
      params: [p1, p2, p3],
      localizable_params: [p1, p2, p3],

      // (C) cloud-api style (text objects)
      parameters: [
        { type: "text", text: p1 },
        { type: "text", text: p2 },
        { type: "text", text: p3 },
      ],
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: p1 },
            { type: "text", text: p2 },
            { type: "text", text: p3 },
          ],
        },
      ],

      contact: {
        first_name: p1,
        phone_number: normalizedPhone,
        country: "auto",
      },
    };

    const endpoint = `${API_BASE_URL}/${VENDOR_UID}/contact/send-template-message`;

    console.log("🚀 Sending to SaaS (webhook2):", endpoint, payload);

    const saasRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

    const responseData = await saasRes.json().catch(() => null);

    if (!saasRes.ok || responseData?.result === "failed") {
      console.error("❌ SaaS API Error:", responseData);
      return res.status(500).json({ error: "saas_api_error", details: responseData });
    }

    console.log("✅ SaaS Response (webhook2):", responseData);
    return res.status(200).json({ status: "sent", data: responseData });
  } catch (err) {
    console.error("❌ Webhook2 Error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
}

module.exports = webhook;
