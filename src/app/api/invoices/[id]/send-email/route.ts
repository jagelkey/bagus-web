import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiOwner } from "@/lib/api";
import { sendEmail } from "@/lib/email";
import { DEFAULT_TEMPLATES, buildTemplateVariables, renderTemplate } from "@/lib/templates";
import { getActiveMessageTemplate } from "@/lib/message-template-service";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const invoice = await prisma.invoice.findFirstOrThrow({ where: { id, ownerId: auth.owner.id }, include: { member: true } });
  const template = await getActiveMessageTemplate(auth.owner.id, "invoice_email");
  const variables = buildTemplateVariables({ ...invoice, owner: auth.owner, member: invoice.member });
  const subject = renderTemplate(template.subject || DEFAULT_TEMPLATES.invoice_email.subject, variables);
  const message = renderTemplate(template.body, variables);
  const result = await sendEmail({ to: invoice.member.email, subject, text: message });
  await prisma.messageLog.create({
    data: {
      ownerId: auth.owner.id,
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
  return NextResponse.json({ ok: result.ok, error: result.error });
}
