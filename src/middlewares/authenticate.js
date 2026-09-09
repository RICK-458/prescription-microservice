import { getAuth, clerkClient } from "@clerk/express";
import { eq } from "drizzle-orm";
import db from "../config/db.js";
import { users } from "../../drizzle/schema.js";

const userColumns = {
  id: users.id,
  clerkId: users.clerkId,
  name: users.name,
  email: users.email,
};

export const userauthenticate = async (req, res, next) => {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Not signed in",
      });
    }

    // Already synced? Use the row we have.
    const [existing] = await db
      .select(userColumns)
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1);

    if (existing) {
      req.user = existing;
      return next();
    }

    // First request from this Clerk user - pull their profile and create the row.
    const clerkUser = await clerkClient.users.getUser(userId);

    const fullName =
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
      "Unknown";

    const email = clerkUser.primaryEmailAddress?.emailAddress ?? null;

    
    

    const [created] = await db
      .insert(users)
      .values({
        clerkId: userId,
        name: fullName,
        email,
      })
      .returning(userColumns);

    req.user = created;
    return next();
  } catch (error) {
    next(error);
  }
};
