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

const app    = express();
const server = http.createServer(app);
const PORT   = process.env.PORT || 3002;

// ─── Socket.io ───────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL || "http://localhost:5173",
      "https://restaurante-frontend-xi.vercel.app",
    ],
    methods: ["GET", "POST"],
  },
});

app.use((req, res, next) => {
  req.io = io;
  next();
});

io.on("connection", (socket) => {
  console.log("Cliente conectado:", socket.id);
  socket.on("disconnect", () => {
    console.log("Cliente desconectado:", socket.id);
  });
});

// ─── Middlewares globales ────────────────────────────────
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || "http://localhost:5173",
    "https://restaurante-frontend-xi.vercel.app",
  ],
}));
app.use(express.json());

// ─── Rutas ───────────────────────────────────────────────
app.use("/api/auth",      authRoutes);
app.use("/api/products",  productRoutes);
app.use("/api/orders",    orderRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/categories",categoryRoutes);
app.use("/api/print",     printRoutes);
app.use("/api/tables",    tableRoutes);
app.use("/api/cash",      cashRoutes);

// Verificar enum Role
const { PrismaClient } = require("@prisma/client");
const prisma2 = new PrismaClient();
prisma2.$queryRaw`SELECT enum_range(NULL::"Role")`.then(r => {
  console.log("Enum Role en DB:", JSON.stringify(r));
}).catch(e => console.error("Error enum:", e.message));

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