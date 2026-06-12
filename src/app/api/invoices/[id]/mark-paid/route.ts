import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiOwner } from "@/lib/api";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const invoice = await prisma.invoice.findFirstOrThrow({ where: { id, ownerId: auth.owner.id } });
  const result = await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        invoiceId: invoice.id,
        memberId: invoice.memberId,
        amount: invoice.amount,
        paymentMethod: "transfer_bank",
        status: "accepted",
        verifiedAt: new Date(),
        verifiedBy: auth.owner.id,
        notes: "Ditandai lunas manual melalui API.",
      },
    });
    return tx.invoice.update({ where: { id: invoice.id }, data: { status: "paid", paidAt: new Date() } });
  });
  return NextResponse.json(result);
}
