export const USERNAME_DOMAIN = "cognilearn.local";

export function normalizeUsername(input: string) {
  return input.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
}

/** Accepts a username or a full email and returns the address to authenticate with. */
export function toLoginEmail(input: string) {
  const v = input.trim();
  if (v.includes("@")) return v.toLowerCase();
  return `${normalizeUsername(v)}@${USERNAME_DOMAIN}`;
}

/** Friendly label for an account address. */
export function displayUsername(email?: string | null) {
  if (!email) return "";
  return email.endsWith(`@${USERNAME_DOMAIN}`) ? email.split("@")[0] : email;
}
