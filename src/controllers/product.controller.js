const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// GET /api/products
const getAll = async (req, res) => {
  const { categoryId, available } = req.query;
  const where = {};
  if (categoryId) where.categoryId = Number(categoryId);
  if (available !== undefined) where.available = available === "true";

  const products = await prisma.product.findMany({
    where,
    include: { category: true },
    orderBy: { name: "asc" },
  });
  res.json(products);
};

// GET /api/products/:id
const getById = async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: Number(req.params.id) },
    include: { category: true },
  });
  if (!product) return res.status(404).json({ message: "Producto no encontrado" });
  res.json(product);
};

// POST /api/products
const create = async (req, res) => {
  const { name, price, stock, categoryId, imageUrl } = req.body;
  try {
    const product = await prisma.product.create({
      data: { name, price: Number(price), stock: Number(stock), categoryId: Number(categoryId), imageUrl },
      include: { category: true },
    });
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ message: "Error al crear producto", error: err.message });
  }
};

// PUT /api/products/:id
const update = async (req, res) => {
  const { name, price, stock, available, categoryId, imageUrl } = req.body;
  try {
    const product = await prisma.product.update({
      where: { id: Number(req.params.id) },
      data: { name, price: Number(price), stock: Number(stock), available, categoryId: Number(categoryId), imageUrl },
      include: { category: true },
    });
    res.json(product);
  } catch (err) {
    res.status(400).json({ message: "Error al actualizar producto", error: err.message });
  }
};

// DELETE /api/products/:id
const remove = async (req, res) => {
  try {
    await prisma.product.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: "Producto eliminado" });
  } catch (err) {
    res.status(400).json({ message: "Error al eliminar producto", error: err.message });
  }
};

module.exports = { getAll, getById, create, update, remove };
