# Hướng dẫn chỉnh sửa Frontend

Frontend đã được chuyển sang React + TypeScript + Vite.

## Khởi chạy

cd frontend

npm install
npm run dev
```

Mở địa chỉ Vite hiển thị trong terminal (thường là http://localhost:5173).

## Muốn chỉnh sửa thì vào đâu?

- **Toàn bộ giao diện và logic hiện tại:** `src/main.tsx`
- **CSS nền, font, hiệu ứng liquid-glass, scrollbar:** `src/index.css`
- **Trang HTML gốc của Vite:** `index.html`
- **Thư viện và lệnh chạy:** `package.json`
- **Cấu hình Tailwind:** `tailwind.config.js`
- **Cấu hình Vite:** `vite.config.ts`
- **Kết nối backend:** tìm hằng số `API_BASE` trong `src/main.tsx`
- **Đổi địa chỉ backend local:** sửa `VITE_API_BASE_URL` trong file `.env`
- **Dữ liệu mẫu dashboard:** tìm `InitialTestPlanData`, `InitialRecentRuns` và các mảng state trong `src/main.tsx`
- **Các khu vực chính:** tìm component `LandingHero`, `AuthModal`, `DashboardWorkspace`, `LandingNavbar`.

## Quy ước sửa nhanh

1. Sửa chữ/nội dung: tìm đoạn chữ trong `src/main.tsx`.
2. Sửa màu, khoảng cách, responsive: sửa class Tailwind tại component tương ứng.
3. Sửa hiệu ứng dùng chung: sửa `src/index.css`.
4. Tạo component mới: tạo file trong `src/components/`, sau đó import vào `src/main.tsx`.
5. Thêm trang/route: hiện app quản lý module bằng state `activeModule`; khi cần nhiều URL riêng, có thể thêm React Router.

## Tài khoản demo

- Username: `admin123`
- Password: `123`

## Lưu ý

`src/main.tsx` đang dùng `/* @ts-nocheck */` để giữ nguyên prototype trong giai đoạn chuyển đổi. Component mới nên viết TypeScript đầy đủ kiểu dữ liệu.

Backend nằm ở thư mục `../backend`. Xem `backend/README.md` để chạy API. Frontend hiện đọc API URL từ `.env`.

Swagger UI 

http://localhost:8081/docs