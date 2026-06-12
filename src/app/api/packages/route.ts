import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, readJson, requireApiOwner } from "@/lib/api";
import { packageSchema } from "@/lib/validators";

export async function GET() {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;
  const packages = await prisma.package.findMany({ where: { ownerId: auth.owner.id }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(packages);
}

export async function POST(request: Request) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;
  const body = await readJson<{ name?: string; price?: number; billingCycle?: string; description?: string; isActive?: boolean }>(request);
  const parsed = packageSchema.safeParse({
    ...body,
    isActive: body.isActive ?? true,
  });
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message || "Data paket tidak valid.");
  const data = parsed.data;
  const item = await prisma.package.create({
    data: {
      ownerId: auth.owner.id,
      name: data.name,
      price: data.price,
      billingCycle: data.billingCycle,
      description: data.description || null,
      isActive: data.isActive,
    },
  });
  return NextResponse.json(item, { status: 201 });
}
