const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");
const {
    getNotifications,
    markAsRead,
    markAllAsRead,
    dismissNotification
} = require("../controllers/notificationController");

// All notification routes require authentication
router.use(requireAuth);

router.get("/", getNotifications);
router.patch("/read-all", markAllAsRead);
router.patch("/:id/read", markAsRead);
router.patch("/:id/dismiss", dismissNotification);

module.exports = router;
