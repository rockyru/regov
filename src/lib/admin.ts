/** True when the value matches the operator token (ADMIN_TOKEN, at least 16 characters). */
export function isAdmin(token: unknown) {
  const want = process.env.ADMIN_TOKEN ?? "";
  return want.length >= 16 && token === want;
}
