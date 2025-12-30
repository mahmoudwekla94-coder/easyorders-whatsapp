export default function handler(req, res) {
  // Health check
  if (req.method === "GET") {
    return res.status(200).json({ ok: true, message: "Webhook2 Running ✅" });
  }

  // Allow only POST
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  return res.status(200).json({
    ok: true,
    message: "POST received ✅",
    body: req.body,
  });
}
