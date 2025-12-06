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
        data.full_name ||
        data.name ||
        data.customer_name ||
        data.customer?.name ||
        "عميلنا العزيز";

      let rawPhone =
        data.phone ||
        data.customer_phone ||
        data.customer?.phone ||
        "";

      const orderId = data.short_id || data.order_id || data.id || "";
      const totalPrice = data.total_cost || data.total_price || data.total || "";

      if (!rawPhone) {
        return res.status(400).json({ error: "missing_phone" });
      }

      // إزالة أي رموز غير الأرقام
      rawPhone = rawPhone.toString().replace(/[^0-9]/g, "");

      // -----------------------------
      // 🔥 دالة تحويل الرقم لصيغة دولية
      // -----------------------------
      function normalizePhone(phone) {

        // مصر 🇪🇬
        if (phone.startsWith("01")) {
          return "20" + phone.slice(1); // 20 + 1xxxxxxxxx
        }

        // السعودية 🇸🇦
        if (phone.startsWith("05")) {
          return "966" + phone.slice(1); // 9665xxxxxxxx
        }

        // الإمارات 🇦🇪
        if (phone.startsWith("05") && phone.length === 9) {
          return "971" + phone.slice(1);
        }

        // الكويت 🇰🇼
        if (phone.length === 8 && phone.startsWith("5")) {
          return "965" + phone;
        }

        // قطر 🇶🇦
        if (phone.length === 8 && phone.startsWith("5")) {
          return "974" + phone;
        }

        // لو الرقم أصلاً دولي
        if (
          phone.startsWith("20") ||
          phone.startsWith("966") ||
          phone.startsWith("971") ||
          phone.startsWith("965") ||
          phone.startsWith("974")
        ) {
          return phone;
        }

        // Default → سعودي
        return "966" + phone;
      }

      const customerPhone = normalizePhone(rawPhone);

      console.log("Normalized Phone:", customerPhone);

      // -----------------------------
      // متغيرات الواتساب
      // -----------------------------
      const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
      const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID;

      const messageText = `👋 أهلاً ${customerName}!\nتم استلام طلبك رقم *${orderId}*.\nإجمالي المبلغ: *${totalPrice}* ريال.\nشكرًا لثقتك فينا ❤️`;

      // -----------------------------
      // إرسال رسالة واتساب 🔥
      // -----------------------------
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
