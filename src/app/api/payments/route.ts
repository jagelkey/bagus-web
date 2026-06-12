import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiOwner } from "@/lib/api";
import { getSignedUrl } from "@/lib/storage";
import { PAYMENT_STATUSES } from "@/lib/constants";

export async function GET(request: Request) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;
  const url = new URL(request.url);
  const rawStatus = url.searchParams.get("status");
  const status = PAYMENT_STATUSES.includes(rawStatus as (typeof PAYMENT_STATUSES)[number]) ? rawStatus || undefined : undefined;
  const payments = await prisma.payment.findMany({
    where: {
      ...(status ? { status } : {}),
      invoice: { ownerId: auth.owner.id },
    },
    include: { invoice: true, member: true },
    orderBy: { createdAt: "desc" },
  });
  const withProofLinks = await Promise.all(
    payments.map(async (payment) => ({
      ...payment,
      proofSignedUrl: await getSignedUrl(process.env.STORAGE_BUCKET_PAYMENT_PROOFS || "payment-proofs", payment.proofFileUrl),
    })),
  );
  return NextResponse.json(withProofLinks);
}
