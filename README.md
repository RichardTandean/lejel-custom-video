# Script to Video — Frontend

Website untuk input script (full + segmented) dan trigger generate video via backend + n8n.

## Tech stack

| Layer | Pilihan | Alasan singkat |
|-------|--------|-----------------|
| **Framework** | Next.js 14+ (App Router) | Routing, layout, middleware, loading/error state. Frontend consume API saja. |
| **Language** | TypeScript | Type safety, autocomplete. |
| **Styling** | Tailwind CSS | Cepat dan konsisten. |
| **Components** | shadcn/ui | Button, Input, Card, Table, Select, Badge (Radix + Tailwind), aksesibilitas oke. |
| **Server state** | TanStack Query | Caching, refetch, polling di detail request. |
| **Form** | React Hook Form + Zod | Validasi + tipe; kurangi re-render. |
| **Auth** | Context + localStorage | Satu AuthContext, token dari response login. |
| **Icons** | Lucide React | Ringan, konsisten. |
| **HTTP** | fetch | Via `lib/api.ts`; token di header Authorization. |
| **Env** | .env.local | `NEXT_PUBLIC_API_URL` base URL backend. |

## Setup

Jalankan dari folder **frontend** (bukan root repo), agar Next.js menemukan `package.json` dan konfigurasi:

```bash
cd frontend
npm install
cp .env.local.example .env.local
# Edit .env.local: NEXT_PUBLIC_LEJEL_API_URL dan NEXT_PUBLIC_LEJEL_API_KEY (lihat .env.local.example)
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000). Untuk mengikuti redirect dengan curl: `curl -L http://localhost:3000`.

## Env

| Variable | Deskripsi |
|----------|-----------|
| `NEXT_PUBLIC_LEJEL_API_URL` | Base URL backend (prioritas), e.g. `https://lejel-backend.richardtandean.my.id` |
| `NEXT_PUBLIC_API_URL` | Fallback base URL backend (jika LEJEL tidak diset) |
| `NEXT_PUBLIC_LEJEL_API_KEY` | API key untuk OAuth/YouTube (create connection, disconnect, upload) |

## Struktur utama

- `app/` — routing: `/` (landing), `/login`, `/register`, `/dashboard`, `/new`, `/requests/[id]`, `/settings`
- `app/(auth)/` — layout halaman login & register
- `app/(dashboard)/` — layout + nav untuk user login; guard auth di client
- `components/` — `providers.tsx`, `dashboard-nav.tsx`, `ui/` (shadcn)
- `context/auth-context.tsx` — AuthProvider, useAuth
- `lib/api.ts` — fetch ke backend (auth, video-requests)
- `types/index.ts` — User, VideoRequest, ScriptInput, dll.

## Scripts

- `npm run dev` — dev server (dari folder `frontend`, port 3000)
- `npm run dev:port` — dev server di port 4000 (jika 3000 bentrok)
- `npm run build` — production build
- `npm run start` — jalankan production build

## Troubleshooting: ERR_EMPTY_RESPONSE / "localhost didn't send any data"

1. **Bersihkan cache dan install ulang**
   - Stop dev server (Ctrl+C).
   - Hapus folder `.next`, `node_modules`, dan file `package-lock.json`.
   - Jalankan: `npm cache clean --force` lalu `npm install`.
   - Start lagi: `npm run dev`.

2. **Port bentrok**  
   Jika port 3000 dipakai aplikasi lain, jalankan: `npm run dev:port` (pakai port 4000, buka http://localhost:4000).

3. **Env & konfigurasi**  
   Pastikan `.env.local` ada (boleh kosong). `NEXT_PUBLIC_API_URL` hanya untuk URL backend API, bukan URL frontend. Cek `next.config.ts` tidak ada syntax error.

4. **Firewall / VPN**  
   Coba nonaktifkan sementara VPN atau firewall untuk uji koneksi localhost.

## Security (CVE-2025-29927)

Middleware menghapus header `x-middleware-subrequest` dari request sebagai mitigasi [CVE-2025-29927](https://nextjs.org/blog/cve-2025-29927) (bypass middleware). Untuk perlindungan penuh, upgrade Next.js ke versi yang sudah di-patch (15.2.3+, 14.2.25, 13.5.9, atau 12.3.5). Di production, bisa juga strip header ini di reverse proxy (Nginx, Cloudflare, dll.) sebelum request sampai ke Next.js.

Backend (lejel-automation-backend) harus jalan dan expose API auth + video-requests sesuai plan.
