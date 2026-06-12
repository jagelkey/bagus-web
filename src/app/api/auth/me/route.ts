import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ user: null, owner: null }, { status: 401 });
  }

  const owner = await prisma.owner.findUnique({ where: { id: user.id } });
  return NextResponse.json({ user, owner });
}
