import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiOwner } from "@/lib/api";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const invoices = await prisma.invoice.findMany({
    where: { ownerId: auth.owner.id, memberId: id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(invoices);
}
