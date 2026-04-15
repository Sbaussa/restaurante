require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const http    = require("http");
const { Server } = require("socket.io");

const authRoutes      = require("./src/routes/auth.routes");
const productRoutes   = require("./src/routes/product.routes");
const orderRoutes     = require("./src/routes/order.routes");
const dashboardRoutes = require("./src/routes/dashboard.routes");
const categoryRoutes  = require("./src/routes/category.routes");
const printRoutes     = require("./src/routes/print.routes");
const tableRoutes     = require("./src/routes/table.routes");
const cashRoutes      = require("./src/routes/cash.routes");
const { router: pushRoutes } = require("./src/routes/push.routes");

const app    = express();
const server = http.createServer(app);
const PORT   = process.env.PORT || 3002;

const io = new Server(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL || "http://localhost:5173",
      "https://restaurante-frontend-xi.vercel.app",
    ],
    methods: ["GET", "POST"],
  },
});

app.use((req, res, next) => { req.io = io; next(); });

io.on("connection", (socket) => {
  console.log("Cliente conectado:", socket.id);
  socket.on("disconnect", () => console.log("Cliente desconectado:", socket.id));
});

app.use(cors({
  origin: [
    process.env.FRONTEND_URL || "http://localhost:5173",
    "https://restaurante-frontend-xi.vercel.app",
  ],
  credentials: true,
}));
app.use(express.json());

app.use("/api/auth",      authRoutes);
app.use("/api/products",  productRoutes);
app.use("/api/orders",    orderRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/categories",categoryRoutes);
app.use("/api/print",     printRoutes);
app.use("/api/tables",    tableRoutes);
app.use("/api/cash",      cashRoutes);
app.use("/api/push",      pushRoutes);

// ── RUTA TEMPORAL — borrar duplicados de productos ──
app.delete("/api/admin/clear-duplicate-products", async (req, res) => {
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const products = await prisma.product.findMany({ orderBy: { id: "asc" } });
    const seen = {};
    const toDelete = [];
    products.forEach((p) => {
      const key = `${p.name}-${p.categoryId}`;
      if (seen[key]) toDelete.push(p.id);
      else seen[key] = true;
    });

    // Solo borra los que no tienen orderItems asociados
    const withOrders = await prisma.orderItem.findMany({
      where: { productId: { in: toDelete } },
      select: { productId: true },
    });
    const withOrderIds = new Set(withOrders.map((o) => o.productId));
    const safeToDelete = toDelete.filter((id) => !withOrderIds.has(id));

    await prisma.product.deleteMany({ where: { id: { in: safeToDelete } } });
    res.json({
      message: `${safeToDelete.length} duplicados eliminados`,
      skipped: toDelete.length - safeToDelete.length,
      deleted: safeToDelete,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// ───────────────────────────────────────────────────

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || "Error interno del servidor",
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});

