export default async function handler(req, res) {
  // Health check
  if (req.method === "GET") {
    return res.status(200).send("EasyOrders WhatsApp middleware is running ✅");
  }

  if (req.method === "POST") {
    try {
      const data = req.body;

      console.log("Incoming EasyOrders Payload:", data);

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

      const orderId = data.order_id || data.id || "";
      const totalPrice = data.total_price || data.total || "";

      if (!customerPhone) {
        return res.status(400).json({ error: "missing_phone" });
      }

      // تنظيف الرقم
      customerPhone = customerPhone.toString().replace(/[^0-9]/g, "");
      if (!customerPhone.startsWith("966")) {
        customerPhone = "966" + customerPhone;
      }

      const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
      const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID;

      const messageText = `👋 أهلاً ${customerName}!\nتم استلام طلبك رقم *${orderId}*.\nإجمالي المبلغ: *${totalPrice}*.\nشكرًا لثقتك فينا ❤️`;

      const waRes = await fetch(
        `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_ID}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: customerPhone,
            type: "text",
            text: { body: messageText },
          }),
        }
      );

      const waData = await waRes.json();
      console.log("WhatsApp API Response:", waData);

      return res.status(200).json({ status: "sent", waData });
    } catch (err) {
      console.error("Error:", err);
      return res.status(500).json({ error: "internal_error" });
    }
  }

  res.status(405).json({ error: "Method not allowed" });
}
