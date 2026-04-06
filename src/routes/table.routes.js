const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");
const { authMiddleware } = require("../middlewares/auth.middleware");

const prisma = new PrismaClient();

// GET /api/tables — estado de todas las mesas
router.get("/", authMiddleware, async (req, res) => {
  // Pedidos activos con mesa asignada
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

  // Número de mesas configuradas
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