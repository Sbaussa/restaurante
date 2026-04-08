const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getAll = async (req, res) => {
  const { status, date } = req.query;
  const where = {};
  if (status) where.status = status;
  if (date) {
    const start = new Date(date);
    const end   = new Date(date);
    end.setDate(end.getDate() + 1);
    where.createdAt = { gte: start, lt: end };
  }
  const orders = await prisma.order.findMany({
    where,
    include: {
      items: { include: { product: true } },
      user:  { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(orders);
};

const getById = async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      items: { include: { product: { include: { category: true } } } },
      user:  { select: { id: true, name: true } },
    },
  });
  if (!order) return res.status(404).json({ message: "Pedido no encontrado" });
  res.json(order);
};

const create = async (req, res) => {
  const { tableNumber, items, notes } = req.body;
  try {
    const productIds = items.map((i) => i.productId);
    const products   = await prisma.product.findMany({ where: { id: { in: productIds } } });
    const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

    let total = 0;
    const orderItems = items.map(({ productId, quantity }) => {
      const product = productMap[productId];
      if (!product) throw new Error(`Producto ${productId} no existe`);
      const unitPrice = product.price;
      total += unitPrice * quantity;
      return { productId, quantity, unitPrice };
    });

    const order = await prisma.order.create({
      data: {
        total,
        tableNumber: tableNumber || null,
        notes:       notes || null,
        userId:      req.user.id,
        items: { create: orderItems },
      },
      include: { items: { include: { product: true } } },
    });

    req.io.emit("order:new", order);

    // Notifica a cocina
    try {
      const { notifyRole } = require("../routes/push.routes");
      await notifyRole(["KITCHEN", "ADMIN"], {
        title: `🍳 Nuevo pedido #${order.id}`,
        body:  order.tableNumber ? `Mesa ${order.tableNumber}` : "Para llevar",
        icon:  "/iconoweb.ico",
      });
    } catch {}

    res.status(201).json(order);
  } catch (err) {
    console.error("Error crear pedido:", err.message);
    res.status(400).json({ message: "Error al crear pedido", error: err.message });
  }
};

const updateStatus = async (req, res) => {
  const { status } = req.body;
  try {
    const order = await prisma.order.update({
      where: { id: Number(req.params.id) },
      data:  { status },
      include: {
        items: { include: { product: true } },
        user:  { select: { id: true, name: true } },
      },
    });

    req.io.emit("order:updated", order);

    // Notifica al mesero que creó el pedido cuando está listo
    if (status === "READY") {
      try {
        const { notifyUser } = require("../routes/push.routes");
        await notifyUser(order.userId, {
          title: `🔔 Pedido #${order.id} listo`,
          body:  order.tableNumber
            ? `Mesa ${order.tableNumber} — listo para entregar`
            : "Para llevar — listo para entregar",
          icon:  "/iconoweb.ico",
        });
      } catch {}
    }

    res.json(order);
  } catch (err) {
    console.error("Error actualizar estado:", err.message);
    res.status(400).json({ message: "Error al actualizar estado", error: err.message });
  }
};

const updatePayment = async (req, res) => {
  const { paymentMethod, cashGiven, cashChange } = req.body;
  try {
    const order = await prisma.order.update({
      where: { id: Number(req.params.id) },
      data:  { paymentMethod, cashGiven, cashChange },
      include: {
        items: { include: { product: true } },
        user:  { select: { id: true, name: true } },
      },
    });
    res.json(order);
  } catch (err) {
    res.status(400).json({ message: "Error al guardar pago", error: err.message });
  }
};

module.exports = { getAll, getById, create, updateStatus, updatePayment };