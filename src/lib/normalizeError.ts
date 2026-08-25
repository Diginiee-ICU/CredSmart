export function normalizeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  try {
    return String(err);
  } catch (_) {
    return "Unknown error";
  }
}
