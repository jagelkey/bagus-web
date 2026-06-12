# Member Subscription Billing Manager

Web app single-owner untuk mengelola member langganan, invoice bulanan, halaman pembayaran publik, upload bukti bayar, verifikasi pembayaran, WhatsApp manual, email tagihan, dan rekap bulanan.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS
- Prisma ORM + PostgreSQL
- Supabase Auth + Supabase Storage
- Resend untuk email tagihan

## Setup

1. Install dependencies:

```bash
npm install
```

2. Salin environment:

```bash
cp .env.example .env
```

3. Isi minimal:

```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="..."
SUPABASE_SECRET_KEY="..."
RESEND_API_KEY="..."
EMAIL_FROM="Member Billing <billing@example.com>"
```

4. Push schema database:

```bash
npm run db:push
```

5. Jalankan SQL keamanan Supabase:

```sql
-- Supabase SQL Editor
-- paste isi supabase/setup.sql
```

6. Buat owner lewat Supabase Auth dashboard, lalu login memakai email/password tersebut. Profil owner dan template default akan dibuat saat pertama kali masuk dashboard.

## Commands

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
npm run prisma:validate
```

Jika menjalankan `prisma:validate` sebelum `.env` tersedia, set `DATABASE_URL` sementara.

## MVP Routes

- `/login`
- `/dashboard`
- `/dashboard/members`
- `/dashboard/packages`
- `/dashboard/invoices`
- `/dashboard/payments`
- `/dashboard/reports/monthly`
- `/dashboard/activity`
- `/dashboard/templates`
- `/dashboard/settings/payment`
- `/dashboard/settings/profile`
- `/pay/[token]`

## Implemented PRD Extras

- Auth API: `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`
- Monthly report export: `/api/reports/monthly/export-excel`, `/api/reports/monthly/export-pdf`
- Bulk email for unpaid/current-due invoices from the invoice list.
- Template preview with realistic invoice variables.
- Owner activity log page.
- Default packages are created for each owner on first dashboard access: Basic, Pro, Custom.

## Security Notes

- Aplikasi tidak menyimpan password Google Play Store atau Google Play Console.
- Link pembayaran publik memakai token random panjang, bukan ID invoice.
- Bukti pembayaran dan QRIS disimpan di private Supabase Storage bucket.
- Server memakai Supabase secret/service key hanya di server-side code.
- `supabase/setup.sql` mengaktifkan RLS dan storage policies sebagai defense in depth.
