const router = require("express").Router();
const { register, login, me } = require("../controllers/auth.controller");
const { authMiddleware, requireRole } = require("../middlewares/auth.middleware");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authMiddleware, me);

// GET /api/auth/users — solo ADMIN
router.get("/users", authMiddleware, requireRole("ADMIN"), async (req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  res.json(users);
});

// POST /api/auth/users — solo ADMIN
router.post("/users", authMiddleware, requireRole("ADMIN"), async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role)
    return res.status(400).json({ message: "Todos los campos son requeridos" });
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ message: "El email ya está registrado" });
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ message: "Error al crear usuario" });
  }
});

// PUT /api/auth/users/:id — solo ADMIN
router.put("/users/:id", authMiddleware, requireRole("ADMIN"), async (req, res) => {
  const { name, email, role, password } = req.body;
  try {
    const data = { name, email, role };
    if (password) data.password = await bcrypt.hash(password, 10);
    const user = await prisma.user.update({
      where: { id: Number(req.params.id) },
      data,
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    res.json(user);
  } catch (err) {
    res.status(400).json({ message: "Error al actualizar usuario" });
  }
});

// DELETE /api/auth/users/:id — solo ADMIN
router.delete("/users/:id", authMiddleware, requireRole("ADMIN"), async (req, res) => {
  try {
    if (Number(req.params.id) === req.user.id)
      return res.status(400).json({ message: "No puedes eliminarte a ti mismo" });
    await prisma.user.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: "Usuario eliminado" });
  } catch (err) {
    res.status(400).json({ message: "Error al eliminar usuario" });
  }
});

module.exports = router;