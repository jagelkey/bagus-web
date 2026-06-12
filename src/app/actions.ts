"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/auth";
import {
  createInvoiceForMember,
  getDueDate,
  isAllowedProofFile,
  normalizeWhatsApp,
} from "@/lib/billing";
import { invoiceSchema, packageSchema, paymentSettingSchema, publicProofSchema } from "@/lib/validators";
import { DEFAULT_TEMPLATES, buildTemplateVariables, buildWhatsAppLink, renderTemplate } from "@/lib/templates";
import { getActiveMessageTemplate } from "@/lib/message-template-service";
import { sendEmail } from "@/lib/email";
import { deletePrivateFiles, uploadPrivateFile } from "@/lib/storage";
import { MEMBER_STATUSES } from "@/lib/constants";

function formString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function actionError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function safeDate(value: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function isPrismaUniqueError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function logActivity(input: {
  ownerId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  description?: string;
}) {
  await prisma.activityLog.create({
    data: {
      ownerId: input.ownerId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      description: input.description,
    },
  });
}

export async function saveOwnerProfileAction(formData: FormData) {
  const owner = await requireOwner();
  const name = formString(formData, "name");
  const phone = normalizeWhatsApp(formString(formData, "phone"));

  if (!name) {
    actionError("/dashboard/settings/profile", "Nama owner wajib diisi.");
  }

  await prisma.owner.update({
    where: { id: owner.id },
    data: {
      name,
      phone: phone || null,
    },
  });
  await logActivity({
    ownerId: owner.id,
    action: "owner_profile_updated",
    entityType: "owner",
    entityId: owner.id,
    description: "Profil owner diperbarui.",
  });

  revalidatePath("/dashboard/settings/profile");
  redirect("/dashboard/settings/profile?saved=1");
}

export async function savePackageAction(formData: FormData) {
  const owner = await requireOwner();
  const id = formString(formData, "id");
  const parsed = packageSchema.safeParse({
    name: formString(formData, "name"),
    price: formString(formData, "price"),
    billingCycle: formString(formData, "billingCycle") || "monthly",
    description: formString(formData, "description"),
    isActive: formData.get("isActive") === "on",
  });

  if (!parsed.success) {
    actionError("/dashboard/packages", parsed.error.issues[0]?.message || "Data paket tidak valid.");
  }

  const data = {
    ownerId: owner.id,
    name: parsed.data.name,
    price: parsed.data.price,
    billingCycle: parsed.data.billingCycle,
    description: parsed.data.description || null,
    isActive: parsed.data.isActive,
  };

  let packageId = id;
  if (id) {
    await prisma.package.update({
      where: { id, ownerId: owner.id },
      data,
    });
  } else {
    const created = await prisma.package.create({ data });
    packageId = created.id;
  }

  await logActivity({
    ownerId: owner.id,
    action: id ? "package_updated" : "package_created",
    entityType: "package",
    entityId: packageId || undefined,
    description: `${id ? "Paket diperbarui" : "Paket dibuat"}: ${parsed.data.name}.`,
  });

  revalidatePath("/dashboard/packages");
  redirect("/dashboard/packages?saved=1");
}

export async function deactivatePackageAction(formData: FormData) {
  const owner = await requireOwner();
  await prisma.package.update({
    where: { id: formString(formData, "id"), ownerId: owner.id },
    data: { isActive: false },
  });
  await logActivity({
    ownerId: owner.id,
    action: "package_deactivated",
    entityType: "package",
    entityId: formString(formData, "id"),
    description: "Paket dinonaktifkan.",
  });
  revalidatePath("/dashboard/packages");
}

export async function saveMemberAction(formData: FormData) {
  const owner = await requireOwner();
  const id = formString(formData, "id");
  const path = id ? `/dashboard/members/${id}` : "/dashboard/members/new";
  const monthlyPrice = Number(formString(formData, "monthlyPrice"));
  const billingDueDay = Number(formString(formData, "billingDueDay"));
  const status = formString(formData, "status") || "active";
  const packageId = formString(formData, "packageId") || null;

  if (!formString(formData, "name") || !formString(formData, "email") || !formString(formData, "phoneWa")) {
    actionError(path, "Nama, email, dan nomor WhatsApp wajib diisi.");
  }

  if (!Number.isFinite(monthlyPrice) || monthlyPrice < 0) {
    actionError(path, "Harga bulanan tidak valid.");
  }

  if (!Number.isInteger(billingDueDay) || billingDueDay < 1 || billingDueDay > 31) {
    actionError(path, "Tanggal jatuh tempo harus 1 sampai 31.");
  }

  if (!MEMBER_STATUSES.includes(status as (typeof MEMBER_STATUSES)[number])) {
    actionError(path, "Status member tidak valid.");
  }

  if (packageId) {
    const selectedPackage = await prisma.package.findFirst({
      where: { id: packageId, ownerId: owner.id },
      select: { id: true },
    });
    if (!selectedPackage) actionError(path, "Paket member tidak valid.");
  }

  const data = {
    ownerId: owner.id,
    packageId,
    name: formString(formData, "name"),
    email: formString(formData, "email"),
    phoneWa: normalizeWhatsApp(formString(formData, "phoneWa")),
    businessName: formString(formData, "businessName") || null,
    playConsoleEmail: formString(formData, "playConsoleEmail") || null,
    monthlyPrice,
    billingDueDay,
    startDate: safeDate(formString(formData, "startDate")) ?? new Date(),
    endDate: safeDate(formString(formData, "endDate")) ?? null,
    status,
    notes: formString(formData, "notes") || null,
  };

  let memberId = id;
  if (id) {
    await prisma.member.update({
      where: { id, ownerId: owner.id },
      data,
    });
  } else {
    const created = await prisma.member.create({ data });
    memberId = created.id;
  }

  await logActivity({
    ownerId: owner.id,
    action: id ? "member_updated" : "member_created",
    entityType: "member",
    entityId: memberId || undefined,
    description: `${id ? "Member diperbarui" : "Member dibuat"}: ${data.name}.`,
  });

  revalidatePath("/dashboard/members");
  redirect("/dashboard/members?saved=1");
}

export async function deactivateMemberAction(formData: FormData) {
  const owner = await requireOwner();
  await prisma.member.update({
    where: { id: formString(formData, "id"), ownerId: owner.id },
    data: { status: "inactive" },
  });
  await logActivity({
    ownerId: owner.id,
    action: "member_deactivated",
    entityType: "member",
    entityId: formString(formData, "id"),
    description: "Member dinonaktifkan.",
  });
  revalidatePath("/dashboard/members");
}

export async function savePaymentSettingsAction(formData: FormData) {
  const owner = await requireOwner();
  const parsed = paymentSettingSchema.safeParse({
    bankName: formString(formData, "bankName"),
    bankAccountNumber: formString(formData, "bankAccountNumber"),
    bankAccountHolder: formString(formData, "bankAccountHolder"),
    whatsappConfirmationNumber: formString(formData, "whatsappConfirmationNumber"),
    paymentInstruction: formString(formData, "paymentInstruction"),
  });

  if (!parsed.success) {
    actionError("/dashboard/settings/payment", parsed.error.issues[0]?.message || "Pengaturan pembayaran tidak valid.");
  }

  const qris = formData.get("qris");
  let qrisImageUrl = formString(formData, "existingQrisImageUrl") || null;
  if (qris instanceof File && qris.size > 0) {
    const qrisName = qris.name.toLowerCase();
    const isQrisImage =
      ["image/jpeg", "image/png"].includes(qris.type) ||
      qrisName.endsWith(".jpg") ||
      qrisName.endsWith(".jpeg") ||
      qrisName.endsWith(".png");
    if (!isQrisImage) {
      actionError("/dashboard/settings/payment", "QRIS harus berupa JPG atau PNG.");
    }
    if (qris.size > 5 * 1024 * 1024) {
      actionError("/dashboard/settings/payment", "Ukuran file QRIS maksimal 5 MB.");
    }
    try {
      qrisImageUrl = await uploadPrivateFile(process.env.STORAGE_BUCKET_QRIS || "qris", qris, owner.id);
    } catch {
      actionError("/dashboard/settings/payment", "Upload QRIS gagal. Pastikan bucket Storage sudah tersedia.");
    }
  }

  const data = {
    ownerId: owner.id,
    bankName: parsed.data.bankName,
    bankAccountNumber: parsed.data.bankAccountNumber,
    bankAccountHolder: parsed.data.bankAccountHolder,
    whatsappConfirmationNumber: normalizeWhatsApp(parsed.data.whatsappConfirmationNumber),
    paymentInstruction: parsed.data.paymentInstruction || null,
    qrisImageUrl,
  };

  const existing = await prisma.paymentSetting.findFirst({ where: { ownerId: owner.id } });
  if (existing) {
    await prisma.paymentSetting.update({ where: { id: existing.id }, data });
  } else {
    await prisma.paymentSetting.create({ data });
  }

  await logActivity({
    ownerId: owner.id,
    action: "payment_settings_updated",
    entityType: "payment_setting",
    entityId: existing?.id,
    description: "Pengaturan pembayaran diperbarui.",
  });

  revalidatePath("/dashboard/settings/payment");
  revalidatePath("/pay");
  redirect("/dashboard/settings/payment?saved=1");
}

export async function saveTemplateAction(formData: FormData) {
  const owner = await requireOwner();
  const id = formString(formData, "id");
  const type = formString(formData, "type");
  const name = formString(formData, "name");
  const body = formString(formData, "body");

  if (!type || !name || !body) {
    actionError("/dashboard/templates", "Nama dan isi template wajib diisi.");
  }

  if (id) {
    await prisma.messageTemplate.update({
      where: { id, ownerId: owner.id },
      data: {
        name,
        subject: formString(formData, "subject") || null,
        body,
        isActive: formData.get("isActive") === "on",
      },
    });
  } else {
    await prisma.messageTemplate.upsert({
      where: { ownerId_type: { ownerId: owner.id, type } },
      update: {
        name,
        subject: formString(formData, "subject") || null,
        body,
        isActive: formData.get("isActive") === "on",
      },
      create: {
        ownerId: owner.id,
        type,
        name,
        subject: formString(formData, "subject") || null,
        body,
        isActive: formData.get("isActive") === "on",
      },
    });
  }

  await logActivity({
    ownerId: owner.id,
    action: "message_template_updated",
    entityType: "message_template",
    entityId: id || undefined,
    description: `Template ${type} diperbarui.`,
  });

  revalidatePath("/dashboard/templates");
  redirect("/dashboard/templates?saved=1");
}

export async function createInvoiceAction(formData: FormData) {
  const owner = await requireOwner();
  const amountValue = formString(formData, "amount");
  const parsed = invoiceSchema.safeParse({
    memberId: formString(formData, "memberId"),
    periodMonth: formString(formData, "periodMonth"),
    periodYear: formString(formData, "periodYear"),
    amount: amountValue ? amountValue : undefined,
    dueDate: formString(formData, "dueDate"),
    notes: formString(formData, "notes"),
  });

  if (!parsed.success) {
    actionError("/dashboard/invoices/new", parsed.error.issues[0]?.message || "Data invoice tidak valid.");
  }

  try {
    const invoice = await createInvoiceForMember({
      ownerId: owner.id,
      memberId: parsed.data.memberId,
      periodMonth: parsed.data.periodMonth,
      periodYear: parsed.data.periodYear,
      amount: parsed.data.amount,
      dueDate: parsed.data.dueDate instanceof Date ? parsed.data.dueDate : undefined,
      notes: parsed.data.notes,
    });
    await logActivity({
      ownerId: owner.id,
      action: "invoice_created",
      entityType: "invoice",
      entityId: invoice.id,
      description: `Invoice ${invoice.invoiceNumber} dibuat.`,
    });
  } catch (error) {
    if (isPrismaUniqueError(error)) {
      actionError("/dashboard/invoices/new", "Invoice untuk periode ini sudah ada.");
    }
    actionError("/dashboard/invoices/new", "Invoice gagal dibuat.");
  }

  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices?saved=1");
}

export async function generateMonthlyInvoicesAction(formData: FormData) {
  const owner = await requireOwner();
  const periodMonth = Number(formString(formData, "periodMonth"));
  const periodYear = Number(formString(formData, "periodYear"));

  if (!Number.isInteger(periodMonth) || periodMonth < 1 || periodMonth > 12 || !Number.isInteger(periodYear) || periodYear < 2020 || periodYear > 2100) {
    actionError("/dashboard/invoices", "Periode invoice tidak valid.");
  }

  const members = await prisma.member.findMany({
    where: { ownerId: owner.id, status: "active" },
    orderBy: { createdAt: "asc" },
  });

  let created = 0;
  for (const member of members) {
    try {
      await createInvoiceForMember({
        ownerId: owner.id,
        memberId: member.id,
        periodMonth,
        periodYear,
        amount: member.monthlyPrice,
        dueDate: getDueDate(periodYear, periodMonth, member.billingDueDay),
      });
      created += 1;
    } catch (error) {
      if (!isPrismaUniqueError(error)) throw error;
    }
  }

  await logActivity({
    ownerId: owner.id,
    action: "monthly_invoices_generated",
    entityType: "invoice",
    description: `Generate invoice periode ${periodMonth}/${periodYear}. Invoice baru: ${created}.`,
  });

  revalidatePath("/dashboard/invoices");
  redirect(`/dashboard/invoices?generated=${created}`);
}

export async function cancelInvoiceAction(formData: FormData) {
  const owner = await requireOwner();
  const id = formString(formData, "id");
  await prisma.invoice.update({
    where: { id, ownerId: owner.id },
    data: { status: "cancelled", notes: formString(formData, "notes") || undefined },
  });
  await logActivity({
    ownerId: owner.id,
    action: "invoice_cancelled",
    entityType: "invoice",
    entityId: id,
    description: "Invoice dibatalkan.",
  });
  revalidatePath("/dashboard/invoices");
  revalidatePath(`/dashboard/invoices/${id}`);
}

export async function markInvoicePaidAction(formData: FormData) {
  const owner = await requireOwner();
  const id = formString(formData, "id");
  const invoice = await prisma.invoice.findFirstOrThrow({
    where: { id, ownerId: owner.id },
  });

  if (["paid", "cancelled"].includes(invoice.status)) {
    revalidatePath("/dashboard/invoices");
    revalidatePath("/dashboard/payments");
    return;
  }

  await prisma.$transaction([
    prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        memberId: invoice.memberId,
        amount: invoice.amount,
        paymentMethod: "transfer_bank",
        status: "accepted",
        verifiedAt: new Date(),
        verifiedBy: owner.id,
        notes: "Ditandai lunas manual oleh owner.",
      },
    }),
    prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: "paid", paidAt: new Date() },
    }),
  ]);
  await logActivity({
    ownerId: owner.id,
    action: "invoice_marked_paid",
    entityType: "invoice",
    entityId: invoice.id,
    description: `Invoice ${invoice.invoiceNumber} ditandai lunas manual.`,
  });
  revalidatePath("/dashboard/invoices");
  revalidatePath("/dashboard/payments");
}

export async function sendInvoiceEmailAction(formData: FormData) {
  const owner = await requireOwner();
  const id = formString(formData, "id");
  const invoice = await prisma.invoice.findFirstOrThrow({
    where: { id, ownerId: owner.id },
    include: { member: true },
  });
  const template = await getActiveMessageTemplate(owner.id, "invoice_email");
  const variables = buildTemplateVariables({ ...invoice, owner, member: invoice.member });
  const subject = renderTemplate(template.subject || DEFAULT_TEMPLATES.invoice_email.subject, variables);
  const message = renderTemplate(template.body, variables);
  const result = await sendEmail({ to: invoice.member.email, subject, text: message });

  await prisma.messageLog.create({
    data: {
      ownerId: owner.id,
      memberId: invoice.memberId,
      invoiceId: invoice.id,
      channel: "email",
      recipient: invoice.member.email,
      message,
      status: result.ok ? "sent" : "failed",
      sentAt: result.ok ? new Date() : null,
      errorMessage: result.error,
    },
  });

  revalidatePath(`/dashboard/invoices/${id}`);
  redirect(`/dashboard/invoices/${id}?email=${result.ok ? "sent" : "failed"}`);
}

export async function sendBulkInvoiceEmailsAction(formData: FormData) {
  const owner = await requireOwner();
  const periodMonth = Number(formString(formData, "periodMonth"));
  const periodYear = Number(formString(formData, "periodYear"));
  const invoices = await prisma.invoice.findMany({
    where: {
      ownerId: owner.id,
      periodMonth,
      periodYear,
      status: { in: ["unpaid", "overdue", "pending_verification"] },
    },
    include: { member: true },
    orderBy: { dueDate: "asc" },
  });
  const template = await getActiveMessageTemplate(owner.id, "invoice_email");

  let sent = 0;
  let failed = 0;
  for (const invoice of invoices) {
    const variables = buildTemplateVariables({ ...invoice, owner, member: invoice.member });
    const subject = renderTemplate(template.subject || DEFAULT_TEMPLATES.invoice_email.subject, variables);
    const message = renderTemplate(template.body, variables);
    const result = await sendEmail({ to: invoice.member.email, subject, text: message });

    await prisma.messageLog.create({
      data: {
        ownerId: owner.id,
        memberId: invoice.memberId,
        invoiceId: invoice.id,
        channel: "email",
        recipient: invoice.member.email,
        message,
        status: result.ok ? "sent" : "failed",
        sentAt: result.ok ? new Date() : null,
        errorMessage: result.error,
      },
    });
    if (result.ok) sent += 1;
    else failed += 1;
  }

  await logActivity({
    ownerId: owner.id,
    action: "bulk_invoice_email_sent",
    entityType: "message_log",
    description: `Email tagihan massal periode ${periodMonth}/${periodYear}. Berhasil: ${sent}, gagal: ${failed}.`,
  });

  revalidatePath("/dashboard/invoices");
  redirect(`/dashboard/invoices?month=${periodMonth}&year=${periodYear}&bulk_email_sent=${sent}&bulk_email_failed=${failed}`);
}

export async function uploadProofAction(formData: FormData) {
  const parsed = publicProofSchema.safeParse({
    token: formString(formData, "token"),
    payerName: formString(formData, "payerName"),
    paymentMethod: formString(formData, "paymentMethod"),
    notes: formString(formData, "notes"),
  });

  if (!parsed.success) {
    actionError(`/pay/${formString(formData, "token")}`, parsed.error.issues[0]?.message || "Upload tidak valid.");
  }

  const invoice = await prisma.invoice.findUnique({
    where: { paymentToken: parsed.data.token },
  });

  if (!invoice) actionError(`/pay/${parsed.data.token}`, "Token pembayaran tidak valid.");
  if (["pending_verification", "paid", "cancelled"].includes(invoice.status)) {
    actionError(`/pay/${parsed.data.token}`, "Invoice ini tidak menerima upload bukti baru.");
  }

  const proof = formData.get("proof");
  if (!(proof instanceof File) || proof.size === 0) {
    actionError(`/pay/${parsed.data.token}`, "Bukti pembayaran wajib diupload.");
  }
  if (!isAllowedProofFile(proof)) {
    actionError(`/pay/${parsed.data.token}`, "Format file harus JPG, PNG, atau PDF.");
  }
  if (proof.size > 5 * 1024 * 1024) {
    actionError(`/pay/${parsed.data.token}`, "Upload gagal. Ukuran file maksimal 5 MB.");
  }

  let proofFileUrl: string | null = null;
  const proofBucket = process.env.STORAGE_BUCKET_PAYMENT_PROOFS || "payment-proofs";
  try {
    proofFileUrl = await uploadPrivateFile(
      proofBucket,
      proof,
      invoice.ownerId,
    );
  } catch {
    actionError(`/pay/${parsed.data.token}`, "Upload bukti gagal. Coba ulangi beberapa saat lagi.");
  }

  try {
    await prisma.$transaction(async (tx) => {
      const lockedInvoice = await tx.invoice.updateMany({
        where: { id: invoice.id, status: { in: ["unpaid", "overdue"] } },
        data: { status: "pending_verification" },
      });

      if (lockedInvoice.count === 0) {
        throw new Error("INVOICE_UPLOAD_LOCKED");
      }

      await tx.payment.create({
        data: {
          invoiceId: invoice.id,
          memberId: invoice.memberId,
          amount: invoice.amount,
          paymentMethod: parsed.data.paymentMethod,
          payerName: parsed.data.payerName || null,
          proofFileUrl,
          status: "pending_verification",
          notes: parsed.data.notes || null,
        },
      });
    });
  } catch (error) {
    await deletePrivateFiles(proofBucket, [proofFileUrl]);
    if (error instanceof Error && error.message === "INVOICE_UPLOAD_LOCKED") {
      actionError(`/pay/${parsed.data.token}`, "Invoice ini sudah menerima bukti pembayaran.");
    }
    throw error;
  }

  revalidatePath(`/pay/${parsed.data.token}`);
  redirect(`/pay/${parsed.data.token}?uploaded=1`);
}

export async function verifyPaymentAction(formData: FormData) {
  const owner = await requireOwner();
  const id = formString(formData, "id");
  const payment = await prisma.payment.findFirstOrThrow({
    where: { id, invoice: { ownerId: owner.id } },
    include: { invoice: true },
  });

  if (payment.status !== "pending_verification" || payment.invoice.status === "cancelled") {
    revalidatePath("/dashboard/payments");
    revalidatePath("/dashboard/invoices");
    return;
  }

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "accepted",
        verifiedAt: new Date(),
        verifiedBy: owner.id,
        notes: formString(formData, "notes") || payment.notes,
      },
    }),
    prisma.invoice.update({
      where: { id: payment.invoiceId },
      data: { status: "paid", paidAt: new Date() },
    }),
    prisma.activityLog.create({
      data: {
        ownerId: owner.id,
        action: "payment_verified",
        entityType: "payment",
        entityId: payment.id,
        description: `Pembayaran invoice ${payment.invoice.invoiceNumber} diverifikasi.`,
      },
    }),
  ]);

  revalidatePath("/dashboard/payments");
  revalidatePath("/dashboard/invoices");
}

export async function rejectPaymentAction(formData: FormData) {
  const owner = await requireOwner();
  const id = formString(formData, "id");
  const payment = await prisma.payment.findFirstOrThrow({
    where: { id, invoice: { ownerId: owner.id } },
    include: { invoice: true },
  });

  if (payment.status !== "pending_verification") {
    revalidatePath("/dashboard/payments");
    revalidatePath("/dashboard/invoices");
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "rejected",
        verifiedAt: new Date(),
        verifiedBy: owner.id,
        notes: formString(formData, "notes") || "Pembayaran ditolak.",
      },
    });

    if (payment.invoice.status !== "cancelled") {
      const [acceptedPayments, pendingPayments] = await Promise.all([
        tx.payment.count({
          where: { invoiceId: payment.invoiceId, id: { not: payment.id }, status: "accepted" },
        }),
        tx.payment.count({
          where: { invoiceId: payment.invoiceId, id: { not: payment.id }, status: "pending_verification" },
        }),
      ]);
      const nextStatus = acceptedPayments > 0 ? "paid" : pendingPayments > 0 ? "pending_verification" : "unpaid";

      await tx.invoice.update({
        where: { id: payment.invoiceId },
        data: {
          status: nextStatus,
          paidAt: nextStatus === "paid" ? payment.invoice.paidAt : null,
        },
      });
    }

    await tx.activityLog.create({
      data: {
        ownerId: owner.id,
        action: "payment_rejected",
        entityType: "payment",
        entityId: payment.id,
        description: `Pembayaran invoice ${payment.invoice.invoiceNumber} ditolak.`,
      },
    });
  });

  revalidatePath("/dashboard/payments");
  revalidatePath("/dashboard/invoices");
}

export async function createWhatsAppLogAndRedirect(invoiceId: string) {
  const owner = await requireOwner();
  const invoice = await prisma.invoice.findFirstOrThrow({
    where: { id: invoiceId, ownerId: owner.id },
    include: { member: true },
  });
  const template = await getActiveMessageTemplate(owner.id, "invoice_whatsapp");
  const variables = buildTemplateVariables({ ...invoice, owner, member: invoice.member });
  const message = renderTemplate(template.body, variables);
  const url = buildWhatsAppLink(normalizeWhatsApp(invoice.member.phoneWa), message);

  await prisma.messageLog.create({
    data: {
      ownerId: owner.id,
      memberId: invoice.memberId,
      invoiceId: invoice.id,
      channel: "whatsapp",
      recipient: invoice.member.phoneWa,
      message,
      status: "clicked",
    },
  });

  redirect(url);
}
