// api/webhook2.js

async function webhook(req, res) {
  // ✅ Health Check
  if (req.method === "GET") {
    return res.status(200).send("Webhook2 Running ✅");
  }

  // ✅ Allow only POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const data = req.body || {};

    // 🏪 Store Tag from URL ?storeTag=EQ
    const storeTagRaw = (req.query && req.query.storeTag) || "";
    const storeTag = storeTagRaw ? `[${storeTagRaw}]` : "";
    console.log("🏪 Store Tag:", storeTagRaw || "NO_TAG");

    // -------------------------
    // 1) Customer & Order Data
    // -------------------------
    const customerName =
      data.full_name || data.name || data.customer_name || "Customer";

    const customerPhone =
      data.phone || data.phone_alt || data.customer_phone || "";

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

    // {{3}} Address - Product - Qty - Price
    let addressAndProduct = address || "";
    if (productName) {
      addressAndProduct += (addressAndProduct ? " - " : "") + productName;
    }
    if (quantity != null) {
      addressAndProduct += ` - Qty: ${quantity}`;
    }
    if (price !== "") {
      addressAndProduct += ` - Price: ${price}`;
    }

    const cleanParam = (text) =>
      text ? text.toString().replace(/[\r\n\t]+/g, " ").trim() : "";

    // -------------------------
    // 2) Normalize Phone
    // -------------------------
    let raw = customerPhone.toString().replace(/[^0-9]/g, "");

    if (raw.startsWith("05") && raw.length === 10) raw = "966" + raw.substring(1);
    else if (raw.startsWith("01") && raw.length === 11) raw = "20" + raw.substring(1);
    else if (raw.startsWith("09") && raw.length === 10) raw = "249" + raw.substring(1);
    else if (raw.startsWith("7") && raw.length === 9) raw = "967" + raw;

    const normalizedPhone = raw;
    console.log("📞 Normalized Phone:", normalizedPhone);

    // -------------------------
    // 3) ENV (Paramedics)
    // -------------------------
    const API_BASE_URL = process.env.SAAS_API_BASE_URL; // https://paramedics.cloud/api
    const VENDOR_UID = process.env.SAAS_VENDOR_UID;     // 2c6464de-695d-4af5-8373-63fa8cdb5d4c.
    const API_TOKEN = process.env.SAAS_API_TOKEN;       // zZMiDx6PcdwQJeFY3SMb6rUUGABkkwIrwThskNItIQPjSKy160CsJXOIIJkxVSo6

    if (!API_BASE_URL || !VENDOR_UID || !API_TOKEN) {
      console.error("❌ Missing Environment Variables");
      return res.status(500).json({ error: "missing_env" });
    }

    // -------------------------
    // 4) Template Payload
    // -------------------------
    const payload = {
      phone_number: normalizedPhone,
      template_name: "1st_utillty",
      template_language: "en_US",
      field_1: cleanParam(customerName),                    // {{1}}
      field_2: cleanParam(`${orderId} ${storeTag}`.trim()), // {{2}}
      field_3: cleanParam(addressAndProduct),               // {{3}}
      contact: {
        first_name: cleanParam(customerName),
        phone_number: normalizedPhone,
        country: "auto",
      },
    };

    // ✅ IMPORTANT: token in URL
    const endpoint =
      `${API_BASE_URL}/${VENDOR_UID}/contact/send-template-message?token=${API_TOKEN}`;

    console.log("🚀 Sending to SaaS:", endpoint, payload);

    const saasRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseData = await saasRes.json().catch(() => null);

    if (!saasRes.ok) {
      console.error("❌ SaaS API Error:", responseData);
      return res.status(500).json({
        error: "saas_api_error",
        details: responseData,
      });
    }

    console.log("✅ SaaS Response (webhook2):", responseData);
    return res.status(200).json({ status: "sent", data: responseData });
  } catch (err) {
    console.error("❌ Webhook2 Error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
}

module.exports = webhook;
