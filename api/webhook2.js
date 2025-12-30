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

    let addressAndProduct = address || "";
    if (productName) addressAndProduct += (addressAndProduct ? " - " : "") + productName;
    if (quantity != null) addressAndProduct += ` - Qty: ${quantity}`;
    if (price !== "") addressAndProduct += ` - Price: ${price}`;

    const cleanParam = (text) =>
      (text ? text.toString().replace(/[\r\n\t]+/g, " ").trim() : "");

    let raw = customerPhone.toString().replace(/[^0-9]/g, "");
    if (raw.startsWith("05") && raw.length === 10) raw = "966" + raw.substring(1);
    else if (raw.startsWith("01") && raw.length === 11) raw = "20" + raw.substring(1);
    else if (raw.startsWith("09") && raw.length === 10) raw = "249" + raw.substring(1);
    else if (raw.startsWith("7") && raw.length === 9) raw = "967" + raw;

    const normalizedPhone = raw;
    console.log("📞 Normalized Phone:", normalizedPhone);

    const API_BASE_URL = process.env.SAAS_API_BASE_URL;
    const VENDOR_UID = process.env.SAAS_VENDOR_UID;
    const API_TOKEN = process.env.SAAS_API_TOKEN;

    if (!API_BASE_URL || !VENDOR_UID || !API_TOKEN) {
      console.error("❌ Missing Environment Variables");
      return res.status(500).json({ error: "missing_env" });
    }

    const endpoint = `${API_BASE_URL}/${VENDOR_UID}/contact/send-template-message`;

    const basePayload = {
      phone_number: normalizedPhone,
      template_name: "1st_utillty",
      field_1: cleanParam(customerName),
      field_2: cleanParam(`${orderId} ${storeTag}`.trim()),
      field_3: cleanParam(addressAndProduct),
      contact: {
        first_name: cleanParam(customerName),
        phone_number: normalizedPhone,
        country: "auto",
      },
    };

    const trySend = async (lang) => {
      const payload = { ...basePayload, template_language: lang };
      console.log("🚀 Sending to SaaS:", endpoint, payload);

      const r = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_TOKEN}`,
        },
        body: JSON.stringify(payload),
      });

      const j = await r.json().catch(() => null);
      return { ok: r.ok, data: j, lang };
    };

    // ✅ نجرب en_US ثم en
    const firstTry = await trySend("en_US");
    if (firstTry.ok) {
      console.log("✅ SaaS Response (webhook2):", firstTry.data);
      return res.status(200).json({ status: "sent", lang: firstTry.lang, data: firstTry.data });
    }

    const secondTry = await trySend("en");
    if (secondTry.ok) {
      console.log("✅ SaaS Response (webhook2):", secondTry.data);
      return res.status(200).json({ status: "sent", lang: secondTry.lang, data: secondTry.data });
    }

    console.error("❌ SaaS API Error:", firstTry.data || secondTry.data);
    return res.status(500).json({
      error: "saas_api_error",
      tried: ["en_US", "en"],
      details: firstTry.data || secondTry.data,
    });
  } catch (err) {
    console.error("❌ Webhook2 Error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
}

module.exports = webhook;
