import express from "express";

import { userauthenticate } from "../middlewares/authenticate.js";
import {
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../controller/notificationController.js";

const router = express.Router();

// This user's notifications (?unread=true, ?limit=)
router.get("/", userauthenticate, getMyNotifications);

// Must precede /:id/read or the literal is read as an id.
router.patch("/read-all", userauthenticate, markAllNotificationsRead);

router.patch("/:id/read", userauthenticate, markNotificationRead);

export default router;
