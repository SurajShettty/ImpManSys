from datetime import datetime, timedelta, timezone
import bcrypt
from jose import JWTError, jwt
from app.config import get_settings

settings = get_settings()

# bcrypt operates on at most the first 72 bytes of the password.
_BCRYPT_MAX_BYTES = 72


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        plain_password.encode("utf-8")[:_BCRYPT_MAX_BYTES],
        hashed_password.encode("utf-8"),
    )


def get_password_hash(password: str) -> str:
    hashed = bcrypt.hashpw(
        password.encode("utf-8")[:_BCRYPT_MAX_BYTES],
        bcrypt.gensalt(),
    )
    return hashed.decode("utf-8")


def create_access_token(subject: str | int, expires_delta: timedelta | None = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)

    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt


def decode_access_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        return payload
    except JWTError:
        return None
