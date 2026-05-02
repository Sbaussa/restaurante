const { PrismaClient } = require("@prisma/client");

// ── Singleton: una sola instancia en todo el proceso ──
const prisma = global.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") global.prisma = prisma;

// ── Include reutilizable para no repetir en cada query ──
const ORDER_INCLUDE = {
  items:    { include: { product: true } },
  user:     { select: { id: true, name: true } },
  delivery: true,   // ← esto faltaba en TODOS los endpoints
};

const getAll = async (req, res) => {
  const { status, date } = req.query;
  const where = {};
  if (status) where.status = status;
  if (date) {
    const start = new Date(date + "T00:00:00-05:00");
    const end   = new Date(date + "T23:59:59-05:00");
    where.createdAt = { gte: start, lte: end };
  }
  try {
    const orders = await prisma.order.findMany({
      where,
      include:  ORDER_INCLUDE,
      orderBy:  { createdAt: "desc" },
    });
    res.json(orders);
  } catch (err) {
    console.error("Error getAll:", err.code, err.message);
    res.status(503).json({ message: "Error al obtener pedidos" });
  }
};

const getById = async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where:   { id: Number(req.params.id) },
      include: {
        items:    { include: { product: { include: { category: true } } } },
        user:     { select: { id: true, name: true } },
        delivery: true,
      },
    });
    if (!order) return res.status(404).json({ message: "Pedido no encontrado" });
    res.json(order);
  } catch (err) {
    console.error("Error getById:", err.code, err.message);
    res.status(503).json({ message: "Error al obtener pedido" });
  }
};

const create = async (req, res) => {
  // ← orderType y delivery ahora se reciben del body
  const { tableNumber, items, notes, orderType, delivery } = req.body;

  try {
    const productIds = items.map((i) => i.productId);
    const products   = await prisma.product.findMany({ where: { id: { in: productIds } } });
    const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

    let total = 0;
    const orderItems = items.map(({ productId, quantity }) => {
      const product = productMap[productId];
      if (!product) throw new Error(`Producto ${productId} no existe`);
      total += product.price * quantity;
      return { productId, quantity, unitPrice: product.price };
    });

    const order = await prisma.order.create({
      data: {
        total,
        tableNumber: tableNumber || null,
        notes:       notes || null,
        userId:      req.user.id,
        orderType:   orderType || "MESA",   // ← se guarda el tipo
        items:       { create: orderItems },
        // Si es domicilio y vienen datos de entrega, se crea la relación
        ...(orderType === "DOMICILIO" && delivery
          ? {
              delivery: {
                create: {
                  address:      delivery.address,
                  customerName: delivery.customerName || null,
                  phone:        delivery.phone || null,
                },
              },
            }
          : {}),
      },
      include: ORDER_INCLUDE,
    });

    req.io.emit("order:new", order);

    try {
      const { notifyRole } = require("../routes/push.routes");
      const bodyMsg =
        orderType === "DOMICILIO"
          ? `Domicilio — ${delivery?.address || ""}`
          : orderType === "LLEVAR"
          ? "Para llevar"
          : tableNumber
          ? `Mesa ${tableNumber}`
          : "Para llevar";

      await notifyRole(["KITCHEN", "ADMIN"], {
        title: `🍳 Nuevo pedido #${order.id}`,
        body:  bodyMsg,
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
      where:   { id: Number(req.params.id) },
      data:    { status },
      include: ORDER_INCLUDE,
    });

    req.io.emit("order:updated", order);

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
      where:   { id: Number(req.params.id) },
      data:    { paymentMethod, cashGiven, cashChange },
      include: ORDER_INCLUDE,
    });
    res.json(order);
  } catch (err) {
    console.error("Error guardar pago:", err.message);
    res.status(400).json({ message: "Error al guardar pago", error: err.message });
  }
};

const updateOrder = async (req, res) => {
  const { items, notes } = req.body;
  try {
    const order = await prisma.order.findUnique({
      where: { id: Number(req.params.id) },
    });
    if (!order) return res.status(404).json({ message: "Pedido no encontrado" });
    if (["DELIVERED", "CANCELLED"].includes(order.status))
      return res.status(400).json({ message: "No se puede editar un pedido entregado o cancelado" });

    const productIds = items.map((i) => i.productId);
    const products   = await prisma.product.findMany({ where: { id: { in: productIds } } });
    const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

    let total = 0;
    const orderItems = items.map(({ productId, quantity }) => {
      const product = productMap[productId];
      if (!product) throw new Error(`Producto ${productId} no existe`);
      total += product.price * quantity;
      return { productId, quantity, unitPrice: product.price };
    });

    await prisma.orderItem.deleteMany({ where: { orderId: Number(req.params.id) } });

    const updated = await prisma.order.update({
      where:   { id: Number(req.params.id) },
      data:    {
        total,
        notes:  notes ?? order.notes,
        items:  { create: orderItems },
      },
      include: ORDER_INCLUDE,
    });

    req.io.emit("order:updated", updated);
    res.json(updated);
  } catch (err) {
    console.error("Error editar pedido:", err.message);
    res.status(400).json({ message: "Error al editar pedido", error: err.message });
  }
};

module.exports = { getAll, getById, create, updateStatus, updatePayment, updateOrder };