const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// GET /api/orders
const getAll = async (req, res) => {
  const { status, date } = req.query;
  const where = {};
  if (status) where.status = status;
  if (date) {
    const start = new Date(date);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);
    where.createdAt = { gte: start, lt: end };
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      items: { include: { product: true } },
      user: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(orders);
};

// GET /api/orders/:id
const getById = async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      items: { include: { product: { include: { category: true } } } },
      user: { select: { id: true, name: true } },
    },
  });
  if (!order) return res.status(404).json({ message: "Pedido no encontrado" });
  res.json(order);
};

// POST /api/orders  — crea un pedido con sus items
const create = async (req, res) => {
  const { tableNumber, items } = req.body;
  // items: [{ productId, quantity }]

  try {
    // 1. Obtener precios actuales de productos
    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({ where: { id: { in: productIds } } });

    const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

    // 2. Calcular total
    let total = 0;
    const orderItems = items.map(({ productId, quantity }) => {
      const product = productMap[productId];
      if (!product) throw new Error(`Producto ${productId} no existe`);
      const unitPrice = product.price;
      total += unitPrice * quantity;
      return { productId, quantity, unitPrice };
    });

    // 3. Crear pedido + items en una transacción
    const order = await prisma.order.create({
      data: {
        total,
        tableNumber: tableNumber || null,
        userId: req.user.id,
        items: { create: orderItems },
      },
      include: { items: { include: { product: true } } },
    });

    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ message: "Error al crear pedido", error: err.message });
  }
};

// PATCH /api/orders/:id/status  — actualiza el estado
const updateStatus = async (req, res) => {
  const { status } = req.body;
  try {
    const order = await prisma.order.update({
      where: { id: Number(req.params.id) },
      data: { status },
    });
    res.json(order);
  } catch (err) {
    res.status(400).json({ message: "Error al actualizar estado", error: err.message });
  }
};

module.exports = { getAll, getById, create, updateStatus };
