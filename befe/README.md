# PLAYLOG — รีวิวและให้คะแนนเกม

เว็บไซต์แคตตาล็อก 150 เกมพร้อมคะแนนเฉลี่ยจากโหวตจริงใน Supabase

## ขอบเขตผู้ใช้

- **Guest:** ดูและค้นหาเกม อ่านรายละเอียดและรีวิวชุมชนได้ โดยไม่ต้องสมัครบัญชี
- **Member:** สมัคร/เข้าสู่ระบบ ให้คะแนน 1–10 เขียนรีวิว และบันทึกเกมโปรด
- **Admin:** เพิ่ม แก้ไข และลบข้อมูลเกม รวมถึงนำรีวิวที่ไม่เหมาะสมออก

## โครงสร้างและเทคโนโลยี

- `src/pages/` — route pages หลักของหน้าร้าน (`Storefront`) และ Admin (`AdminPage`)
- `src/components/storefront/` — ส่วนประกอบหน้าร้าน เช่น header, hero carousel, คลังเกม, community และ footer
- `src/components/admin/` — header, ฟอร์ม/ตารางจัดการเกม และรายการรีวิวของหน้า Admin
- `src/components/dialogs/` — dialog รายละเอียดเกม, สมัคร/เข้าสู่ระบบ, โปรไฟล์ และเขียนรีวิว พร้อม component tests
- `src/services/` — การเรียก REST API จาก frontend
- `src/data/` และ `src/utils/` — ตัวเลือกหมวดหมู่และ helper สำหรับบัญชี/แหล่งจำหน่ายเกม
- `src/styles/` — stylesheet ของหน้าร้านและหน้า Admin
- `backend/main.go` — REST API เขียนด้วย Go standard library
- `supabase/` — schema, RLS policies, seed เกม และ SQL ตั้งผู้ดูแลคนแรก
- `api/config.js` — Vercel Function ส่งค่าตั้งต้นจาก Render ให้ frontend
- `package.json` — React 19, React Router 6, Tailwind CSS 3 และ Create React App
- `render.yaml` — Blueprint สำหรับ Go Web Service บน Render
- `vercel.json` — ตั้ง frontend เป็น static output บน Vercel

## ตั้งค่า Supabase

1. สร้างโปรเจกต์ Supabase แล้วเปิด **Project Settings → API** เพื่อคัดลอก Project URL และ Publishable key (หรือ anon key แบบเดิม)
2. ใน **SQL Editor** รันไฟล์ใน `supabase/migrations/` ตามลำดับชื่อ:
   - `20261110000100_playlog_ratings.sql` — ตารางเกม คะแนน รีวิว เกมโปรด และ RLS policies
   - `20261111000100_game_store_links.sql` — ลิงก์แหล่งจำหน่ายเกม
   - `20261111000200_unique_display_names.sql` — ป้องกันชื่อแสดงผลซ้ำ (ไม่สนตัวพิมพ์ใหญ่/เล็ก)
3. รัน `supabase/seed.sql` เพื่อเพิ่มข้อมูลเกม 150 รายการ (ไม่มีคะแนนตัวอย่าง)
4. เปิด Email provider ใน **Authentication → Sign In / Providers** และตั้ง Site URL/Redirect URL ให้ตรงกับเว็บที่จะใช้ (local คือ `http://localhost:10000`)
5. สมัครบัญชีผ่านหน้าเว็บ ยืนยันอีเมลหาก Supabase ขอให้ยืนยัน
6. แก้อีเมลตัวอย่างใน `supabase/admin-setup.sql` ให้เป็นอีเมลผู้ดูแล แล้วรัน SQL นั้น ออกจากระบบและเข้าสู่ระบบใหม่

สิทธิ์ Admin ใช้ `app_metadata.role` ซึ่งผู้ใช้ทั่วไปแก้ไขเองไม่ได้ ระบบไม่เชื่อถือ `user_metadata` ในการกำหนดสิทธิ์

ถ้ามี migration ใหม่ ให้รันเฉพาะไฟล์ migration ที่ยังไม่ได้ใช้ เรียงตามชื่อไฟล์ หลีกเลี่ยงการแก้และรัน migration เก่าซ้ำในฐานข้อมูลที่มีข้อมูลแล้ว ส่วน `supabase/seed.sql` รันซ้ำได้เมื่อต้องการอัปเดตข้อมูลเกม เพราะใช้ `on conflict` จึงไม่เพิ่มเกมซ้ำ

## ตัวแปรเชื่อมต่อ

ตั้ง `SUPABASE_URL` และ `SUPABASE_ANON_KEY` (ใส่ Publishable key ได้) บน Render ส่วน `RENDER_API_URL` บน Vercel ให้ชี้ไป URL ของ Go API บน Render ตัวอย่างตัวแปรอยู่ใน `.env.example` ค่า `FRONTEND_ORIGIN` บน Render ต้องตรงกับ origin ของเว็บ Vercel ที่ deploy จริง

อย่าใช้ service-role/secret key ใน frontend หรืออัปโหลดขึ้น repository

## รันในเครื่อง (Windows PowerShell)

```powershell
Copy-Item .env.example .env
# แก้ SUPABASE_URL และ SUPABASE_ANON_KEY ใน .env แล้วรัน:
.\scripts\run-local.ps1
```

สคริปต์ติดตั้ง npm dependencies ครั้งแรก, สร้าง React production build แล้วเปิด Go API ที่ `http://localhost:10000` ซึ่งจะ serve หน้าเว็บจาก `build/` การเรียก API ในเครื่องยังคงใช้ Go ที่พอร์ต 10000 เหมือนเดิม

หากต้องการทำงาน frontend อย่างเดียว ใช้ `npm start` (ต้องเปิด Go API แยกที่พอร์ต 10000 เพื่อให้ proxy API ทำงาน)

## สร้างไฟล์ seed ใหม่

แก้ `data/games.json` แล้วรัน `npm run seed:sql` เพื่อสร้าง `supabase/seed.sql`

เว็บและ API จะเปิดที่ `http://localhost:10000` เมื่อ Supabase ตั้งค่าและรัน SQL แล้ว ส่วนการเชื่อมบัญชีและ deploy บน Vercel, Render และ Supabase ต้องทำในบัญชีของเจ้าของโปรเจกต์

