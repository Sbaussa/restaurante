const router = require("express").Router();
const { getAll, getById, create, updateStatus, updatePayment } = require("../controllers/order.controller");
const { authMiddleware } = require("../middlewares/auth.middleware");

router.get("/",                authMiddleware, getAll);
router.get("/:id",             authMiddleware, getById);
router.post("/",               authMiddleware, create);
router.patch("/:id/status",    authMiddleware, updateStatus);
router.patch("/:id/payment",   authMiddleware, updatePayment);

module.exports = router;