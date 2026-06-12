import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createInvoiceForMember, refreshOverdueInvoices } from "@/lib/billing";
import { jsonError, readJson, requireApiOwner } from "@/lib/api";
import { invoiceSchema } from "@/lib/validators";

export async function GET(request: Request) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;
  await refreshOverdueInvoices(auth.owner.id);
  const url = new URL(request.url);
  const month = url.searchParams.get("month");
  const year = url.searchParams.get("year");
  const status = url.searchParams.get("status");
  const invoices = await prisma.invoice.findMany({
    where: {
      ownerId: auth.owner.id,
      ...(month ? { periodMonth: Number(month) } : {}),
      ...(year ? { periodYear: Number(year) } : {}),
      ...(status ? { status } : {}),
    },
    include: { member: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(invoices);
}

export async function POST(request: Request) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;
  const body = await readJson<{ memberId?: string; periodMonth?: number; periodYear?: number; amount?: number; dueDate?: string; notes?: string }>(request);
  const parsed = invoiceSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message || "Data invoice tidak valid.");
  const data = parsed.data;

  try {
    const invoice = await createInvoiceForMember({
      ownerId: auth.owner.id,
      memberId: data.memberId,
      periodMonth: data.periodMonth,
      periodYear: data.periodYear,
      amount: data.amount,
      dueDate: data.dueDate === "" ? undefined : data.dueDate,
      notes: data.notes,
    });
    return NextResponse.json(invoice, { status: 201 });
  } catch {
    return jsonError("Invoice gagal dibuat. Pastikan tidak duplikat untuk periode yang sama.");
  }
}
