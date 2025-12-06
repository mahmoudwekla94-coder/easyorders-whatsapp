const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(bodyParser.json());

// استقبال الطلب من EasyOrders
app.post("/webhook", async (req, res) => {
    try {
        const data = req.body;

        console.log("New Order Received:", data);

        // بيانات العميل من EasyOrders
        const customerName = data?.customer?.name || "عميل";
        const customerPhone = data?.customer?.phone || "";
        const orderId = data?.order_id || "";
        const totalPrice = data?.total || "";

        // رقم الواتساب من API Cloud
        const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
        const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID;

        // رسالة واتساب
        const messageText = `👋 أهلاً ${customerName}!\nتم استلام طلبك رقم *${orderId}*.\nإجمالي المبلغ: *${totalPrice}* ريال.\nسيتواصل معك فريقنا قريباً ❤️`;

        // إرسال رسالة واتساب
        await axios.post(
            `https://graph.facebook.com/v17.0/${WHATSAPP_PHONE_ID}/messages`,
            {
                messaging_product: "whatsapp",
                to: customerPhone,
                text: { body: messageText }
            },
            {
                headers: {
                    Authorization: `Bearer ${WHATSAPP_TOKEN}`,
                    "Content-Type": "application/json"
                }
            }
        );

        res.status(200).json({ success: true });
    } catch (error) {
        console.error("Error:", error.response?.data || error);
        res.status(500).json({ error: "Error sending WhatsApp message" });
    }
});

// تشغيل السيرفر
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
