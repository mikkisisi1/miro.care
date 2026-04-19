"""
Простое шифрование текста диалогов с психологом в MongoDB (at-rest).

Использует Fernet (AES-128-CBC + HMAC-SHA256) из пакета `cryptography`.
Ключ хранится в переменной окружения CHAT_ENCRYPTION_KEY.

Формат зашифрованной строки: "ENC1::<base64-fernet-token>"
Префикс нужен для обратной совместимости — старые незашифрованные записи
читаются как есть, без ошибки.
"""
import os
import logging
from cryptography.fernet import Fernet, InvalidToken

logger = logging.getLogger(__name__)

_ENC_PREFIX = "ENC1::"
_fernet: Fernet | None = None


def _get_fernet() -> Fernet:
    global _fernet
    if _fernet is None:
        key = os.environ.get("CHAT_ENCRYPTION_KEY")
        if not key:
            raise RuntimeError(
                "CHAT_ENCRYPTION_KEY is not set. Generate one with: "
                "python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
            )
        _fernet = Fernet(key.encode() if isinstance(key, str) else key)
    return _fernet


def encrypt_text(plaintext: str | None) -> str | None:
    """Шифрует строку. None/пустая строка возвращаются как есть."""
    if not plaintext:
        return plaintext
    try:
        token = _get_fernet().encrypt(plaintext.encode("utf-8")).decode("ascii")
        return _ENC_PREFIX + token
    except Exception as e:
        logger.error(f"encrypt_text failed: {e}")
        # Фейлим в открытую, чтобы не остаться без ключа и не записать plaintext молча
        raise


def decrypt_text(value: str | None) -> str | None:
    """Расшифровывает строку. Если она без префикса — возвращается как есть
    (обратная совместимость со старыми незашифрованными записями)."""
    if not value or not isinstance(value, str):
        return value
    if not value.startswith(_ENC_PREFIX):
        return value
    token = value[len(_ENC_PREFIX):]
    try:
        return _get_fernet().decrypt(token.encode("ascii")).decode("utf-8")
    except InvalidToken:
        logger.warning("decrypt_text: invalid token, returning raw value")
        return value
    except Exception as e:
        logger.error(f"decrypt_text failed: {e}")
        return value
