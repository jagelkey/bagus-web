import { z } from "zod";
import { INVOICE_STATUSES, MEMBER_STATUSES, PAYMENT_METHODS } from "@/lib/constants";

export const packageSchema = z.object({
  name: z.string().min(2, "Nama paket wajib diisi."),
  price: z.coerce.number().min(0, "Harga tidak valid."),
  billingCycle: z.enum(["monthly", "yearly", "custom"]).default("monthly"),
  description: z.string().optional(),
  isActive: z.coerce.boolean().default(true),
});

export const memberSchema = z.object({
  name: z.string().min(2, "Nama member wajib diisi."),
  email: z.string().email("Email tidak valid."),
  phoneWa: z.string().min(8, "Nomor WhatsApp tidak valid."),
  businessName: z.string().optional(),
  playConsoleEmail: z.string().email("Email akses tidak valid.").optional().or(z.literal("")),
  packageId: z.string().uuid().optional().or(z.literal("")),
  monthlyPrice: z.coerce.number().min(0, "Harga bulanan tidak valid."),
  billingDueDay: z.coerce.number().int().min(1).max(31),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional().or(z.literal("")),
  status: z.enum(MEMBER_STATUSES),
  notes: z.string().optional(),
});

export const invoiceSchema = z.object({
  memberId: z.string().uuid(),
  periodMonth: z.coerce.number().int().min(1).max(12),
  periodYear: z.coerce.number().int().min(2020).max(2100),
  amount: z.coerce.number().min(0).optional(),
  dueDate: z.coerce.date().optional().or(z.literal("")),
  notes: z.string().optional(),
});

export const paymentSettingSchema = z.object({
  bankName: z.string().min(2, "Nama bank wajib diisi."),
  bankAccountNumber: z.string().min(3, "Nomor rekening wajib diisi."),
  bankAccountHolder: z.string().min(2, "Atas nama rekening wajib diisi."),
  whatsappConfirmationNumber: z.string().min(8, "Nomor WhatsApp owner wajib diisi."),
  paymentInstruction: z.string().optional(),
});

export const publicProofSchema = z.object({
  token: z.string().min(10),
  payerName: z.string().optional(),
  paymentMethod: z.enum(PAYMENT_METHODS),
  notes: z.string().optional(),
});

export const packageUpdateSchema = packageSchema.partial();

export const memberUpdateSchema = memberSchema.partial();

export const invoiceUpdateSchema = z.object({
  amount: z.coerce.number().min(0, "Nominal tidak valid.").optional(),
  dueDate: z.coerce.date().optional(),
  status: z.enum(INVOICE_STATUSES).optional(),
  notes: z.string().optional().nullable(),
});

export const paymentSettingUpdateSchema = paymentSettingSchema.partial().extend({
  qrisImageUrl: z.string().optional().nullable(),
});
