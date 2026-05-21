# KC Affiliate Dashboard

โปรเจกต์นี้ถูกจัดรูปแบบใหม่จากไฟล์ React หน้าเดียวให้พร้อมรันด้วย Vite และพร้อม deploy ขึ้น Firebase Hosting หรือ Vercel

## วิธีรันในเครื่อง

```bash
npm install
cp .env.example .env.local
npm run dev
```

จากนั้นแก้ค่าใน `.env.local` ให้ตรงกับ Firebase Project ของคุณ

## วิธี build

```bash
npm run build
```

## Deploy ขึ้น Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
npm run build
firebase deploy
```

ตอน `firebase init hosting` ให้เลือก:

- Public directory: `dist`
- Configure as single-page app: `Yes`

## หมายเหตุด้านความปลอดภัย

ไฟล์ `.env.local` ห้ามอัปขึ้น GitHub เพราะมีค่ารหัส login ชั่วคราว แม้จะย้ายออกจากไฟล์ App.jsx แล้ว แต่ค่า `VITE_*` ยังถูก bundle ไปที่ browser ได้ จึงไม่ควรใช้แทนระบบ login จริง

เวอร์ชัน production ควรเปลี่ยนเป็น Firebase Authentication + Firestore Security Rules
