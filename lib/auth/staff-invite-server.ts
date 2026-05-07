import { createHmac } from "node:crypto";

function readServerEnv(name: "STAFF_SIGNUP_SECRET" | "ADMIN_BOOTSTRAP_SECRET") {
  return process.env[name]?.trim() || null;
}

export function getStaffSignupSecret() {
  return readServerEnv("STAFF_SIGNUP_SECRET");
}

export function getAdminBootstrapSecret() {
  return readServerEnv("ADMIN_BOOTSTRAP_SECRET");
}

export function getSecretFingerprint(secret: string) {
  return createHmac("sha256", secret).update("fingerprint").digest("hex").slice(0, 8);
}
