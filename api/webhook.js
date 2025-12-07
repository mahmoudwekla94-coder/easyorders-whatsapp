export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).send("Webhook Running ✅");
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const data = req.body;

    const customerName = data.full_name || data.name || data.customer_name || "عميلنا العزيز";
    const customerPhone = data.phone || data.phone_alt || data.customer_phone || "";
    const orderId = data.short_id || data.order_id || data.id || "";
    const address = data.address || data.government || "";

    const cleanParam = (text) => {
      if (!text) return "";
      return text.toString().replace(/[\r\n\t]+/g, " ").trim();
    };

    let raw = customerPhone.toString().replace(/[^0-9]/g, "");

    if (raw.startsWith("05") && raw.length === 10) raw = "966" + raw.substring(1);
    else if (raw.startsWith("01") && raw.length === 11) raw = "20" + raw.substring(1);
    else if (raw.startsWith("09") && raw.length === 10) raw = "249" + raw.substring(1);
    else if (raw.startsWith("7") && raw.length === 9) raw = "967" + raw;

    const normalizedPhone = raw;

    const API_BASE_URL = process.env.SAAS_API_BASE_URL;
    const VENDOR_UID = process.env.SAAS_VENDOR_UID;
    const API_TOKEN = process.env.SAAS_API_TOKEN;

    if (!API_BASE_URL || !VENDOR_UID || !API_TOKEN) {
      console.error("Missing Environment Variables");
      return res.status(500).json({ error: "missing_env" });
    }

    const payload = {
      phone_number: normalizedPhone,
      template_name: "order_confirmation",
      template_language: "en",
      field_1: cleanParam(customerName),
      field_2: cleanParam(String(orderId)),
      field_3: cleanParam(address),
      contact: {
        first_name: cleanParam(customerName),
        phone_number: normalizedPhone,
        country: "auto"
      }
    };

    const endpoint = ${API_BASE_URL}/${VENDOR_UID}/contact/send-template-message;

    const saasRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": Bearer ${API_TOKEN},
      },
      body: JSON.stringify(payload),
    });

    const responseData = await saasRes.json().catch(() => null);

    if (!saasRes.ok) {
      console.error("SaaS API Error:", responseData);
      return res.status(500).json({ error: "saas_api_error", details: responseData });
    }

    return res.status(200).json({ status: "sent", data: responseData });

  } catch (err) {
    console.error("Webhook Error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
}
