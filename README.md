# NOTO — Full App (Frontend + Backend + DB)

این ریپو شامل فرانت‌اند + بک‌اند + دیتابیس برای اپلیکیشن NOTO است.

- Backend: Node.js 20 + TypeScript + Fastify
- DB: PostgreSQL
- ORM: Prisma
- Auth: JWT (username/password)
- Docs: Swagger/OpenAPI
- Metrics: Prometheus `/metrics`

> نکته: برای اینکه UI بدون تغییر باقی بماند، فرانت‌اند به‌صورت «بی‌صدا» یک کاربر محلی می‌سازد و توکن JWT را در LocalStorage نگه می‌دارد و سپس State اپ را از طریق Import/Export با بک‌اند همگام می‌کند.

## اجرای لوکال (Docker)

```bash
cp infra/env.example .env
make up

# Health
curl -f http://localhost:8080/healthz

# Frontend
open http://localhost:3000

# Swagger UI
open http://localhost:8080/docs
```

### توقف و پاکسازی

```bash
make down
```

## اجرای Dev بدون Docker (اختیاری)

نیازمند: Node 20+ و PostgreSQL.

```bash
cd apps/backend
cp .env.example .env
npm i
npm run db:migrate
npm run dev
```

## پورت‌ها

- Backend: `http://localhost:8080`
- Frontend: `http://localhost:3000`
- Postgres: `localhost:5432`

## مسیرهای مهم

- Swagger UI: `GET /docs`
- OpenAPI JSON: `GET /docs/json`
- Health: `GET /healthz`
- Ready: `GET /readyz`
- Metrics: `GET /metrics`

## Auth

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`

در همه‌ی مسیرهای محافظت‌شده:

`Authorization: Bearer <accessToken>`

## Import/Export

- Export: `GET /api/v1/export`
- Import: `POST /api/v1/import` (mode: `replace|merge` — در MVP فعلاً `replace` کامل است)

## نکته درباره‌ی Notification

این بک‌اند فقط Alarmها را ذخیره و محاسبه می‌کند. ارسال Notification در وب معمولاً سمت فرانت/Service Worker انجام می‌شود.

---

## License

MIT

## دیپلوی روی Vercel (Full Stack + Postgres + Blob)

این ریپو طوری آماده شده که روی Vercel به‌صورت **دو پروژه** دیپلوی شود:

1) **Backend API** (Fastify روی Vercel Serverless)
2) **Frontend** (Vite Static)

### 1) Backend روی Vercel

- در Vercel یک Project جدید بسازید و **Root Directory** را روی `apps/backend` بگذارید.
- یک دیتابیس **Vercel Postgres** (یا Neon/Supabase) بسازید و به همین Project وصل کنید.
- یک Storage از نوع **Vercel Blob** بسازید و به همین Project وصل کنید (برای Persist شدن تصاویر).

Env های لازم (Project Settings → Environment Variables):

- `DATABASE_URL` (از Postgres)
- `JWT_SECRET` (حداقل 16 کاراکتر)
- `CORS_ORIGIN` = دامنه‌ی فرانت (مثلاً `https://your-frontend.vercel.app`)
- `MEDIA_DRIVER` = `blob`

> اگر Blob را Attach کنید، Vercel خودش `BLOB_READ_WRITE_TOKEN` را ست می‌کند.

> در `apps/backend/package.json` اسکریپت `vercel-build` وجود دارد تا `prisma generate` و `prisma migrate deploy` هنگام Deploy اجرا شود.

### 2) Frontend روی Vercel

- یک Project جدید بسازید و **Root Directory** را روی `apps/frontend` بگذارید.
- Env زیر را ست کنید:

- `VITE_API_BASE_URL` = دامنه‌ی بک‌اند (مثلاً `https://your-backend.vercel.app`)

### تست سریع

- در فرانت، وارد شوید/استفاده کنید.
- سپس در بک‌اند:
  - `GET /healthz`
  - `GET /docs`

