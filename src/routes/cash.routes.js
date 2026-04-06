const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");
const { authMiddleware } = require("../middlewares/auth.middleware");

const prisma = new PrismaClient();

router.get("/", authMiddleware, async (req, res) => {
  const date  = req.query.date || new Date().toISOString().split("T")[0];
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  const [delivered, cancelled, paymentBreakdown, topProducts] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: start, lte: end }, status: "DELIVERED" },
      include: {
        items: { include: { product: { include: { category: true } } } },
        user:  { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.order.count({
      where: { createdAt: { gte: start, lte: end }, status: "CANCELLED" },
    }),
    prisma.order.groupBy({
      by: ["paymentMethod"],
      where: {
        createdAt: { gte: start, lte: end },
        status: "DELIVERED",
        paymentMethod: { not: null },
      },
      _sum:   { total: true },
      _count: true,
    }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: { order: { createdAt: { gte: start, lte: end }, status: "DELIVERED" } },
      _sum:     { quantity: true },
      orderBy:  { _sum: { quantity: "desc" } },
      take: 5,
    }),
  ]);

  const productIds = topProducts.map((p) => p.productId);
  const products   = await prisma.product.findMany({
    where:  { id: { in: productIds } },
    select: { id: true, name: true },
  });
  const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

  const totalRevenue = delivered.reduce((sum, o) => sum + o.total, 0);
  const avgTicket    = delivered.length > 0 ? totalRevenue / delivered.length : 0;

  res.json({
    date,
    totalOrders:     delivered.length,
    totalRevenue,
    avgTicket,
    cancelledOrders: cancelled,
    paymentBreakdown,
    topProducts: topProducts.map((item) => ({
      ...productMap[item.productId],
      totalSold: item._sum.quantity,
    })),
    orders: delivered,
  });
});

module.exports = router;