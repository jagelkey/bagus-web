import { NextResponse } from "next/server";
import { requireApiOwner } from "@/lib/api";
import { getMonthlyReport } from "@/lib/reports";

export async function GET(request: Request) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;
  const url = new URL(request.url);
  const now = new Date();
  const month = Number(url.searchParams.get("month") || now.getMonth() + 1);
  const year = Number(url.searchParams.get("year") || now.getFullYear());
  const report = await getMonthlyReport({
    ownerId: auth.owner.id,
    month,
    year,
    status: url.searchParams.get("status") || undefined,
    member: url.searchParams.get("member") || undefined,
    packageId: url.searchParams.get("package") || undefined,
  });
  return NextResponse.json({
    month,
    year,
    ...report.summary,
    invoices: report.invoices,
  });
}
