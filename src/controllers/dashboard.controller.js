const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function buildDateRange(query) {
  const { date, from, to } = query;

  if (from && to) {
    const start = new Date(from);
    start.setHours(0, 0, 0, 0);
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  const base = date ? new Date(date) : new Date();
  base.setHours(0, 0, 0, 0);
  const end = new Date(base);
  end.setHours(23, 59, 59, 999);
  return { start: base, end };
}

// GET /api/dashboard/stats
const getStats = async (req, res) => {
  const { start, end } = buildDateRange(req.query);

  const [totalOrders, totalRevenue, pendingOrders, topProducts] = await Promise.all([
    prisma.order.count({
      where: { createdAt: { gte: start, lte: end }, status: { not: "CANCELLED" } },
    }),
    prisma.order.aggregate({
      where: { createdAt: { gte: start, lte: end }, status: { not: "CANCELLED" } },
      _sum: { total: true },
    }),
    prisma.order.count({ where: { status: { in: ["PENDING", "PREPARING"] } } }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: { order: { createdAt: { gte: start, lte: end }, status: { not: "CANCELLED" } } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
  ]);

  const productIds = topProducts.map((p) => p.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, price: true },
  });
  const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

  res.json({
    totalOrders,
    totalRevenue: totalRevenue._sum.total || 0,
    pendingOrders,
    topProducts: topProducts.map((item) => ({
      ...productMap[item.productId],
      totalSold: item._sum.quantity,
    })),
    dateRange: { from: start, to: end },
  });
};

// GET /api/dashboard/sales-by-hour
const getSalesByHour = async (req, res) => {
  const { start, end } = buildDateRange(req.query);

  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: start, lte: end }, status: { not: "CANCELLED" } },
    select: { total: true, createdAt: true },
  });

  const byHour = Array.from({ length: 24 }, (_, h) => ({ hour: h, revenue: 0, orders: 0 }));
  orders.forEach((o) => {
    const h = new Date(o.createdAt).getHours();
    byHour[h].revenue += o.total;
    byHour[h].orders += 1;
  });

  res.json(byHour.filter((h) => h.hour >= 8 && h.hour <= 23));
};

module.exports = { getStats, getSalesByHour };