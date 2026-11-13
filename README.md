# PLAYLOG

PLAYLOG เป็นเว็บค้นหาและรีวิวเกม ผู้เข้าชมทั่วไปสามารถสำรวจคลังเกมและอ่านรีวิวได้ คนที่เป็นสมาชิกสามารถให้คะแนน เขียนรีวิว และบันทึกเกมโปรดได้ ส่วนผู้ดูแลระบบจัดการข้อมูลเกมและการรีวิว เช่น ลบรีวิว,เพิ่มเกม

เปิด PowerShell ที่โฟลเดอร์ `befe` แล้วรัน:

```powershell
.\scripts\run-local.ps1
```

## ตั้งบัญชี Admin เริ่มต้น

สมัครบัญชีในเว็บก่อน แล้วยืนยันอีเมล จากนั้นเปิด Supabase Dashboard ของโปรเจกต์ → **SQL Editor** → **New query** แล้วรันคำสั่งนี้ โดยแทนอีเมลตัวอย่างด้วยอีเมลของบัญชีที่จะเป็น Admin:

```sql
UPDATE auth.users
SET raw_app_meta_data =
  COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'admin')
WHERE lower(email) = lower('replace-with-admin-email@example.com');
```

ตรวจสอบ role ได้ด้วยคำสั่ง:

```sql
SELECT email, raw_app_meta_data->>'role' AS role
FROM auth.users
WHERE lower(email) = lower('replace-with-admin-email@example.com');
```

เมื่อผลลัพธ์เป็น `admin` ให้ออกจากระบบ PLAYLOG แล้วเข้าสู่ระบบใหม่ เพื่อรับ session ที่มีสิทธิ์ล่าสุด

```powershell
npm test -- --watchAll=false
npm run build
go test ./...
```
