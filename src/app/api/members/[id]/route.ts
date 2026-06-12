import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeWhatsApp } from "@/lib/billing";
import { jsonError, readJson, requireApiOwner } from "@/lib/api";
import { memberUpdateSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const member = await prisma.member.findFirst({ where: { id, ownerId: auth.owner.id }, include: { package: true } });
  if (!member) return jsonError("Member not found", 404);
  return NextResponse.json(member);
}

export async function PUT(request: Request, { params }: Params) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const body = await readJson<Record<string, unknown>>(request);
  const parsed = memberUpdateSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message || "Data member tidak valid.");
  const data = parsed.data;
  const member = await prisma.member.update({
    where: { id, ownerId: auth.owner.id },
    data: {
      name: data.name,
      email: data.email,
      phoneWa: data.phoneWa ? normalizeWhatsApp(data.phoneWa) : undefined,
      businessName: data.businessName !== undefined ? data.businessName || null : undefined,
      playConsoleEmail: data.playConsoleEmail !== undefined ? data.playConsoleEmail || null : undefined,
      packageId: data.packageId !== undefined ? data.packageId || null : undefined,
      monthlyPrice: data.monthlyPrice,
      billingDueDay: data.billingDueDay,
      startDate: data.startDate,
      endDate: data.endDate === "" ? null : data.endDate,
      status: data.status,
      notes: data.notes !== undefined ? data.notes || null : undefined,
    },
  });
  return NextResponse.json(member);
}

export async function DELETE(_: Request, { params }: Params) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  await prisma.member.update({ where: { id, ownerId: auth.owner.id }, data: { status: "inactive" } });
  return NextResponse.json({ ok: true });
}
