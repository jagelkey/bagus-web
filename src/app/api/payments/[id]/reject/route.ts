import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readJson, requireApiOwner } from "@/lib/api";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const body = await readJson<{ notes?: string }>(request);
  const payment = await prisma.payment.findFirstOrThrow({ where: { id, invoice: { ownerId: auth.owner.id } }, include: { invoice: true } });
  const result = await prisma.$transaction(async (tx) => {
    const rejected = await tx.payment.update({
      where: { id: payment.id },
      data: { status: "rejected", verifiedAt: new Date(), verifiedBy: auth.owner.id, notes: body.notes || "Pembayaran ditolak." },
    });
    await tx.invoice.update({ where: { id: payment.invoiceId }, data: { status: "unpaid" } });
    await tx.activityLog.create({
      data: {
        ownerId: auth.owner.id,
        action: "payment_rejected",
        entityType: "payment",
        entityId: payment.id,
        description: `Pembayaran invoice ${payment.invoice.invoiceNumber} ditolak melalui API.`,
      },
    });
    return rejected;
  });
  return NextResponse.json(result);
}
