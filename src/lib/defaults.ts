import { prisma } from "@/lib/prisma";
import { DEFAULT_TEMPLATES } from "@/lib/templates";

export async function ensureDefaultTemplates(ownerId: string) {
  const owner = await prisma.owner.findUnique({ where: { id: ownerId }, select: { id: true } });
  if (!owner) return;

  for (const [type, template] of Object.entries(DEFAULT_TEMPLATES)) {
    await prisma.messageTemplate.upsert({
      where: { ownerId_type: { ownerId, type } },
      update: {},
      create: {
        ownerId,
        type,
        name: template.name,
        subject: template.subject,
        body: template.body,
      },
    });
  }
}

export async function ensureDefaultPackages(ownerId: string) {
  const owner = await prisma.owner.findUnique({ where: { id: ownerId }, select: { id: true } });
  if (!owner) return;

  const defaults = [
    { name: "Basic", price: 100000, billingCycle: "monthly", description: "Paket default Basic." },
    { name: "Pro", price: 150000, billingCycle: "monthly", description: "Paket default Pro." },
    { name: "Custom", price: 0, billingCycle: "monthly", description: "Paket default untuk harga khusus." },
  ];
  const existing = await prisma.package.findMany({
    where: { ownerId, name: { in: defaults.map((item) => item.name) } },
    select: { name: true },
  });
  const existingNames = new Set(existing.map((item) => item.name));
  const missing = defaults.filter((item) => !existingNames.has(item.name));

  if (missing.length) {
    await prisma.package.createMany({
      data: missing.map((item) => ({
        ownerId,
        ...item,
        isActive: true,
      })),
    });
  }
}

export async function ensureOwnerDefaults(ownerId: string) {
  await ensureDefaultPackages(ownerId);
  await ensureDefaultTemplates(ownerId);
}
