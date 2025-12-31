// api/webhook2.js

module.exports = async function handler(req, res) {
  // ✅ Health Check
  if (req.method === "GET") return res.status(200).send("Webhook Running ✅");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    // ✅ Read raw body (works even if EO sends non-json)
    const buffers = [];
    for await (const chunk of req) buffers.push(chunk);
    const rawBody = Buffer.concat(buffers).toString("utf8");

    console.log("✅ HIT POST /api/webhook2");
    console.log("✅ Content-Type:", req.headers["content-type"]);
    console.log("✅ Raw Body:", rawBody);

    let data = {};
    try {
      data = rawBody ? JSON.parse(rawBody) : (req.body || {});
    } catch {
      // sometimes EO sends key=value&...
      data = { raw: rawBody, ...(req.body || {}) };
    }

    console.log("🔹 [1] Parsed Payload:", JSON.stringify(data));

    // ✅ ENV (_2)
    const API_BASE_URL = process.env.SAAS_API_BASE_URL_2;
    const VENDOR_UID = process.env.SAAS_VENDOR_UID2;
    const API_TOKEN = process.env.SAAS_API_TOKEN_2;

    console.log("🔹 [2] ENV CHECK (_2):", {
      API_BASE_URL: API_BASE_URL ? "✅ Set" : "❌ Missing",
      VENDOR_UID: VENDOR_UID ? "✅ Set" : "❌ Missing",
      API_TOKEN: API_TOKEN ? "✅ Set" : "❌ Missing",
    });

    if (!API_BASE_URL || !VENDOR_UID || !API_TOKEN) {
      return res.status(500).json({ error: "Missing ENV _2" });
    }

    const cleanParam = (text) =>
      text ? text.toString().replace(/[\r\n\t]+/g, " ").trim() : "";

    const customerName =
      data.full_name || data.name || data.customer_name || "Customer";
    const customerPhone =
      data.phone || data.phone_alt || data.customer_phone || "";

    const orderId = data.short_id || data.order_id || data.id || "000";
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

    let addressAndProduct = address || "";
    if (productName) addressAndProduct += (addressAndProduct ? " - " : "") + productName;
    if (quantity != null) addressAndProduct += ` - Qty: ${quantity}`;
    if (price !== "") addressAndProduct += ` - Price: ${price}`;

    // Normalize phone
    let raw = (customerPhone || "").toString().replace(/[^0-9]/g, "");
    if (raw.startsWith("05") && raw.length === 10) raw = "966" + raw.substring(1);
    else if (raw.startsWith("01") && raw.length === 11) raw = "20" + raw.substring(1);
    else if (raw.startsWith("09") && raw.length === 10) raw = "249" + raw.substring(1);
    else if (raw.startsWith("7") && raw.length === 9) raw = "967" + raw;

    const normalizedPhone = raw;
    console.log("🔹 [3] Normalized Phone:", normalizedPhone);

    const endpoint = `${API_BASE_URL}/${VENDOR_UID}/contact/send-template-message`;

    const p1 = cleanParam(customerName);
    const p2 = cleanParam(String(orderId));
    const p3 = cleanParam(addressAndProduct);

    const payload = {
      phone_number: normalizedPhone,
      template_name: "1st_utillty",
      template_language: "en",
      components: [
        { type: "body", parameters: [{ type: "text", text: p1 }, { type: "text", text: p2 }, { type: "text", text: p3 }] },
      ],
      field_1: p1,
      field_2: p2,
      field_3: p3,
      contact: { first_name: p1, phone_number: normalizedPhone, country: "auto" },
    };

    console.log("🔹 [4] Target Endpoint:", endpoint);
    console.log("🔹 [5] Sending Payload:", JSON.stringify(payload));

    const saasRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await saasRes.text();
    console.log("🔹 [6] API Status:", saasRes.status);
    console.log("🔹 [7] API Body:", responseText);

    if (!saasRes.ok) {
      return res.status(500).json({ error: "SaaS API Error", status: saasRes.status, body: responseText });
    }

    return res.status(200).json({ status: "sent", api_response: responseText });
  } catch (err) {
    console.error("❌ [ERROR]:", err);
    return res.status(500).json({ error: err?.message || "internal_error" });
  }
};
