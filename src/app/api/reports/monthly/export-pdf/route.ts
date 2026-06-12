import PDFDocument from "pdfkit";
import { requireApiOwner } from "@/lib/api";
import { STATUS_LABELS } from "@/lib/constants";
import { formatCurrency, formatDate, formatPeriod } from "@/lib/format";
import { getMonthlyReport } from "@/lib/reports";

export const runtime = "nodejs";

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

  const doc = new PDFDocument({ size: "A4", margin: 40 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  doc.fontSize(18).text("Rekap Bulanan", { continued: false });
  doc.moveDown(0.3);
  doc.fontSize(11).fillColor("#475569").text(formatPeriod(month, year));
  doc.moveDown();

  doc.fillColor("#0f172a").fontSize(10);
  doc.text(`Total Invoice: ${report.summary.totalInvoices}`);
  doc.text(`Total Nominal: ${formatCurrency(report.summary.totalAmount)}`);
  doc.text(`Total Pemasukan: ${formatCurrency(report.summary.revenue)}`);
  doc.text(`Total Tunggakan: ${formatCurrency(report.summary.arrears)}`);
  doc.text(`Tanggal Cetak: ${formatDate(new Date())}`);
  doc.moveDown();

  const startX = doc.x;
  const widths = [78, 110, 74, 74, 78, 74, 74];
  const headers = ["Invoice", "Member", "Paket", "Nominal", "Jatuh Tempo", "Status", "Bayar"];

  drawRow(doc, startX, widths, headers, true);
  for (const invoice of report.invoices) {
    if (doc.y > 760) {
      doc.addPage();
      drawRow(doc, startX, widths, headers, true);
    }
    drawRow(doc, startX, widths, [
      invoice.invoiceNumber,
      invoice.member.name,
      invoice.member.package?.name || "Custom",
      formatCurrency(invoice.amount),
      formatDate(invoice.dueDate),
      STATUS_LABELS[invoice.status] || invoice.status,
      formatDate(invoice.paidAt || invoice.payments[0]?.verifiedAt),
    ]);
  }

  if (report.invoices.length === 0) {
    doc.moveDown().fillColor("#64748b").text("Tidak ada data invoice untuk filter ini.");
  }

  doc.end();
  const buffer = await done;
  const filename = `rekap-bulanan-${year}-${String(month).padStart(2, "0")}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

function drawRow(doc: PDFKit.PDFDocument, startX: number, widths: number[], values: string[], heading = false) {
  const y = doc.y;
  let x = startX;
  doc.fontSize(8).fillColor(heading ? "#0f172a" : "#334155");
  if (heading) doc.font("Helvetica-Bold");
  values.forEach((value, index) => {
    doc.text(value, x, y, { width: widths[index] - 6, height: 28, ellipsis: true });
    x += widths[index];
  });
  if (heading) doc.font("Helvetica");
  doc.moveTo(startX, y + 30).lineTo(startX + widths.reduce((sum, item) => sum + item, 0), y + 30).strokeColor("#e2e8f0").stroke();
  doc.y = y + 36;
}
