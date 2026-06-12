import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireApiOwner } from "@/lib/api";
import { getSignedUrl } from "@/lib/storage";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const payment = await prisma.payment.findFirst({
    where: { id, invoice: { ownerId: auth.owner.id } },
    include: { invoice: true, member: true },
  });
  if (!payment) return jsonError("Payment not found", 404);
  return NextResponse.json({
    ...payment,
    proofSignedUrl: await getSignedUrl(process.env.STORAGE_BUCKET_PAYMENT_PROOFS || "payment-proofs", payment.proofFileUrl),
  });
}
