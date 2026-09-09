import { and, desc, eq, isNull } from "drizzle-orm";

import db from "../config/db.js";
import { notifications } from "../../drizzle/schema.js";

// ─── GET /api/v1/notifications ────────────────────────────────────────────────
// The signed-in user's notifications, newest first. `?unread=true` narrows to
// the ones they have not opened yet.
export const getMyNotifications = async (req, res, next) => {
  try {
    const filters = [eq(notifications.userId, req.user.id)];

    if (req.query.unread === "true") {
      filters.push(isNull(notifications.readAt));
    }

    const rows = await db
      .select()
      .from(notifications)
      .where(and(...filters))
      .orderBy(desc(notifications.createdAt))
      .limit(Math.min(Number(req.query.limit) || 50, 200));

    return res.status(200).json({
      success: true,
      notifications: rows,
      unreadCount: rows.filter((row) => !row.readAt).length,
    });
  } catch (error) {
    next(error);
  }
};

// ─── PATCH /api/v1/notifications/:id/read ─────────────────────────────────────
export const markNotificationRead = async (req, res, next) => {
  try {
    const [updated] = await db
      .update(notifications)
      .set({ readAt: new Date().toISOString(), status: "read" })
      .where(
        and(
          eq(notifications.id, req.params.id),
          // Scoping the update to the caller is what stops one user marking
          // another's notifications read.
          eq(notifications.userId, req.user.id)
        )
      )
      .returning();

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.status(200).json({ success: true, notification: updated });
  } catch (error) {
    next(error);
  }
};

// ─── PATCH /api/v1/notifications/read-all ─────────────────────────────────────
export const markAllNotificationsRead = async (req, res, next) => {
  try {
    const updated = await db
      .update(notifications)
      .set({ readAt: new Date().toISOString(), status: "read" })
      .where(and(eq(notifications.userId, req.user.id), isNull(notifications.readAt)))
      .returning({ id: notifications.id });

    return res.status(200).json({
      success: true,
      message: `${updated.length} notification(s) marked read`,
    });
  } catch (error) {
    next(error);
  }
};
