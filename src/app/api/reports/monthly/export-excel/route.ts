import ExcelJS from "exceljs";
import { requireApiOwner } from "@/lib/api";
import { formatDate, formatPeriod } from "@/lib/format";
import { getMonthlyReport, normalizeReportMonth, normalizeReportStatus, normalizeReportYear } from "@/lib/reports";
import { STATUS_LABELS } from "@/lib/constants";

export const runtime = "nodejs";

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

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Member Subscription Billing Manager";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("Rekap Bulanan");
  sheet.mergeCells("A1:K1");
  sheet.getCell("A1").value = `Rekap Bulanan ${formatPeriod(month, year)}`;
  sheet.getCell("A1").font = { bold: true, size: 16 };

  sheet.addRow([]);
  sheet.addRow(["Total Invoice", report.summary.totalInvoices]);
  sheet.addRow(["Total Nominal", report.summary.totalAmount]);
  sheet.addRow(["Total Pemasukan", report.summary.revenue]);
  sheet.addRow(["Total Tunggakan", report.summary.arrears]);
  sheet.addRow([]);

  const header = sheet.addRow([
    "Nomor Invoice",
    "Nama Member",
    "Email",
    "WhatsApp",
    "Paket",
    "Periode",
    "Nominal",
    "Jatuh Tempo",
    "Status",
    "Tanggal Bayar",
    "Metode Bayar",
  ]);
  header.font = { bold: true };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FF" } };

  for (const invoice of report.invoices) {
    const payment = invoice.payments[0];
    sheet.addRow([
      invoice.invoiceNumber,
      invoice.member.name,
      invoice.member.email,
      invoice.member.phoneWa,
      invoice.member.package?.name || "Custom",
      formatPeriod(invoice.periodMonth, invoice.periodYear),
      Number(invoice.amount),
      formatDate(invoice.dueDate),
      STATUS_LABELS[invoice.status] || invoice.status,
      formatDate(invoice.paidAt || payment?.verifiedAt),
      payment?.paymentMethod || "-",
    ]);
  }

  sheet.columns.forEach((column) => {
    column.width = 18;
  });
  sheet.getColumn(7).numFmt = '"Rp"#,##0';
  sheet.views = [{ state: "frozen", ySplit: 8 }];

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `rekap-bulanan-${year}-${String(month).padStart(2, "0")}.xlsx`;

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
