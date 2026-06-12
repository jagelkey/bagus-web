import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { MemberForm } from "@/components/member-form";

export default async function NewMemberPage() {
  const owner = await requireOwner();
  const packages = await prisma.package.findMany({
    where: { ownerId: owner.id, isActive: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="grid gap-6 pb-20 lg:pb-0">
      <PageHeader title="Tambah Member" description="Member aktif akan ikut generate invoice bulanan." />
      <MemberForm packages={packages} />
    </div>
  );
}
