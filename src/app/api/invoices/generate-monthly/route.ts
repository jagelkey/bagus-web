import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createInvoiceForMember, getDueDate } from "@/lib/billing";
import { jsonError, readJson, requireApiOwner } from "@/lib/api";
import { invoiceSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;
  const now = new Date();
  const body = await readJson<{ periodMonth?: number; periodYear?: number }>(request);
  const periodMonth = body.periodMonth || now.getMonth() + 1;
  const periodYear = body.periodYear || now.getFullYear();
  const periodCheck = invoiceSchema.pick({ periodMonth: true, periodYear: true }).safeParse({ periodMonth, periodYear });
  if (!periodCheck.success) return jsonError(periodCheck.error.issues[0]?.message || "Periode invoice tidak valid.");
  const members = await prisma.member.findMany({ where: { ownerId: auth.owner.id, status: "active" } });
  let created = 0;
  let skipped = 0;

  for (const member of members) {
    try {
      await createInvoiceForMember({
        ownerId: auth.owner.id,
        memberId: member.id,
        periodMonth,
        periodYear,
        amount: member.monthlyPrice,
        dueDate: getDueDate(periodYear, periodMonth, member.billingDueDay),
      });
      created += 1;
    } catch {
      skipped += 1;
    }
  }

  return NextResponse.json({ created, skipped });
}
