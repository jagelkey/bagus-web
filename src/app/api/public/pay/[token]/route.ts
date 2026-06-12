import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";
import { getSignedUrl } from "@/lib/storage";

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { paymentToken: token },
    include: { member: true },
  });
  if (!invoice) return jsonError("Token pembayaran tidak valid.", 404);
  const setting = await prisma.paymentSetting.findFirst({ where: { ownerId: invoice.ownerId }, orderBy: { updatedAt: "desc" } });
  const qrisUrl = await getSignedUrl(process.env.STORAGE_BUCKET_QRIS || "qris", setting?.qrisImageUrl);
  return NextResponse.json({
    invoice,
    paymentSetting: setting ? { ...setting, qrisSignedUrl: qrisUrl } : null,
  });
}
