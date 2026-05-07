"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { deleteStaffUser, getStaffSession, listStaffUsers, updateStaffOwnerStatus } from "@/lib/auth/server";
import { createStaffInviteUrl } from "@/lib/auth/staff-invite";
import { getStaffSignupSecret } from "@/lib/auth/staff-invite-server";
import { APP_NAME } from "@/lib/config";

export type StaffInviteActionState = {
  email?: string;
  error?: string;
  expiresInHours?: number;
  inviteEmailHref?: string;
  inviteUrl?: string;
};

function getBaseUrlFromHeaders(headersList: Awaited<ReturnType<typeof headers>>) {
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host");

  if (!host) {
    return null;
  }

  const protocol =
    headersList.get("x-forwarded-proto") ??
    (process.env.NODE_ENV === "development" ? "http" : "https");

  return `${protocol}://${host}`;
}

export async function createStaffInviteFromSettingsAction(
  _previousState: StaffInviteActionState,
  formData: FormData
): Promise<StaffInviteActionState> {
  const session = await getStaffSession();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const expiresInHours = Number(String(formData.get("expiresInHours") ?? "24"));

  if (!session.isAuthenticated || !session.isAdmin) {
    return {
      email,
      expiresInHours,
      error: "Only signed-in administrators can create staff invites.",
    };
  }

  const signupSecret = getStaffSignupSecret();

  if (!signupSecret) {
    return {
      email,
      expiresInHours,
      error: "STAFF_SIGNUP_SECRET is not configured on the server.",
    };
  }

  if (!email || !email.includes("@")) {
    return {
      email,
      expiresInHours,
      error: "Enter a valid email address.",
    };
  }

  if (!Number.isFinite(expiresInHours) || expiresInHours <= 0 || expiresInHours > 168) {
    return {
      email,
      expiresInHours,
      error: "Expiry must be between 1 and 168 hours.",
    };
  }

  const baseUrl = getBaseUrlFromHeaders(await headers());

  if (!baseUrl) {
    return {
      email,
      expiresInHours,
      error: "Could not determine the application URL for this request.",
    };
  }

  const expiresAt = new Date(
    Date.now() + expiresInHours * 60 * 60 * 1000
  ).toISOString();

  const inviteUrl = createStaffInviteUrl({
    baseUrl,
    payload: {
      email,
      expiresAt,
      role: "staff",
    },
    secret: signupSecret,
  });

  const subject = encodeURIComponent(`Your ${APP_NAME} staff invite`);
  const body = encodeURIComponent(
    [
      `You have been invited to create a staff account for ${APP_NAME}.`,
      "",
      "Use this secure signup link to finish setup:",
      inviteUrl,
      "",
      `This link expires in ${expiresInHours} hour${expiresInHours === 1 ? "" : "s"}.`,
    ].join("\n")
  );

  return {
    email,
    expiresInHours,
    inviteEmailHref: `mailto:${encodeURIComponent(email)}?subject=${subject}&body=${body}`,
    inviteUrl,
  };
}

export async function removeStaffUserAction(username: string) {
  const session = await getStaffSession();
  const staffUsers = await listStaffUsers();
  const ownerUsers = staffUsers.filter((user) => user.isOwner);
  const ownerExists = ownerUsers.length > 0;

  if (!session.isAuthenticated || !session.isAdmin) {
    throw new Error("Only signed-in administrators can remove staff users.");
  }

  if (ownerExists && !session.isOwner) {
    throw new Error("Only owners can remove staff users.");
  }

  if (!username) {
    throw new Error("A valid staff user is required.");
  }

  const currentEmail = session.email?.trim().toLowerCase();

  if (currentEmail && currentEmail === username.trim().toLowerCase()) {
    throw new Error("You cannot remove the account you are currently using.");
  }

  const targetUser = staffUsers.find((user) => user.username === username);

  if (targetUser?.isOwner && ownerUsers.length <= 1) {
    throw new Error("You cannot remove the last remaining owner.");
  }

  await deleteStaffUser(username);
  revalidatePath("/admin/settings");
}

export async function setStaffOwnerStatusAction(username: string, isOwner: boolean) {
  const session = await getStaffSession();
  const staffUsers = await listStaffUsers();
  const ownerUsers = staffUsers.filter((user) => user.isOwner);
  const ownerExists = ownerUsers.length > 0;

  if (!session.isAuthenticated || !session.isAdmin) {
    throw new Error("Only signed-in administrators can update owner access.");
  }

  if (ownerExists && !session.isOwner) {
    throw new Error("Only owners can update owner access.");
  }

  if (!username) {
    throw new Error("A valid staff user is required.");
  }

  const currentEmail = session.email?.trim().toLowerCase();
  const targetUser = staffUsers.find((user) => user.username === username);
  const targetIdentity = (targetUser?.email ?? username).trim().toLowerCase();

  if (!isOwner && targetUser?.isOwner && ownerUsers.length <= 1) {
    throw new Error("You cannot demote the last remaining owner.");
  }

  if (!isOwner && currentEmail && currentEmail === targetIdentity && ownerUsers.length <= 1) {
    throw new Error("You cannot demote yourself as the last remaining owner.");
  }

  await updateStaffOwnerStatus({
    isOwner,
    username,
  });

  revalidatePath("/admin/settings");
}
