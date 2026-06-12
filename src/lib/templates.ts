import { absoluteUrl } from "@/lib/utils";
import { formatCurrency, formatDate, formatPeriod } from "@/lib/format";

type TemplateInvoice = {
  invoiceNumber: string;
  periodMonth: number;
  periodYear: number;
  amount: unknown;
  dueDate: Date;
  paymentToken: string;
  member: {
    name: string;
    phoneWa: string;
    email: string;
  };
  owner?: {
    name: string;
    phone?: string | null;
  };
};

export const DEFAULT_TEMPLATES = {
  invoice_email: {
    name: "Email tagihan",
    subject: "Tagihan Langganan {{periode}} - {{nomor_invoice}}",
    body: `Halo {{nama_member}},

Tagihan langganan Anda untuk periode {{periode}} sudah tersedia.

Nomor Invoice: {{nomor_invoice}}
Nominal: {{nominal}}
Jatuh Tempo: {{tanggal_jatuh_tempo}}

Silakan melakukan pembayaran melalui link berikut:
{{link_pembayaran}}

Terima kasih.`,
  },
  invoice_whatsapp: {
    name: "WhatsApp tagihan",
    subject: null,
    body: `Halo {{nama_member}}, tagihan langganan Anda untuk periode {{periode}} sudah tersedia.

Nomor Invoice: {{nomor_invoice}}
Nominal: {{nominal}}
Jatuh Tempo: {{tanggal_jatuh_tempo}}

Silakan bayar melalui link berikut:
{{link_pembayaran}}

Terima kasih.`,
  },
  reminder_email: {
    name: "Email reminder",
    subject: "Reminder Tagihan {{periode}} - {{nomor_invoice}}",
    body: "Halo {{nama_member}}, ini pengingat untuk tagihan {{nomor_invoice}} sebesar {{nominal}} yang jatuh tempo pada {{tanggal_jatuh_tempo}}. Link pembayaran: {{link_pembayaran}}",
  },
  reminder_whatsapp: {
    name: "WhatsApp reminder",
    subject: null,
    body: "Halo {{nama_member}}, ini pengingat tagihan {{periode}} sebesar {{nominal}}. Link pembayaran: {{link_pembayaran}}",
  },
  payment_accepted_email: {
    name: "Email pembayaran diterima",
    subject: "Pembayaran diterima - {{nomor_invoice}}",
    body: "Halo {{nama_member}}, pembayaran untuk invoice {{nomor_invoice}} sudah kami terima. Terima kasih.",
  },
  payment_accepted_whatsapp: {
    name: "WhatsApp pembayaran diterima",
    subject: null,
    body: "Halo {{nama_member}}, pembayaran untuk invoice {{nomor_invoice}} sudah kami terima. Terima kasih.",
  },
} as const;

export function buildTemplateVariables(invoice: TemplateInvoice) {
  return {
    nama_member: invoice.member.name,
    periode: formatPeriod(invoice.periodMonth, invoice.periodYear),
    nomor_invoice: invoice.invoiceNumber,
    nominal: formatCurrency(invoice.amount as number),
    tanggal_jatuh_tempo: formatDate(invoice.dueDate),
    link_pembayaran: absoluteUrl(`/pay/${invoice.paymentToken}`),
    nama_owner: invoice.owner?.name ?? "Owner",
    nomor_wa_owner: invoice.owner?.phone ?? "",
  };
}

export function renderTemplate(template: string, variables: Record<string, string>) {
  return Object.entries(variables).reduce(
    (message, [key, value]) => message.replaceAll(`{{${key}}}`, value),
    template,
  );
}

export function buildWhatsAppLink(phone: string, message: string) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
