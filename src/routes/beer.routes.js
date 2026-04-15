const router = require("express").Router();
const {
  getBrands, createBrand,
  getBeers, createBeer, updateBeer,
  getSales, createSale,
  addStock, getStockMovements,
  getBeerStats,
} = require("../controllers/beer.controller");
const { authMiddleware, requireRole } = require("../middlewares/auth.middleware");

// Marcas
router.get("/brands", authMiddleware, getBrands);
router.post("/brands", authMiddleware, requireRole("ADMIN"), createBrand);

// Cervezas (presentaciones)
router.get("/", authMiddleware, getBeers);
router.post("/", authMiddleware, requireRole("ADMIN"), createBeer);
router.put("/:id", authMiddleware, requireRole("ADMIN"), updateBeer);

// Ventas
router.get("/sales", authMiddleware, getSales);
router.post("/sales", authMiddleware, createSale);

// Inventario
router.post("/stock/add", authMiddleware, addStock);
router.get("/stock/movements", authMiddleware, getStockMovements);

// Stats
router.get("/stats", authMiddleware, getBeerStats);

module.exports = router;