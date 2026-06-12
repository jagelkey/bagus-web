import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiOwner } from "@/lib/api";

export async function GET() {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;
  const templates = await prisma.messageTemplate.findMany({ where: { ownerId: auth.owner.id }, orderBy: { type: "asc" } });
  return NextResponse.json(templates);
}
