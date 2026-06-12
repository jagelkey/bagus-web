import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, readJson, requireApiOwner } from "@/lib/api";
import { packageUpdateSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const body = await readJson<Record<string, unknown>>(request);
  const parsed = packageUpdateSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message || "Data paket tidak valid.");
  const data = parsed.data;
  const item = await prisma.package.update({
    where: { id, ownerId: auth.owner.id },
    data: {
      name: data.name,
      price: data.price,
      billingCycle: data.billingCycle,
      description: data.description !== undefined ? data.description || null : undefined,
      isActive: data.isActive,
    },
  });
  return NextResponse.json(item);
}

export async function DELETE(_: Request, { params }: Params) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  await prisma.package.update({ where: { id, ownerId: auth.owner.id }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}
