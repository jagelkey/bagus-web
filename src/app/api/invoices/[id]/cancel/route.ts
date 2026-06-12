import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readJson, requireApiOwner } from "@/lib/api";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const body = await readJson<{ notes?: string }>(request);
  const invoice = await prisma.invoice.update({
    where: { id, ownerId: auth.owner.id },
    data: { status: "cancelled", notes: body.notes || undefined },
  });
  return NextResponse.json(invoice);
}
