import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAllowedProofFile } from "@/lib/billing";
import { jsonError } from "@/lib/api";
import { uploadPrivateFile } from "@/lib/storage";
import { publicProofSchema } from "@/lib/validators";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invoice = await prisma.invoice.findUnique({ where: { paymentToken: token } });
  if (!invoice) return jsonError("Token pembayaran tidak valid.", 404);
  if (["paid", "cancelled"].includes(invoice.status)) return jsonError("Invoice ini tidak menerima upload bukti baru.");

  const formData = await request.formData();
  const proof = formData.get("proof");
  if (!(proof instanceof File) || proof.size === 0) return jsonError("Bukti pembayaran wajib diupload.");
  if (!isAllowedProofFile(proof)) return jsonError("Format file harus JPG, PNG, atau PDF.");
  if (proof.size > 5 * 1024 * 1024) return jsonError("Ukuran file maksimal 5 MB.");
  const parsed = publicProofSchema.safeParse({
    token,
    payerName: String(formData.get("payerName") || ""),
    paymentMethod: String(formData.get("paymentMethod") || "transfer_bank"),
    notes: String(formData.get("notes") || ""),
  });
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message || "Data pembayaran tidak valid.");

  let proofFileUrl: string;
  try {
    proofFileUrl = await uploadPrivateFile(process.env.STORAGE_BUCKET_PAYMENT_PROOFS || "payment-proofs", proof, invoice.ownerId);
  } catch {
    return jsonError("Upload bukti gagal. Coba ulangi beberapa saat lagi.", 500);
  }
  const payment = await prisma.$transaction(async (tx) => {
    const created = await tx.payment.create({
      data: {
        invoiceId: invoice.id,
        memberId: invoice.memberId,
        amount: invoice.amount,
        paymentMethod: parsed.data.paymentMethod,
        payerName: parsed.data.payerName || null,
        proofFileUrl,
        status: "pending_verification",
        notes: parsed.data.notes || null,
      },
    });
    await tx.invoice.update({ where: { id: invoice.id }, data: { status: "pending_verification" } });
    return created;
  });

  return NextResponse.json(payment, { status: 201 });
}
