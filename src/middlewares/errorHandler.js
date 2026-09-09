/**
 * Drizzle wraps database failures as "Failed query: <the SQL>" and hides the
 * actual reason on `err.cause` — so a duplicate key or a not-null violation
 * reaches the user as a wall of SQL that says nothing about what went wrong.
 * Prefer the cause, and translate the constraint violations people actually
 * hit into something a person can act on.
 */
const friendly = (err) => {
  const cause = err?.cause;
  const code = cause?.code ?? err?.code;

  if (code === "23505") {
    const field = (cause?.detail ?? "").match(/Key \((\w+)\)/)?.[1];
    return field
      ? `That ${field.replace(/_/g, " ")} is already registered to another account.`
      : "That value is already registered to another account.";
  }

  if (code === "23503") return "A referenced record does not exist.";
  if (code === "23502") {
    const field = (cause?.column ?? "").replace(/_/g, " ");
    return field ? `${field} is required.` : "A required field was missing.";
  }

  return cause?.message ?? err?.message ?? "Internal Server Error";
};

export const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  const statusCode =
    err.statusCode || ((err?.cause?.code ?? err?.code) === "23505" ? 409 : 500);

  res.status(statusCode).json({
    success: false,
    message: friendly(err),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
