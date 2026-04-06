const router = require("express").Router();
const { getStats, getSalesByHour } = require("../controllers/dashboard.controller");
const { authMiddleware } = require("../middlewares/auth.middleware");

router.get("/stats", authMiddleware, getStats);
router.get("/sales-by-hour", authMiddleware, getSalesByHour);

module.exports = router;
