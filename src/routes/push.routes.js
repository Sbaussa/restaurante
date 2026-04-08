const router = require("express").Router();
const { authMiddleware } = require("../middlewares/auth.middleware");
const webpush = require("web-push");

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const subscriptions = new Map(); // userId -> subscription

// POST /api/push/subscribe
router.post("/subscribe", authMiddleware, (req, res) => {
  const { subscription } = req.body;
  subscriptions.set(req.user.id, subscription);
  console.log(`Usuario ${req.user.id} suscrito a push`);
  res.json({ message: "Suscrito correctamente" });
});

// POST /api/push/unsubscribe
router.post("/unsubscribe", authMiddleware, (req, res) => {
  subscriptions.delete(req.user.id);
  res.json({ message: "Desuscrito" });
});

// Notifica a un usuario específico por ID
const notifyUser = async (userId, payload) => {
  const sub = subscriptions.get(userId);
  if (!sub) return;
  try {
    await webpush.sendNotification(sub, JSON.stringify(payload));
  } catch (err) {
    console.error(`Error push usuario ${userId}:`, err.message);
    if (err.statusCode === 410) subscriptions.delete(userId);
  }
};

// Notifica a todos los usuarios de un rol
const notifyRole = async (roles, payload) => {
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const users = await prisma.user.findMany({
      where: { role: { in: roles } },
      select: { id: true },
    });
    for (const user of users) {
      await notifyUser(user.id, payload);
    }
  } finally {
    await prisma.$disconnect();
  }
};

module.exports = { router, notifyRole, notifyUser };