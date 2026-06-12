import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, readJson, requireApiOwner } from "@/lib/api";
import { invoiceUpdateSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const invoice = await prisma.invoice.findFirst({ where: { id, ownerId: auth.owner.id }, include: { member: true, payments: true } });
  if (!invoice) return jsonError("Invoice not found", 404);
  return NextResponse.json(invoice);
}

export async function PUT(request: Request, { params }: Params) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const body = await readJson<Record<string, unknown>>(request);
  const parsed = invoiceUpdateSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message || "Data invoice tidak valid.");
  const data = parsed.data;
  const invoice = await prisma.invoice.update({
    where: { id, ownerId: auth.owner.id },
    data: {
      amount: data.amount,
      dueDate: data.dueDate,
      status: data.status,
      notes: data.notes !== undefined ? data.notes || null : undefined,
      paidAt: data.status === "paid" ? new Date() : undefined,
    },
  });
  return NextResponse.json(invoice);
}
