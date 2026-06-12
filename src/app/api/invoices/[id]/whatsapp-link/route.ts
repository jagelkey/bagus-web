import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeWhatsApp } from "@/lib/billing";
import { requireApiOwner } from "@/lib/api";
import { buildTemplateVariables, buildWhatsAppLink, renderTemplate } from "@/lib/templates";
import { getActiveMessageTemplate } from "@/lib/message-template-service";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const invoice = await prisma.invoice.findFirstOrThrow({ where: { id, ownerId: auth.owner.id }, include: { member: true } });
  const template = await getActiveMessageTemplate(auth.owner.id, "invoice_whatsapp");
  const variables = buildTemplateVariables({ ...invoice, owner: auth.owner, member: invoice.member });
  const message = renderTemplate(template.body, variables);
  const url = buildWhatsAppLink(normalizeWhatsApp(invoice.member.phoneWa), message);
  await prisma.messageLog.create({
    data: {
      ownerId: auth.owner.id,
      memberId: invoice.memberId,
      invoiceId: invoice.id,
      channel: "whatsapp",
      recipient: invoice.member.phoneWa,
      message,
      status: "clicked",
    },
  });
  return NextResponse.redirect(url);
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return GET(request, context);
}
