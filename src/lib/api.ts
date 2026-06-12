import { NextResponse } from "next/server";
import { ensureOwnerForUser, getCurrentUser } from "@/lib/auth";

export async function requireApiOwner() {
  const user = await getCurrentUser();
  if (!user) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const owner = await ensureOwnerForUser(user);

  return { owner };
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function readJson<T>(request: Request) {
  try {
    return (await request.json()) as T;
  } catch {
    return {} as T;
  }
}
