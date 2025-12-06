const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.send("EasyOrders WhatsApp middleware is running ✅");
});

// Webhook من EasyOrders
app.post("/webhook", async (req, res) => {
  try {
    const data = req.body;

    console.log("Incoming EasyOrders Payload:", JSON.stringify(data, null, 2));

    // حاولنا نلم كل الأسماء المحتملة للحقول
    const customerName =
      data.name ||
      data.customer_name ||
      data.customer?.name ||
      "عميلنا العزيز";

    let customerPhone =
      data.phone ||
      data.customer_phone ||
      data.customer?.phone ||
      "";

    const orderId = data.order_id || data.id || data.orderId || "";
    const totalPrice =
      data.total_price ||
      data.total ||
      data.amount ||
      data.totalPrice ||
      "";

    if (!customerPhone) {
      console.error("No phone number in payload");
      return res.status(400).json({ error: "missing_phone" });
    }

    // تنظيف رقم الموبايل
    customerPhone = customerPhone.toString().replace(/[^0-9]/g, "");

    // لو من غير كود دولة وبيشتغل سعودية نحط 966
    if (!customerPhone.startsWith("966") && customerPhone.length <= 9) {
      customerPhone = "966" + customerPhone;
    }

    const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
    const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID;

    if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
      console.error("Missing WhatsApp env vars");
      return res.status(500).json({ error: "missing_env" });
    }

    const url = `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_ID}/messages`;

    const messageText = `👋 أهلاً ${customerName}!\nتم استلام طلبك رقم *${orderId}*.\nإجمالي المبلغ: *${totalPrice}*.\nشكرًا لثقتك فينا ❤️`;

    const payload = {
      messaging_product: "whatsapp",
      to: customerPhone,
      type: "text",
      text: { body: messageText }
    };

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${WHATSAPP_TOKEN}`
    };

    const waRes = await axios.post(url, payload, { headers });

    console.log("WhatsApp API response:", waRes.data);

    res.status(200).json({ status: "sent" });
  } catch (err) {
    console.error(
      "Error in webhook handler:",
      err.response?.data || err.message || err
    );
    res.status(500).json({ error: "internal_error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
