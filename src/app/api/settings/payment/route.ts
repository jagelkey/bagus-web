import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeWhatsApp } from "@/lib/billing";
import { jsonError, readJson, requireApiOwner } from "@/lib/api";
import { paymentSettingSchema, paymentSettingUpdateSchema } from "@/lib/validators";

export async function GET() {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;
  const setting = await prisma.paymentSetting.findFirst({ where: { ownerId: auth.owner.id }, orderBy: { updatedAt: "desc" } });
  return NextResponse.json(setting);
}

export async function PUT(request: Request) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;
  const body = await readJson<{
    bankName?: string;
    bankAccountNumber?: string;
    bankAccountHolder?: string;
    whatsappConfirmationNumber?: string;
    paymentInstruction?: string;
    qrisImageUrl?: string;
  }>(request);
  const parsed = paymentSettingUpdateSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message || "Pengaturan pembayaran tidak valid.");
  const input = parsed.data;
  const existing = await prisma.paymentSetting.findFirst({ where: { ownerId: auth.owner.id } });
  if (!existing) {
    const full = paymentSettingSchema.safeParse(body);
    if (!full.success) return jsonError(full.error.issues[0]?.message || "Pengaturan pembayaran belum lengkap.");
  }
  const data = {
    ownerId: auth.owner.id,
    bankName: input.bankName || existing?.bankName || "",
    bankAccountNumber: input.bankAccountNumber || existing?.bankAccountNumber || "",
    bankAccountHolder: input.bankAccountHolder || existing?.bankAccountHolder || "",
    whatsappConfirmationNumber: normalizeWhatsApp(input.whatsappConfirmationNumber || existing?.whatsappConfirmationNumber || ""),
    paymentInstruction: input.paymentInstruction !== undefined ? input.paymentInstruction || null : existing?.paymentInstruction || null,
    qrisImageUrl: input.qrisImageUrl !== undefined ? input.qrisImageUrl || null : existing?.qrisImageUrl || null,
  };
  const setting = existing
    ? await prisma.paymentSetting.update({ where: { id: existing.id }, data })
    : await prisma.paymentSetting.create({ data });
  return NextResponse.json(setting);
}
