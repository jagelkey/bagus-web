import { format } from "date-fns";
import { id } from "date-fns/locale";

export function formatCurrency(value: number | string | { toString(): string } | null | undefined) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";
  return format(new Date(value), "dd MMM yyyy", { locale: id });
}

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "-";
  return format(new Date(value), "dd MMM yyyy HH:mm", { locale: id });
}

export function formatPeriod(month: number, year: number) {
  return format(new Date(year, month - 1, 1), "MMMM yyyy", { locale: id });
}
