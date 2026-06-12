export const MEMBER_STATUSES = ["active", "suspended", "inactive"] as const;
export const INVOICE_STATUSES = ["unpaid", "pending_verification", "paid", "overdue", "cancelled"] as const;
export const PAYMENT_STATUSES = ["pending_verification", "accepted", "rejected"] as const;
export const PAYMENT_METHODS = ["transfer_bank", "qris"] as const;
export const MESSAGE_CHANNELS = ["email", "whatsapp"] as const;

export type MemberStatus = (typeof MEMBER_STATUSES)[number];
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type MessageChannel = (typeof MESSAGE_CHANNELS)[number];

export const STATUS_LABELS: Record<string, string> = {
  active: "Aktif",
  suspended: "Suspend",
  inactive: "Nonaktif",
  unpaid: "Belum Bayar",
  pending_verification: "Menunggu Verifikasi",
  paid: "Sudah Bayar",
  overdue: "Terlambat",
  cancelled: "Dibatalkan",
  accepted: "Diterima",
  rejected: "Ditolak",
};

export const TEMPLATE_TYPES = [
  "invoice_email",
  "invoice_whatsapp",
  "reminder_email",
  "reminder_whatsapp",
  "payment_accepted_email",
  "payment_accepted_whatsapp",
] as const;
