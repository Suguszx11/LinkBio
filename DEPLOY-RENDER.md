# LinkBio — Deploy on Render

## 1. เตรียมโปรเจกต์
- ใช้ Node.js Web Service
- Build: `npm install`
- Start: `npm start`
- Port ใช้ `process.env.PORT || 3000`

## 2. อัปขึ้น GitHub
สร้าง Repository ใหม่ แล้วอัปโหลดไฟล์ทั้งหมดในโฟลเดอร์ LinkBio
ห้ามอัปโหลด `node_modules` หรือไฟล์ `.env`

## 3. สร้างบริการบน Render
1. เข้า Render แล้วเลือก New > Web Service
2. เชื่อม GitHub Repository ของ LinkBio
3. Runtime: Node
4. Build Command: `npm install`
5. Start Command: `npm start`
6. Plan: Free
7. กด Create Web Service

## 4. หลัง Deploy
เปิด URL ที่ Render สร้างให้ แล้วทดสอบหน้าเว็บ, `/admin/` และ API

## หมายเหตุสำคัญ
โปรเจกต์ปัจจุบันเก็บ JSON และ uploads บนดิสก์ของเครื่องเซิร์ฟเวอร์
Free hosting อาจลบข้อมูลไฟล์เมื่อ service restart/redeploy
ถ้าจะใช้งานจริงระยะยาว ควรย้ายข้อมูลไปฐานข้อมูลและ Object Storage
