const router = require("express").Router();
const { getAll, getById, create, update, remove } = require("../controllers/product.controller");
const { authMiddleware, requireRole } = require("../middlewares/auth.middleware");

router.get("/", authMiddleware, getAll);
router.get("/:id", authMiddleware, getById);
router.post("/", authMiddleware, requireRole("ADMIN"), create);
router.put("/:id", authMiddleware, requireRole("ADMIN"), update);
router.delete("/:id", authMiddleware, requireRole("ADMIN"), remove);

module.exports = router;
