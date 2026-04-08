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

const getStats = async (req, res) => {
  const { start, end } = buildDateRange(req.query);

  const diff      = end - start;
  const prevStart = new Date(start - diff - 1);
  const prevEnd   = new Date(start - 1);

  const [
    totalOrders, totalRevenue, pendingOrders, topProducts,
    cancelledOrders, prevRevenue, paymentMethods, recentOrders, categorySales,
  ] = await Promise.all([
    prisma.order.count({
      where: { createdAt: { gte: start, lte: end }, status: "DELIVERED" },
    }),
    prisma.order.aggregate({
      where: { createdAt: { gte: start, lte: end }, status: "DELIVERED" },
      _sum: { total: true },
    }),
    prisma.order.count({
      where: { status: { in: ["PENDING", "PREPARING"] } },
    }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: { order: { createdAt: { gte: start, lte: end }, status: "DELIVERED" } },
      _sum:    { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
    prisma.order.count({
      where: { createdAt: { gte: start, lte: end }, status: "CANCELLED" },
    }),
    prisma.order.aggregate({
      where: { createdAt: { gte: prevStart, lte: prevEnd }, status: "DELIVERED" },
      _sum: { total: true },
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
    prisma.order.findMany({
      where: { createdAt: { gte: start, lte: end } },
      include: {
        items: { include: { product: true } },
        user:  { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: { order: { createdAt: { gte: start, lte: end }, status: "DELIVERED" } },
      _sum: { quantity: true },
    }),
  ]);

  const productIds = topProducts.map((p) => p.productId);
  const products   = await prisma.product.findMany({
    where:  { id: { in: productIds } },
    select: { id: true, name: true, price: true },
  });
  const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

  const allProductIds = categorySales.map((p) => p.productId);
  const allProducts   = await prisma.product.findMany({
    where:   { id: { in: allProductIds } },
    include: { category: true },
  });
  const catMap = {};
  categorySales.forEach((item) => {
    const prod    = allProducts.find((p) => p.id === item.productId);
    const catName = prod?.category?.name || "Sin categoría";
    if (!catMap[catName]) catMap[catName] = 0;
    catMap[catName] += item._sum.quantity || 0;
  });
  const categoryRanking = Object.entries(catMap)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const revenue       = totalRevenue._sum.total || 0;
  const prevRev       = prevRevenue._sum.total  || 0;
  const revenueChange = prevRev > 0 ? ((revenue - prevRev) / prevRev) * 100 : null;
  const avgTicket     = totalOrders > 0 ? revenue / totalOrders : 0;

  res.json({
    totalOrders,
    totalRevenue:    revenue,
    pendingOrders,
    cancelledOrders,
    avgTicket,
    revenueChange,
    topProducts: topProducts.map((item) => ({
      ...productMap[item.productId],
      totalSold: item._sum.quantity,
    })),
    paymentMethods,
    recentOrders,
    categoryRanking,
    dateRange: { from: start, to: end },
  });
};

const getSalesByHour = async (req, res) => {
  const { start, end } = buildDateRange(req.query);

  const orders = await prisma.order.findMany({
    where:  { createdAt: { gte: start, lte: end }, status: "DELIVERED" },
    select: { total: true, createdAt: true },
  });

  const byHour = Array.from({ length: 24 }, (_, h) => ({ hour: h, revenue: 0, orders: 0 }));
  orders.forEach((o) => {
    const h = new Date(o.createdAt).getHours();
    byHour[h].revenue += o.total;
    byHour[h].orders  += 1;
  });

  res.json(byHour.filter((h) => h.hour >= 8 && h.hour <= 23));
};

module.exports = { getStats, getSalesByHour };