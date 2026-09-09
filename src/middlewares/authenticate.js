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

    // users.email is UNIQUE. Someone who deletes their Clerk account and signs
    // up again arrives with a new clerk_id on the same address, so a blind
    // insert fails on the constraint and locks them out of an account that is
    // genuinely theirs. Re-point the existing row at the new Clerk identity —
    // Clerk has already verified the address, so it is the same person.
    if (email) {
      const [byEmail] = await db
        .select(userColumns)
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (byEmail) {
        const [relinked] = await db
          .update(users)
          .set({ clerkId: userId, name: fullName })
          .where(eq(users.id, byEmail.id))
          .returning(userColumns);

        req.user = relinked;
        return next();
      }
    }

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
