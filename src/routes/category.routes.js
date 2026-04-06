const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");
const { authMiddleware, requireRole } = require("../middlewares/auth.middleware");

const prisma = new PrismaClient();

// GET /api/categories
router.get("/", authMiddleware, async (req, res) => {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
  res.json(categories);
});

// POST /api/categories
router.post("/", authMiddleware, requireRole("ADMIN"), async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: "El nombre es requerido" });
  try {
    const category = await prisma.category.create({ data: { name: name.trim() } });
    res.status(201).json(category);
  } catch (err) {
    res.status(400).json({ message: "Ya existe una categoría con ese nombre" });
  }
});

// PUT /api/categories/:id
router.put("/:id", authMiddleware, requireRole("ADMIN"), async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: "El nombre es requerido" });
  try {
    const category = await prisma.category.update({
      where: { id: Number(req.params.id) },
      data: { name: name.trim() },
    });
    res.json(category);
  } catch (err) {
    res.status(400).json({ message: "Error al actualizar categoría" });
  }
});

// DELETE /api/categories/:id
router.delete("/:id", authMiddleware, requireRole("ADMIN"), async (req, res) => {
  try {
    await prisma.category.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: "Categoría eliminada" });
  } catch (err) {
    res.status(400).json({ message: "No se puede eliminar: tiene productos asociados" });
  }
});

module.exports = router;