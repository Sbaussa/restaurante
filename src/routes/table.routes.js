const router  = require("express").Router();
const { PrismaClient } = require("@prisma/client");
const { authMiddleware } = require("../middlewares/auth.middleware");

const prisma = new PrismaClient();

router.get("/", authMiddleware, async (req, res) => {
  // Solo pedidos activos — sin límite de fecha para no perder pedidos largos
  const activeOrders = await prisma.order.findMany({
    where: {
      tableNumber: { not: null },
      status: { in: ["PENDING", "PREPARING", "READY"] },
    },
    include: {
      items: { include: { product: true } },
      user:  { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalTables = Number(process.env.TOTAL_TABLES) || 12;

  const tables = Array.from({ length: totalTables }, (_, i) => {
    const tableNumber = i + 1;
    const order = activeOrders.find((o) => o.tableNumber === tableNumber);
    return {
      number: tableNumber,
      status: order
        ? order.status === "READY" ? "ready" : "occupied"
        : "free",
      order: order || null,
    };
  });

  res.json(tables);
});

module.exports = router;