import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export function normalizeWhatsApp(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  return digits;
}

export function makePaymentToken() {
  return `inv_${randomBytes(24).toString("base64url")}`;
}

export function getDueDate(year: number, month: number, billingDueDay: number) {
  const lastDay = new Date(year, month, 0).getDate();
  const day = Math.min(Math.max(1, billingDueDay), lastDay);
  return new Date(year, month - 1, day);
}

function isInvoiceNumberCollision(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false;
  }

  const target = error.meta?.target;
  const fields = Array.isArray(target) ? target.map(String) : [String(target ?? "")];
  return fields.some((field) => field.includes("invoice_number") || field.includes("unique_owner_invoice_number"));
}

export async function nextInvoiceNumber(ownerId: string, year: number, month: number) {
  const prefix = `INV-${year}-${String(month).padStart(2, "0")}`;
  const count = await prisma.invoice.count({
    where: {
      ownerId,
      periodYear: year,
      periodMonth: month,
    },
  });
  return `${prefix}-${String(count + 1).padStart(4, "0")}`;
}

export async function createInvoiceForMember(input: {
  ownerId: string;
  memberId: string;
  periodMonth: number;
  periodYear: number;
  amount?: Prisma.Decimal | number | string;
  dueDate?: Date;
  notes?: string;
}) {
  const member = await prisma.member.findFirstOrThrow({
    where: { id: input.memberId, ownerId: input.ownerId },
  });
  const amount = input.amount ?? member.monthlyPrice;
  const dueDate = input.dueDate ?? getDueDate(input.periodYear, input.periodMonth, member.billingDueDay);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.invoice.create({
        data: {
          ownerId: input.ownerId,
          memberId: input.memberId,
          invoiceNumber: await nextInvoiceNumber(input.ownerId, input.periodYear, input.periodMonth),
          periodMonth: input.periodMonth,
          periodYear: input.periodYear,
          amount,
          dueDate,
          paymentToken: makePaymentToken(),
          notes: input.notes || null,
        },
      });
    } catch (error) {
      if (!isInvoiceNumberCollision(error) || attempt === 2) throw error;
    }
  }

  throw new Error("Invoice gagal dibuat.");
}

export async function refreshOverdueInvoices(ownerId: string) {
  await prisma.invoice.updateMany({
    where: {
      ownerId,
      status: "unpaid",
      dueDate: { lt: new Date() },
    },
    data: {
      status: "overdue",
    },
  });
}

export function isAllowedProofFile(file: File) {
  const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
  const allowedNames = [".jpg", ".jpeg", ".png", ".pdf"];
  const lowerName = file.name.toLowerCase();
  return allowedTypes.includes(file.type) || allowedNames.some((ext) => lowerName.endsWith(ext));
}
