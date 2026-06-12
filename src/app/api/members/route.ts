import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeWhatsApp } from "@/lib/billing";
import { jsonError, readJson, requireApiOwner } from "@/lib/api";
import { memberSchema } from "@/lib/validators";

type MemberPayload = {
  name?: string;
  email?: string;
  phoneWa?: string;
  businessName?: string;
  playConsoleEmail?: string;
  packageId?: string;
  monthlyPrice?: number;
  billingDueDay?: number;
  startDate?: string;
  endDate?: string;
  status?: string;
  notes?: string;
};

export async function GET(request: Request) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;
  const url = new URL(request.url);
  const q = url.searchParams.get("q") || undefined;
  const status = url.searchParams.get("status") || undefined;
  const members = await prisma.member.findMany({
    where: {
      ownerId: auth.owner.id,
      ...(status ? { status } : {}),
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {}),
    },
    include: { package: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(members);
}

export async function POST(request: Request) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;
  const body = await readJson<MemberPayload>(request);
  const parsed = memberSchema.safeParse({
    ...body,
    status: body.status || "active",
    monthlyPrice: body.monthlyPrice ?? 0,
    billingDueDay: body.billingDueDay ?? 10,
    startDate: body.startDate || new Date(),
  });
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message || "Data member tidak valid.");
  const data = parsed.data;
  if (data.packageId) {
    const selectedPackage = await prisma.package.findFirst({
      where: { id: data.packageId, ownerId: auth.owner.id },
      select: { id: true },
    });
    if (!selectedPackage) return jsonError("Paket member tidak valid.");
  }

  const member = await prisma.member.create({
    data: {
      ownerId: auth.owner.id,
      name: data.name,
      email: data.email,
      phoneWa: normalizeWhatsApp(data.phoneWa),
      businessName: data.businessName || null,
      playConsoleEmail: data.playConsoleEmail || null,
      packageId: data.packageId || null,
      monthlyPrice: data.monthlyPrice,
      billingDueDay: data.billingDueDay,
      startDate: data.startDate,
      endDate: data.endDate === "" ? null : data.endDate,
      status: data.status,
      notes: data.notes || null,
    },
  });
  return NextResponse.json(member, { status: 201 });
}
