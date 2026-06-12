import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, readJson, requireApiOwner } from "@/lib/api";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const body = await readJson<{ notes?: string }>(request);
  const payment = await prisma.payment.findFirstOrThrow({ where: { id, invoice: { ownerId: auth.owner.id } }, include: { invoice: true } });
  if (payment.status !== "pending_verification") return jsonError("Pembayaran ini sudah diproses.", 409);
  if (payment.invoice.status === "cancelled") return jsonError("Invoice sudah dibatalkan.", 409);

  const result = await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: "accepted", verifiedAt: new Date(), verifiedBy: auth.owner.id, notes: body.notes || payment.notes },
    });
    const invoice = await tx.invoice.update({ where: { id: payment.invoiceId }, data: { status: "paid", paidAt: new Date() } });
    await tx.activityLog.create({
      data: {
        ownerId: auth.owner.id,
        action: "payment_verified",
        entityType: "payment",
        entityId: payment.id,
        description: `Pembayaran invoice ${payment.invoice.invoiceNumber} diverifikasi melalui API.`,
      },
    });
    return invoice;
  });
  return NextResponse.json(result);
}
