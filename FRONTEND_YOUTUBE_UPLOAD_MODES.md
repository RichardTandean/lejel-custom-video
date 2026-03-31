# Panduan Implementasi Frontend: 3 Mode Upload YouTube

Backend sudah deploy dengan fitur:
- **youtubeUploadMode**: `none` | `pending_approval` | `direct`
- Status baru: **pending_youtube_approval**
- Endpoint admin: **GET** pending list, **POST** approve, **POST** reject

Ikuti langkah berikut di repo frontend (`lejel-custom-video`).

---

## 1. Types (`types/index.ts`)

- Tambah status di union **VideoRequestStatus**:
  - `"pending_youtube_approval"`
- Tambah type:
  - `export type YoutubeUploadMode = "none" | "pending_approval" | "direct";`
- Di interface **VideoRequest** tambah:
  - `youtubeUploadMode?: YoutubeUploadMode;`
  - `youtubeApprovalRejectedAt?: string | null;`
- Di **CreateVideoRequestInput** (atau body create) tambah:
  - `youtubeUploadMode?: YoutubeUploadMode;`

---

## 2. API (`lib/api.ts`)

**createVideoRequest**
- Tambah parameter `youtubeUploadMode?: "none" | "pending_approval" | "direct"`.
- Jika `youtubeUploadMode === "pending_approval"` atau `"direct"`, wajib kirim `connectionId` + `youtubePrivacyStatus`.
- Jika `youtubeUploadMode === "none"` (atau tidak dikirim), jangan kirim `connectionId`.
- Masukkan `youtubeUploadMode` ke payload yang dikirim ke `POST /api/video-requests`.

**Admin (hanya dipanggil jika user.role === "admin")**
- `getPendingYoutubeApprovals()`: `GET /api/video-requests/admin/pending-youtube` → return array.
- `approveYoutubeUpload(id: string)`: `POST /api/video-requests/:id/admin/approve-youtube` → return `{ youtubeVideoId, youtubeUrl }`.
- `rejectYoutubeUpload(id: string)`: `POST /api/video-requests/:id/admin/reject-youtube` → return `{ ok: true }`.

Semua pakai `apiFetch` (Bearer token dari localStorage) seperti endpoint lain.

---

## 3. Halaman New Request (`app/[locale]/(dashboard)/new/page.tsx`)

**State / form**
- Tambah field di form: **youtubeUploadMode** dengan nilai default `"none"`.
- Opsi yang ditampilkan ke user (radio atau select):
  - **Generate saja** → `youtubeUploadMode: "none"`
  - **Upload ke YouTube (perlu persetujuan admin)** → `youtubeUploadMode: "pending_approval"`
  - **Upload ke YouTube (langsung)** → `youtubeUploadMode: "direct"`

**UI**
- Dropdown "Upload ke channel" (YouTube connection) **hanya tampil** jika mode **bukan** `"none"`.
- Jika mode `"pending_approval"` atau `"direct"`, pilihan connection **wajib** (validasi sebelum submit).
- Jika mode `"none"`, jangan kirim `connectionId` (dropdown bisa kosong/hidden).
- Visibility (public/private/unlisted) tetap tampil hanya ketika ada connection yang dipilih.

**Submit**
- Dari form baca: `fullScript`, `segmentedScripts`, `youtubeUploadMode`, `youtubeConnectionId`, `youtubePrivacyStatus`.
- Mapping ke payload:
  - `youtubeUploadMode`: dari form.
  - Jika mode `"none"`: `connectionId: undefined`, tidak usah kirim `youtubePrivacyStatus`.
  - Jika mode `"pending_approval"` atau `"direct"`: `connectionId: youtubeConnectionId`, `youtubePrivacyStatus: youtubePrivacyStatus` (wajib).
- Panggil `createVideoRequest` dengan payload itu.

---

## 4. Validasi (`lib/validations.ts`)

- Schema create request (Zod atau yang dipakai) tambah field **youtubeUploadMode** (optional, default `"none"`).
- Validasi conditional:
  - Jika `youtubeUploadMode === "pending_approval"` atau `"direct"` → **youtubeConnectionId** wajib (string non-empty).
  - Jika `youtubeUploadMode === "none"` → **youtubeConnectionId** harus kosong/undefined.
- Output ke API: `youtubeUploadMode`, `connectionId` (jika ada), `youtubePrivacyStatus` (jika ada).

---

## 5. Daftar Request (`app/[locale]/(dashboard)/requests/page.tsx`)

- Di list, untuk setiap item yang **status === "pending_youtube_approval"** tampilkan badge/label: **"Menunggu persetujuan upload"** (atau terjemahan).
- Filter by status: tambah opsi **"Menunggu persetujuan"** yang mengirim query `?status=pending_youtube_approval` ke API.

---

## 6. Detail Request (`app/[locale]/(dashboard)/requests/[id]/page.tsx`)

- Jika **status === "pending_youtube_approval"**:
  - Tampilkan pesan: video sudah selesai, menunggu persetujuan admin untuk upload ke YouTube.
  - Tampilkan link **resultUrl** untuk preview/download video (jika ada).
- Jika ada **youtubeApprovalRejectedAt** (dari response detail):
  - Tampilkan pesan: "Upload YouTube ditolak oleh admin" (atau terjemahan).

---

## 7. Halaman Admin: Persetujuan Upload (baru)

**Route**
- Buat halaman baru, misalnya: `app/[locale]/(dashboard)/admin/pending-upload/page.tsx`.

**Akses**
- Cek `user.role === "admin"` (dari auth context). Jika bukan admin, redirect ke `/requests` atau tampilkan "Akses ditolak".

**Data**
- Panggil `getPendingYoutubeApprovals()` (TanStack Query), key misalnya `["pending-youtube-approvals"]`.

**Tampilan**
- Tabel atau kartu list berisi: id request, **created by** (user.name / user.email), judul (youtubeTitle atau potongan fullScript), **resultUrl** (link buka/preview), tanggal (completedAt), tombol **Setuju** dan **Tolak**.

**Aksi**
- **Setuju**: panggil `approveYoutubeUpload(id)`. On success: invalidate query `["pending-youtube-approvals"]` (dan optional `["video-requests"]`), toast sukses. On error: toast error.
- **Tolak**: panggil `rejectYoutubeUpload(id)`. On success: invalidate query yang sama, toast sukses.

---

## 8. Navigasi

- Di sidebar/nav dashboard (komponen yang dipakai di `(dashboard)/layout.tsx`): untuk user dengan **role === "admin"** tampilkan link ke halaman persetujuan upload, misalnya **"Persetujuan Upload"** → `/admin/pending-upload` (atau sesuaikan locale).

---

## 9. i18n (next-intl / messages)

Tambah terjemahan untuk:
- **newRequest**: "Generate saja", "Upload (perlu persetujuan admin)", "Upload langsung", label untuk pilihan mode.
- **requests**: "Menunggu persetujuan upload", "Menunggu persetujuan" (filter).
- **requests/detail**: "Video selesai. Menunggu persetujuan admin untuk upload ke YouTube.", "Upload YouTube ditolak oleh admin."
- **admin/pending-upload**: judul halaman, "Setuju", "Tolak", "Created by", "Judul", "Preview", dll.

---

## Ringkasan endpoint backend (referensi)

| Method | Path | Auth | Deskripsi |
|--------|------|------|-----------|
| POST | /api/video-requests | JWT | Body: fullScript, segmentedScripts, **youtubeUploadMode?**, connectionId?, youtubePrivacyStatus? |
| GET | /api/video-requests | JWT | List milik user. Query: status (termasuk `pending_youtube_approval`) |
| GET | /api/video-requests/:id | JWT | Detail. Response ada youtubeUploadMode, youtubeApprovalRejectedAt |
| GET | /api/video-requests/admin/pending-youtube | JWT + Admin | List request status pending_youtube_approval |
| POST | /api/video-requests/:id/admin/approve-youtube | JWT + Admin | Upload ke YouTube, lalu status → completed |
| POST | /api/video-requests/:id/admin/reject-youtube | JWT + Admin | Status → completed, set youtubeApprovalRejectedAt |

---

## Urutan implementasi disarankan

1. Types + API (create payload + 3 fungsi admin).
2. Validasi (schema + conditional connectionId).
3. Halaman New (pilihan mode + conditional dropdown + submit).
4. List & detail request (status + pesan).
5. Halaman admin pending-upload + navigasi.
6. i18n.

Setelah itu tes alur: create dengan masing-masing mode, lalu sebagai admin buka halaman persetujuan, approve/reject, dan cek list/detail di sisi user.
