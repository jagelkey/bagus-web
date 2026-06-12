import { prisma } from "@/lib/prisma";
import { DEFAULT_TEMPLATES } from "@/lib/templates";

export type MessageTemplateType = keyof typeof DEFAULT_TEMPLATES;

export async function getActiveMessageTemplate(ownerId: string, type: MessageTemplateType) {
  const template = await prisma.messageTemplate.findUnique({
    where: { ownerId_type: { ownerId, type } },
  });

  if (template?.isActive) return template;
  return DEFAULT_TEMPLATES[type];
}
