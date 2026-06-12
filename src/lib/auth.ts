import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import type { User } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

function ownerIdentity(user: User) {
  const email = user.email?.trim() || `${user.id}@owner.local`;
  const name =
    (typeof user.user_metadata?.name === "string" && user.user_metadata.name) ||
    (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
    email.split("@")[0] ||
    "Owner";

  return { email, name };
}

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function ensureOwnerForUser(user: User) {
  const { email, name } = ownerIdentity(user);
  try {
    return await prisma.owner.upsert({
      where: { id: user.id },
      update: { email, name },
      create: { id: user.id, email, name },
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
    const existingOwner = await prisma.owner.findFirst({
      where: { OR: [{ id: user.id }, { email }] },
    });
    if (existingOwner) {
      try {
        return await prisma.owner.update({
          where: { id: existingOwner.id },
          data: { name },
        });
      } catch (updateError) {
        if (isUniqueConstraintError(updateError)) return existingOwner;
        throw updateError;
      }
    }
    throw error;
  }
}

export async function requireOwner() {
  const user = await requireUser();
  return ensureOwnerForUser(user);
}
