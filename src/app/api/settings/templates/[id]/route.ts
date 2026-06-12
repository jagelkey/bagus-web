import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readJson, requireApiOwner } from "@/lib/api";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const body = await readJson<{ name?: string; subject?: string; body?: string; isActive?: boolean }>(request);
  const template = await prisma.messageTemplate.update({
    where: { id, ownerId: auth.owner.id },
    data: {
      name: body.name,
      subject: body.subject,
      body: body.body,
      isActive: body.isActive,
    },
  });
  return NextResponse.json(template);
}
