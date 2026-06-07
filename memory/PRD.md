# RT/RW Net Manager — PRD

## Problem Statement
Rewrite an existing single-page HTML/JS RT/RW Net dashboard into a full-stack web app (React + FastAPI + MongoDB) while keeping the simple operator-based auth, modernising the UI with Indonesian locale (Rupiah, dd/mm).

## Personas
- 3 operator: **Jamil, Idham, Fachri** (PIN universal: `101`)

## Core Requirements
- Simple auth (no JWT). Username (3 operator) + password `101`.
- MongoDB storage (collections: `psb`, `payments`).
- Indonesian locale: `Rp` currency formatting, format tanggal `id-ID`.
- Theme: light, organic green (#166534), Outfit + IBM Plex Sans typography.
- Sidebar collapsible.

## Features
1. **Auth/Login** — pilih operator + PIN.
2. **Dashboard** — stat cards (Total Pelanggan, Total Bayar, Sudah Bayar, Belum Bayar) + recent activity.
3. **Data PSB** — CRUD tabel pelanggan (Pemilik, Nama WiFi, Password WiFi, Client, Paket, Harga, Tgl Daftar, Infrastruktur, Status). Import/Export CSV. Hapus semua (password `251269`).
4. **Verifikasi Pembayaran** — pilih periode, **Generate** tagihan untuk semua PSB aktif (password `101404`), mark LUNAS, edit, delete, import/export.
5. **Statistik** — chart Recharts (income per bulan, per operator, dll).
6. **Monitoring** — daftar belum bayar di-group per Pemilik + total tunggakan.

## Architecture
- Backend: `/app/backend/server.py` (FastAPI + Motor). Semua route prefix `/api`.
- Frontend: `/app/frontend/src/` (React + Shadcn UI + Tailwind). Auth via `AuthContext`.
- DB: MongoDB lokal, collections `psb`, `payments`.

## Key Endpoints
- `POST /api/auth/login`
- `GET/POST/PUT/DELETE /api/psb`, `POST /api/psb/delete-all`, `POST /api/psb/import`
- `GET/POST/PUT/DELETE /api/payments`, `GET /api/payments/periods`, `POST /api/payments/generate`, `POST /api/payments/{id}/mark-lunas`, `POST /api/payments/import`
- `GET /api/stats?periode=YYYY-MM`
- `GET /api/monitoring/belum-bayar?periode=YYYY-MM`

## Changelog
- **2026-02** — Full-stack app sudah ter-implement (login, dashboard, PSB, payment, stats, monitor).
- **2026-02** — **Bug fix**: tombol Generate hanya menghasilkan 1 data. Root cause: dedup logic memakai `nama_wifi` saja, padahal banyak PSB punya `nama_wifi="-"` yang sama. Fix di `/app/backend/server.py` → dedup pakai `psb_id` + composite key `(nama_client, nama_wifi)`. Diverifikasi: generate menghasilkan 13/13 data, generate ulang 0 created (idempoten).
- **2026-02 (P0 Code Quality Fixes)**:
  - **Security**: Hardcoded secrets (`USER_PASSWORD`, `DELETE_ALL_PASSWORD`, `GENERATE_PASSWORD`, `VALID_USERS`) dipindah dari `server.py` ke `backend/.env`. Server kini load via `os.environ[...]`.
  - **React Hooks**: `load`/`loadPeriods` di `PsbPage.jsx` & `PaymentPage.jsx` dibungkus `useCallback`, ditambahkan ke dependency array `useEffect` (no more stale closures).
  - **Empty catch**: `PaymentPage.jsx` `loadPeriods` catch block kini log error ke `console.error` (sebelumnya silent).
  - **Verifikasi**: login OK (Jamil/101), Dashboard render (369 pelanggan), Payment page render (369 tagihan), wrong-password endpoints menolak.
- **2026-02 (Feature)**: **Year+Month picker** di Verifikasi Pembayaran. Dropdown periode tunggal diganti dengan dua dropdown (Bulan: Januari-Desember + Tahun: ±2 tahun current). Sekarang bisa pilih periode apa pun bebas (termasuk bulan kosong) lalu Generate. Catatan P1 server.py `is None` ditinjau ulang → false-positive (PEP 8: `is None` adalah idiom yang benar).

## Roadmap / Backlog
- P1: Testing end-to-end komprehensif (testing_agent_v3) untuk semua flow.
- P1: Validasi field input PSB (harga > 0, dll) di frontend.
- P2: Export laporan PDF bulanan.
- P2: Filter tanggal range di Statistik.
- P2: Notifikasi WhatsApp untuk pelanggan belum bayar.
