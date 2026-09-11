"""Authentication & user management — MongoDB users + JWT tokens.

Account model
-------------
There is exactly one admin account, provisioned from ADMIN_EMAIL /
ADMIN_PASSWORD / ADMIN_NAME in the environment on every startup (see
``ensure_admin_user``). There is no public sign-up: every other account is
created by the admin through ``POST /api/admin/users`` and must use a
business email address (personal providers like gmail/yahoo/outlook are
rejected — see ``settings.blocked_email_domains``).
"""
from __future__ import annotations

import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Optional

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import bcrypt
from jose import JWTError, jwt
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pydantic import BaseModel, EmailStr, field_validator

from app.config import settings

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# MongoDB connection (managed via FastAPI lifespan in main.py)
# ---------------------------------------------------------------------------
_client: Optional[AsyncIOMotorClient] = None
_db: Optional[AsyncIOMotorDatabase] = None


async def connect_db() -> None:
    """Open the MongoDB connection, create indexes, and provision the admin."""
    global _client, _db
    if not settings.MONGODB_URI:
        raise RuntimeError(
            "MONGODB_URI is not set — copy backend/.env.example to backend/.env "
            "and fill in your MongoDB connection string."
        )
    _client = AsyncIOMotorClient(settings.MONGODB_URI)
    _db = _client[settings.MONGODB_DB_NAME]
    await _db.users.create_index("email", unique=True)
    await _db.submissions.create_index("id", unique=True)
    await _db.submissions.create_index([("user_email", 1), ("updated_at", -1)])
    log.info("MongoDB connected -> %s", settings.MONGODB_DB_NAME)
    await ensure_admin_user()


async def close_db() -> None:
    """Close the MongoDB connection."""
    global _client, _db
    if _client:
        _client.close()
        _client = None
        _db = None
    log.info("MongoDB disconnected")


def get_db() -> AsyncIOMotorDatabase:
    """Return the active database handle."""
    if _db is None:
        raise RuntimeError("MongoDB not connected — check MONGODB_URI in .env")
    return _db


# ---------------------------------------------------------------------------
# Admin bootstrap — the one admin account lives in the env, not in a form
# ---------------------------------------------------------------------------
async def ensure_admin_user() -> None:
    """Create or sync the single admin account from ADMIN_EMAIL/ADMIN_PASSWORD.

    The env vars are the source of truth: on every startup the admin's
    password hash is re-derived from ADMIN_PASSWORD, so rotating the secret
    in .env and restarting the API is enough to change the admin's password.
    """
    if not settings.ADMIN_EMAIL or not settings.ADMIN_PASSWORD:
        log.warning(
            "ADMIN_EMAIL / ADMIN_PASSWORD not set — no admin account provisioned. "
            "Set both in backend/.env to enable admin login."
        )
        return

    db = get_db()
    email = settings.ADMIN_EMAIL.strip().lower()
    now = datetime.now(timezone.utc).isoformat()
    await db.users.update_one(
        {"email": email},
        {
            "$set": {
                "name": settings.ADMIN_NAME or "Administrator",
                "email": email,
                "hashed_password": hash_password(settings.ADMIN_PASSWORD),
                "role": "admin",
                "status": "active",
                "country": "",
                "phone": "",
                "company": "",
                "forms_filled_count": 0,
                "free_tier_limit": 999999,
                "is_subscribed": True,
            },
            "$setOnInsert": {"created_at": now, "created_by": "system"},
        },
        upsert=True,
    )
    # Guarantee exactly one admin account, even if the env email changed.
    await db.users.update_many(
        {"role": "admin", "email": {"$ne": email}},
        {"$set": {"role": "user"}},
    )
    log.info("Admin account ready -> %s", email)


# ---------------------------------------------------------------------------
# Password hashing (bcrypt)
# ---------------------------------------------------------------------------
def hash_password(plain: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(plain.encode("utf-8")[:72], salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8")[:72], hashed.encode("utf-8"))
    except Exception:
        return False


PASSWORD_MIN_LEN = 8


def validate_password_strength(password: str) -> Optional[str]:
    """Return an error message if the password is too weak, else None."""
    if len(password) < PASSWORD_MIN_LEN:
        return f"Password must be at least {PASSWORD_MIN_LEN} characters"
    if not re.search(r"[A-Za-z]", password) or not re.search(r"\d", password):
        return "Password must contain both letters and numbers"
    return None


def is_business_email(email: str) -> bool:
    """Reject free/consumer email providers — only business domains may log in."""
    domain = email.strip().lower().rsplit("@", 1)[-1]
    return domain not in settings.blocked_email_domains


# ---------------------------------------------------------------------------
# JWT tokens
# ---------------------------------------------------------------------------
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def _serialize_user(user: dict) -> dict:
    return {
        "id": str(user["_id"]),
        "name": user["name"],
        "email": user["email"],
        "role": user.get("role", "user"),
        "status": user.get("status", "active"),
        "country": user.get("country", ""),
        "phone": user.get("phone", ""),
        "company": user.get("company", ""),
        "forms_filled_count": user.get("forms_filled_count", 0),
        "free_tier_limit": user.get("free_tier_limit", 1),
        "is_subscribed": user.get("is_subscribed", False),
        "created_at": user.get("created_at", ""),
        "last_login_at": user.get("last_login_at"),
    }


async def increment_user_form_fill(email: str) -> int:
    """Atomically increment the user's filled forms count in MongoDB and return new count."""
    db = get_db()
    res = await db.users.find_one_and_update(
        {"email": email.strip().lower()},
        {"$inc": {"forms_filled_count": 1}},
        return_document=True,
    )
    if res:
        return res.get("forms_filled_count", 1)
    return 1


async def get_current_user(token: Optional[str] = Depends(oauth2_scheme)) -> Optional[dict]:
    """Decode JWT and return user dict, or None if no/invalid token."""
    if not token:
        return None
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        email: Optional[str] = payload.get("sub")
        if email is None:
            return None
    except JWTError:
        return None

    db = get_db()
    user = await db.users.find_one({"email": email})
    if user is None or user.get("status") == "disabled":
        return None
    return _serialize_user(user)


async def require_current_user(
    user: Optional[dict] = Depends(get_current_user),
) -> dict:
    """Like get_current_user but raises 401 if not authenticated."""
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


async def require_admin(user: dict = Depends(require_current_user)) -> dict:
    """Like require_current_user but raises 403 unless the caller is the admin."""
    if user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user


def _object_id(user_id: str) -> ObjectId:
    try:
        return ObjectId(user_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid user id")


# ---------------------------------------------------------------------------
# Pydantic request / response models
# ---------------------------------------------------------------------------
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    status: str
    country: str = ""
    phone: str = ""
    company: str = ""
    forms_filled_count: int = 0
    free_tier_limit: int = 1
    is_subscribed: bool = False
    created_at: str
    last_login_at: Optional[str] = None


class AuthResponse(BaseModel):
    token: str
    user: UserResponse


class CreateUserRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    country: str
    phone: str
    company: str = ""

    @field_validator("name", "country", "phone")
    @classmethod
    def _not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("This field is required")
        return v


class UpdateUserRequest(BaseModel):
    status: Optional[str] = None       # "active" | "disabled"
    country: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    password: Optional[str] = None     # admin-triggered password reset

    @field_validator("status")
    @classmethod
    def _valid_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ("active", "disabled"):
            raise ValueError("status must be 'active' or 'disabled'")
        return v


# ---------------------------------------------------------------------------
# Router — /api/auth/*  (public: login + me)
# ---------------------------------------------------------------------------
auth_router = APIRouter(prefix="/api/auth", tags=["auth"])


@auth_router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(body: CreateUserRequest) -> AuthResponse:
    """Public self-service sign-up. Still gated to business email addresses
    and always creates a plain "user" account — never admin."""
    db = get_db()
    email = str(body.email).strip().lower()

    if not is_business_email(email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please use a business email address — personal providers "
            "(Gmail, Yahoo, Outlook, etc.) are not allowed.",
        )

    weak = validate_password_strength(body.password)
    if weak:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=weak)

    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    now = datetime.now(timezone.utc).isoformat()
    user_doc = {
        "name": body.name.strip(),
        "email": email,
        "hashed_password": hash_password(body.password),
        "role": "user",
        "status": "active",
        "country": body.country.strip(),
        "phone": body.phone.strip(),
        "company": body.company.strip(),
        "forms_filled_count": 0,
        "free_tier_limit": 1,
        "is_subscribed": False,
        "created_at": now,
        "created_by": "self-registered",
        "last_login_at": now,
    }
    result = await db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id
    log.info("Self-registered new user %s", email)

    token = create_access_token({"sub": email, "role": "user"})
    return AuthResponse(token=token, user=UserResponse(**_serialize_user(user_doc)))


@auth_router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest) -> AuthResponse:
    """Authenticate and return a JWT token. Every account — self-registered or
    admin-created — already passed the business-email check at creation time."""
    db = get_db()
    email = str(body.email).strip().lower()
    user = await db.users.find_one({"email": email})

    if not user or not verify_password(body.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if user.get("status") == "disabled":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been disabled. Contact your administrator.",
        )

    now = datetime.now(timezone.utc).isoformat()
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"last_login_at": now}})
    user["last_login_at"] = now

    token = create_access_token({"sub": user["email"], "role": user.get("role", "user")})
    log.info("Login success for %s", email)

    return AuthResponse(token=token, user=UserResponse(**_serialize_user(user)))


@auth_router.get("/me", response_model=UserResponse)
async def me(user: dict = Depends(require_current_user)) -> UserResponse:
    """Return the currently authenticated user."""
    return UserResponse(**user)


class SimulateUpgradeRequest(BaseModel):
    is_subscribed: bool = True
    reset_count: bool = False


@auth_router.post("/simulate-upgrade", response_model=UserResponse)
async def simulate_upgrade(
    body: SimulateUpgradeRequest,
    user: dict = Depends(require_current_user),
) -> UserResponse:
    """Simulate plan upgrade or reset for testing."""
    db = get_db()
    updates: dict = {"is_subscribed": body.is_subscribed}
    if body.reset_count:
        updates["forms_filled_count"] = 0
    res = await db.users.find_one_and_update(
        {"email": user["email"]},
        {"$set": updates},
        return_document=True,
    )
    if not res:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(**_serialize_user(res))


# ---------------------------------------------------------------------------
# Router — /api/admin/users/*  (admin-only: create & manage accounts)
# ---------------------------------------------------------------------------
admin_router = APIRouter(
    prefix="/api/admin/users", tags=["admin"], dependencies=[Depends(require_admin)]
)


@admin_router.get("", response_model=list[UserResponse])
async def list_users() -> list[UserResponse]:
    """List every user account, newest first."""
    db = get_db()
    users = await db.users.find().sort("created_at", -1).to_list(length=None)
    return [UserResponse(**_serialize_user(u)) for u in users]


@admin_router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    body: CreateUserRequest, admin: dict = Depends(require_admin)
) -> UserResponse:
    """Create a new business-account user. Admin-only."""
    db = get_db()
    email = str(body.email).strip().lower()

    if not is_business_email(email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please use a business email address — personal providers "
            "(Gmail, Yahoo, Outlook, etc.) are not allowed.",
        )

    weak = validate_password_strength(body.password)
    if weak:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=weak)

    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    now = datetime.now(timezone.utc).isoformat()
    user_doc = {
        "name": body.name.strip(),
        "email": email,
        "hashed_password": hash_password(body.password),
        "role": "user",
        "status": "active",
        "country": body.country.strip(),
        "phone": body.phone.strip(),
        "company": body.company.strip(),
        "forms_filled_count": 0,
        "free_tier_limit": 1,
        "is_subscribed": False,
        "created_at": now,
        "created_by": admin["email"],
        "last_login_at": None,
    }
    result = await db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id
    log.info("Admin %s created user %s", admin["email"], email)
    return UserResponse(**_serialize_user(user_doc))


@admin_router.patch("/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, body: UpdateUserRequest) -> UserResponse:
    """Update a user's status/profile fields, or reset their password."""
    db = get_db()
    oid = _object_id(user_id)
    target = await db.users.find_one({"_id": oid})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.get("role") == "admin":
        raise HTTPException(status_code=400, detail="The admin account cannot be modified here")

    updates: dict = {}
    if body.status is not None:
        updates["status"] = body.status
    if body.country is not None:
        updates["country"] = body.country.strip()
    if body.phone is not None:
        updates["phone"] = body.phone.strip()
    if body.company is not None:
        updates["company"] = body.company.strip()
    if body.password:
        weak = validate_password_strength(body.password)
        if weak:
            raise HTTPException(status_code=400, detail=weak)
        updates["hashed_password"] = hash_password(body.password)

    if updates:
        await db.users.update_one({"_id": oid}, {"$set": updates})
        target.update(updates)

    return UserResponse(**_serialize_user(target))


@admin_router.delete(
    "/{user_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None
)
async def delete_user(user_id: str) -> None:
    """Permanently remove a user account."""
    db = get_db()
    oid = _object_id(user_id)
    target = await db.users.find_one({"_id": oid})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.get("role") == "admin":
        raise HTTPException(status_code=400, detail="The admin account cannot be deleted")
    await db.users.delete_one({"_id": oid})
