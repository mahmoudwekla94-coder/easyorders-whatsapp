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

    // {{3}} → Address - Product - Qty - Price
    let addressAndProduct = address || "";
    if (productName) {
      addressAndProduct += (addressAndProduct ? " - " : "") + productName;
    }
    if (quantity != null) {
      addressAndProduct += ` - Qty: ${quantity}`;
    }
    if (price !== "") {
      addressAndProduct +
