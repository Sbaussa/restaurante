const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// ═══════════════════════════════════════════════════════
// MARCAS
// ═══════════════════════════════════════════════════════

const getBrands = async (req, res) => {
  const brands = await prisma.beerBrand.findMany({
    include: { beers: { where: { active: true } } },
    orderBy: { name: "asc" },
  });
  res.json(brands);
};

const createBrand = async (req, res) => {
  const { name, imageUrl } = req.body;
  try {
    const brand = await prisma.beerBrand.create({ data: { name, imageUrl } });
    res.status(201).json(brand);
  } catch (err) {
    res.status(400).json({ message: "Error al crear marca", error: err.message });
  }
};

// ═══════════════════════════════════════════════════════
// CERVEZAS (presentaciones por marca)
// ═══════════════════════════════════════════════════════

const getBeers = async (req, res) => {
  const { brandId, active } = req.query;
  const where = {};
  if (brandId) where.brandId = Number(brandId);
  if (active !== undefined) where.active = active === "true";

  const beers = await prisma.beer.findMany({
    where,
    include: { brand: true },
    orderBy: [{ brand: { name: "asc" } }, { presentation: "asc" }],
  });
  res.json(beers);
};

const createBeer = async (req, res) => {
  const { brandId, presentation, unitPrice, stock, minStock } = req.body;
  try {
    const beer = await prisma.beer.create({
      data: {
        brandId: Number(brandId),
        presentation,
        unitPrice: Number(unitPrice),
        stock: Number(stock || 0),
        minStock: Number(minStock || 10),
      },
      include: { brand: true },
    });
    res.status(201).json(beer);
  } catch (err) {
    res.status(400).json({ message: "Error al crear cerveza", error: err.message });
  }
};

const updateBeer = async (req, res) => {
  const { unitPrice, stock, minStock, active } = req.body;
  try {
    const beer = await prisma.beer.update({
      where: { id: Number(req.params.id) },
      data: { unitPrice: Number(unitPrice), stock: Number(stock), minStock: Number(minStock), active },
      include: { brand: true },
    });
    res.json(beer);
  } catch (err) {
    res.status(400).json({ message: "Error al actualizar", error: err.message });
  }
};

// ═══════════════════════════════════════════════════════
// VENTAS DE CERVEZA
// ═══════════════════════════════════════════════════════

const getSales = async (req, res) => {
  const { date } = req.query;
  const where = {};
  if (date) {
    const start = new Date(date);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);
    where.createdAt = { gte: start, lt: end };
  }

  const sales = await prisma.beerSale.findMany({
    where,
    include: {
      items: { include: { beer: { include: { brand: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(sales);
};

const createSale = async (req, res) => {
  // items: [{ beerId, quantity }]
  const { items, notes } = req.body;

  try {
    // Obtener precios actuales
    const beerIds = items.map((i) => i.beerId);
    const beers = await prisma.beer.findMany({ where: { id: { in: beerIds } } });
    const beerMap = Object.fromEntries(beers.map((b) => [b.id, b]));

    let total = 0;
    const saleItems = items.map(({ beerId, quantity }) => {
      const beer = beerMap[beerId];
      if (!beer) throw new Error(`Cerveza ${beerId} no existe`);
      if (beer.stock < quantity) throw new Error(`Stock insuficiente de ${beer.presentation}`);
      const unitPrice = beer.unitPrice;
      total += unitPrice * quantity;
      return { beerId, quantity, unitPrice };
    });

    // Crear venta y descontar stock en transacción
    const sale = await prisma.$transaction(async (tx) => {
      const newSale = await tx.beerSale.create({
        data: {
          total,
          userId: req.user.id,
          notes: notes || null,
          items: { create: saleItems },
        },
        include: { items: { include: { beer: { include: { brand: true } } } } },
      });

      // Descontar stock y registrar movimiento
      for (const { beerId, quantity } of saleItems) {
        await tx.beer.update({
          where: { id: beerId },
          data: { stock: { decrement: quantity } },
        });
        await tx.beerStockMovement.create({
          data: {
            beerId,
            type: "SALIDA",
            quantity,
            reason: `Venta #${newSale.id}`,
            userId: req.user.id,
          },
        });
      }

      return newSale;
    });

    res.status(201).json(sale);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ═══════════════════════════════════════════════════════
// INVENTARIO — Entrada de stock
// ═══════════════════════════════════════════════════════

const addStock = async (req, res) => {
  const { beerId, quantity, reason } = req.body;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.beer.update({
        where: { id: Number(beerId) },
        data: { stock: { increment: Number(quantity) } },
      });
      await tx.beerStockMovement.create({
        data: {
          beerId: Number(beerId),
          type: "ENTRADA",
          quantity: Number(quantity),
          reason: reason || "Entrada de inventario",
          userId: req.user.id,
        },
      });
    });
    res.json({ message: "Stock actualizado" });
  } catch (err) {
    res.status(400).json({ message: "Error al actualizar stock", error: err.message });
  }
};

const getStockMovements = async (req, res) => {
  const movements = await prisma.beerStockMovement.findMany({
    include: { beer: { include: { brand: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  res.json(movements);
};

// ═══════════════════════════════════════════════════════
// STATS DE CERVEZA para el dashboard
// ═══════════════════════════════════════════════════════

const getBeerStats = async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [totalSalesToday, revenueToday, lowStock] = await Promise.all([
    prisma.beerSale.count({ where: { createdAt: { gte: today, lt: tomorrow } } }),
    prisma.beerSale.aggregate({
      where: { createdAt: { gte: today, lt: tomorrow } },
      _sum: { total: true },
    }),
    prisma.beer.findMany({
      where: { active: true, stock: { lte: prisma.beer.fields.minStock } },
      include: { brand: true },
    }),
  ]);

  // Top marcas vendidas hoy
  const topItems = await prisma.beerSaleItem.groupBy({
    by: ["beerId"],
    where: { sale: { createdAt: { gte: today, lt: tomorrow } } },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 5,
  });

  const beerIds = topItems.map((i) => i.beerId);
  const beers = await prisma.beer.findMany({
    where: { id: { in: beerIds } },
    include: { brand: true },
  });
  const beerMap = Object.fromEntries(beers.map((b) => [b.id, b]));

  const topBeers = topItems.map((item) => ({
    ...beerMap[item.beerId],
    totalSold: item._sum.quantity,
  }));

  res.json({
    totalSalesToday,
    revenueToday: revenueToday._sum.total || 0,
    lowStockCount: lowStock.length,
    lowStockItems: lowStock,
    topBeers,
  });
};

module.exports = {
  getBrands, createBrand,
  getBeers, createBeer, updateBeer,
  getSales, createSale,
  addStock, getStockMovements,
  getBeerStats,
};