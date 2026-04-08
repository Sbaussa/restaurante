const router = require("express").Router();
const { register, login, me } = require("../controllers/auth.controller");
const { authMiddleware, requireRole } = require("../middlewares/auth.middleware");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

router.post("/register", register);
router.post("/login",    login);
router.get("/me",        authMiddleware, me);

// GET /api/auth/users
router.get("/users", authMiddleware, requireRole("ADMIN"), async (req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  res.json(users);
});

// POST /api/auth/users
router.post("/users", authMiddleware, requireRole("ADMIN"), async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role)
    return res.status(400).json({ message: "Todos los campos son requeridos" });
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ message: "El email ya está registrado" });
    const hashed = await bcrypt.hash(password, 10);
    const user   = await prisma.user.create({
      data: { name, email, password: hashed, role },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    res.status(201).json(user);
  } catch (err) {
    console.error("Error crear usuario:", err.message);
    console.error("Detalle:", err);
    res.status(500).json({ message: "Error al crear usuario", detail: err.message });
  }
});

// PUT /api/auth/users/:id
router.put("/users/:id", authMiddleware, requireRole("ADMIN"), async (req, res) => {
  const { name, email, role, password } = req.body;
  try {
    const target = await prisma.user.findUnique({ where: { id: Number(req.params.id) } });
    if (target?.email === "admin@baussas.com")
      return res.status(403).json({ message: "No se puede modificar al administrador principal" });
    const data = { name, email, role };
    if (password) data.password = await bcrypt.hash(password, 10);
    const user = await prisma.user.update({
      where: { id: Number(req.params.id) },
      data,
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    res.json(user);
  } catch (err) {
    console.error("Error actualizar usuario:", err.message);
    res.status(400).json({ message: "Error al actualizar usuario" });
  }
});

// DELETE /api/auth/users/:id
router.delete("/users/:id", authMiddleware, requireRole("ADMIN"), async (req, res) => {
  try {
    if (Number(req.params.id) === req.user.id)
      return res.status(400).json({ message: "No puedes eliminarte a ti mismo" });
    const target = await prisma.user.findUnique({ where: { id: Number(req.params.id) } });
    if (target?.email === "admin@baussas.com")
      return res.status(403).json({ message: "No se puede eliminar al administrador principal" });
    await prisma.user.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: "Usuario eliminado" });
  } catch (err) {
    console.error("Error eliminar usuario:", err.message);
    res.status(400).json({ message: "Error al eliminar usuario" });
  }
});

module.exports = router;