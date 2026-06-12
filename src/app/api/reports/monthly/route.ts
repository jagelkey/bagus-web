import { NextResponse } from "next/server";
import { requireApiOwner } from "@/lib/api";
import { getMonthlyReport, normalizeReportMonth, normalizeReportStatus, normalizeReportYear } from "@/lib/reports";

export async function GET(request: Request) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;
  const url = new URL(request.url);
  const now = new Date();
  const month = normalizeReportMonth(url.searchParams.get("month"), now.getMonth() + 1);
  const year = normalizeReportYear(url.searchParams.get("year"), now.getFullYear());
  const report = await getMonthlyReport({
    ownerId: auth.owner.id,
    month,
    year,
    status: normalizeReportStatus(url.searchParams.get("status")),
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
