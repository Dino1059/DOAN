"""Nơi lưu file bằng chứng lớn (ảnh chụp, ảnh diff). DB chỉ giữ `storage_key`.

LocalStorage: thư mục trên đĩa (settings.artifacts_dir). Sau này thêm S3Storage cùng 4 hàm là đổi được.
"""
import shutil
from pathlib import Path


class LocalStorage:
    def __init__(self, root: Path) -> None:
        self.root = Path(root).resolve()

    def _path(self, key: str) -> Path:
        path = (self.root / key).resolve()
        # Chặn key kiểu "../../etc/passwd" thoát ra ngoài thư mục lưu trữ
        if path != self.root and self.root not in path.parents:
            raise ValueError(f"Invalid storage key: {key!r}")
        return path

    def save(self, key: str, data: bytes) -> str:
        path = self._path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        return key

    def path(self, key: str) -> Path:
        """Đường dẫn file để trả về (FileResponse). Không có file → FileNotFoundError."""
        path = self._path(key)
        if not path.is_file():
            raise FileNotFoundError(key)
        return path

    def read(self, key: str) -> bytes:
        return self.path(key).read_bytes()

    def delete_prefix(self, prefix: str) -> None:
        """Xoá cả thư mục (vd: 'runs/RUN-…') khi xoá run."""
        path = self._path(prefix)
        if path.is_dir():
            shutil.rmtree(path)
        elif path.is_file():
            path.unlink()
