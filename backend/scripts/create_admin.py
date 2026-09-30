"""Đặt mật khẩu cho tài khoản demo (M7). Chạy: python -m scripts.create_admin [--password 123]

Migration 0005 đã tạo user demo (settings.demo_user_id, username admin123) nhưng CHƯA có mật khẩu,
để không có mật khẩu yếu nằm sẵn trong code. Script này băm mật khẩu bằng Argon2id rồi lưu vào DB.
Mặc định admin123 / 123 theo kịch bản demo — không dùng mật khẩu này ngoài máy local.
"""
import argparse
import asyncio

from sqlalchemy import select

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import SessionLocal, engine
from app.modules.auth.models import User


async def main(username: str, password: str) -> None:
    async with SessionLocal() as session:
        user = await session.get(User, settings.demo_user_id)
        if user is None:  # DB cũ chưa có user demo (hiếm): tạo mới
            clash = (await session.execute(select(User).where(User.username == username))).scalar_one_or_none()
            if clash:
                raise SystemExit(f"Username {username!r} is already used by {clash.id}")
            user = User(id=settings.demo_user_id, username=username, email=f"{username}@example.com",
                        display_name="Administrator")
            session.add(user)
        user.username = username.lower()
        user.password_hash = hash_password(password)
        await session.commit()
    await engine.dispose()
    print(f"OK: sign in as {username.lower()!r} (user id {settings.demo_user_id}).")
    if len(password) < 8:
        print("WARNING: this password is shorter than 8 characters — demo use on your own machine only.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Set the demo account's password")
    parser.add_argument("--username", default="admin123")
    parser.add_argument("--password", default="123")
    args = parser.parse_args()
    asyncio.run(main(args.username, args.password))
