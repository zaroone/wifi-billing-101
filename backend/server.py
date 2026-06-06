from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="RT/RW Net Manager API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ===== HELPERS =====
def now_iso() -> str:
    d = datetime.now(timezone.utc)
    # Indonesia time-ish display (UTC+7) - convert for display
    from datetime import timedelta
    d_local = d + timedelta(hours=7)
    return d_local.strftime("%Y-%m-%d %H:%M")


def new_id() -> str:
    return uuid.uuid4().hex[:14]


def clean_doc(doc: dict) -> dict:
    if not doc:
        return doc
    doc.pop("_id", None)
    return doc


# ===== MODELS =====
class PSB(BaseModel):
    id: str = Field(default_factory=new_id)
    pemilik: str = ""
    nama_wifi: str = ""
    password_wifi: str = ""
    nama_client: str = ""
    paket: str = ""
    harga: float = 0
    tanggal_daftar: str = ""
    infrastruktur: str = ""
    status_client: str = "aktif"
    created_at: str = Field(default_factory=now_iso)


class PSBCreate(BaseModel):
    pemilik: str = ""
    nama_wifi: str
    password_wifi: str = ""
    nama_client: str
    paket: str = ""
    harga: float = 0
    tanggal_daftar: str = ""
    infrastruktur: str = ""
    status_client: str = "aktif"


class PSBUpdate(BaseModel):
    pemilik: Optional[str] = None
    nama_wifi: Optional[str] = None
    password_wifi: Optional[str] = None
    nama_client: Optional[str] = None
    paket: Optional[str] = None
    harga: Optional[float] = None
    tanggal_daftar: Optional[str] = None
    infrastruktur: Optional[str] = None
    status_client: Optional[str] = None


class Payment(BaseModel):
    id: str = Field(default_factory=new_id)
    psb_id: str = ""
    pemilik: str = ""
    nama_wifi: str = ""
    nama_client: str = ""
    paket: str = ""
    harga: float = 0
    periode: str = ""
    status_bayar: str = "BELUM"
    user_input: str = ""
    timestamp: str = ""
    created_at: str = Field(default_factory=now_iso)


class PaymentCreate(BaseModel):
    psb_id: str = ""
    pemilik: str = ""
    nama_wifi: str
    nama_client: str = ""
    paket: str = ""
    harga: float = 0
    periode: str
    status_bayar: str = "BELUM"
    user_input: str = ""
    timestamp: str = ""


class PaymentUpdate(BaseModel):
    status_bayar: Optional[str] = None
    user_input: Optional[str] = None
    timestamp: Optional[str] = None
    harga: Optional[float] = None


class LoginRequest(BaseModel):
    username: str
    password: str


class DeleteAllRequest(BaseModel):
    password: str


class GenerateRequest(BaseModel):
    periode: str
    password: str


class MarkLunasRequest(BaseModel):
    user_input: str


class BulkPSBImport(BaseModel):
    items: List[PSBCreate]


class BulkPaymentImport(BaseModel):
    items: List[PaymentCreate]


# ===== AUTH =====
VALID_USERS = {"jamil", "idham", "fachri"}
USER_PASSWORD = "101"
DELETE_ALL_PASSWORD = "251269"
GENERATE_PASSWORD = "101404"


@api_router.post("/auth/login")
async def login(req: LoginRequest):
    if req.username.lower() not in VALID_USERS:
        raise HTTPException(status_code=401, detail="User tidak ditemukan")
    if req.password != USER_PASSWORD:
        raise HTTPException(status_code=401, detail="Password salah")
    return {"ok": True, "username": req.username.lower()}


# ===== PSB =====
@api_router.get("/psb")
async def list_psb():
    docs = await db.psb.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return docs


@api_router.post("/psb")
async def create_psb(data: PSBCreate):
    obj = PSB(**data.model_dump())
    await db.psb.insert_one(obj.model_dump())
    return obj.model_dump()


@api_router.put("/psb/{psb_id}")
async def update_psb(psb_id: str, data: PSBUpdate):
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    res = await db.psb.update_one({"id": psb_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="PSB tidak ditemukan")
    doc = await db.psb.find_one({"id": psb_id}, {"_id": 0})
    return doc


@api_router.delete("/psb/{psb_id}")
async def delete_psb(psb_id: str):
    res = await db.psb.delete_one({"id": psb_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="PSB tidak ditemukan")
    return {"ok": True}


@api_router.post("/psb/delete-all")
async def delete_all_psb(req: DeleteAllRequest):
    if req.password != DELETE_ALL_PASSWORD:
        raise HTTPException(status_code=401, detail="Password salah")
    res = await db.psb.delete_many({})
    return {"ok": True, "deleted": res.deleted_count}


@api_router.post("/psb/import")
async def import_psb(payload: BulkPSBImport):
    existing = await db.psb.find({}, {"nama_client": 1, "_id": 0}).to_list(5000)
    existing_clients = {(p.get("nama_client") or "").strip() for p in existing}

    created = 0
    failed = []
    skipped = 0
    seen = set()

    for idx, item in enumerate(payload.items):
        client_name = (item.nama_client or "").strip()
        if not client_name or not item.nama_wifi:
            failed.append({"index": idx, "reason": "Nama WiFi atau Client kosong"})
            continue
        if client_name in existing_clients or client_name in seen:
            failed.append({"index": idx, "reason": f"Client '{client_name}' sudah ada"})
            skipped += 1
            continue
        if item.harga is None or item.harga <= 0:
            failed.append({"index": idx, "reason": "Harga tidak valid"})
            continue
        seen.add(client_name)
        obj = PSB(**item.model_dump())
        await db.psb.insert_one(obj.model_dump())
        created += 1

    return {"created": created, "failed": failed, "skipped": skipped}


# ===== PAYMENTS =====
@api_router.get("/payments")
async def list_payments(periode: Optional[str] = None):
    q = {}
    if periode:
        q["periode"] = periode
    docs = await db.payments.find(q, {"_id": 0}).sort("created_at", -1).to_list(5000)
    return docs


@api_router.get("/payments/periods")
async def list_periods():
    periods = await db.payments.distinct("periode")
    periods = [p for p in periods if p]
    periods.sort(reverse=True)
    return periods


@api_router.post("/payments")
async def create_payment(data: PaymentCreate):
    obj = Payment(**data.model_dump())
    await db.payments.insert_one(obj.model_dump())
    return obj.model_dump()


@api_router.put("/payments/{pay_id}")
async def update_payment(pay_id: str, data: PaymentUpdate):
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    res = await db.payments.update_one({"id": pay_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Payment tidak ditemukan")
    doc = await db.payments.find_one({"id": pay_id}, {"_id": 0})
    return doc


@api_router.post("/payments/{pay_id}/mark-lunas")
async def mark_lunas(pay_id: str, req: MarkLunasRequest):
    res = await db.payments.update_one(
        {"id": pay_id},
        {"$set": {
            "status_bayar": "LUNAS",
            "user_input": req.user_input,
            "timestamp": now_iso(),
        }},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Payment tidak ditemukan")
    doc = await db.payments.find_one({"id": pay_id}, {"_id": 0})
    return doc


@api_router.delete("/payments/{pay_id}")
async def delete_payment(pay_id: str):
    res = await db.payments.delete_one({"id": pay_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Payment tidak ditemukan")
    return {"ok": True}


@api_router.post("/payments/generate")
async def generate_payments(req: GenerateRequest):
    if req.password != GENERATE_PASSWORD:
        raise HTTPException(status_code=401, detail="Password salah")

    active_psb = await db.psb.find({"status_client": "aktif"}, {"_id": 0}).to_list(5000)
    existing = await db.payments.find(
        {"periode": req.periode}, {"nama_wifi": 1, "_id": 0}
    ).to_list(5000)
    existing_wifi = {(e.get("nama_wifi") or "").strip() for e in existing}

    created = 0
    skipped = 0
    docs = []
    for p in active_psb:
        wifi = (p.get("nama_wifi") or "").strip()
        if not wifi or wifi in existing_wifi:
            skipped += 1
            continue
        nama_client = (p.get("nama_client") or "").strip() or f"{wifi[:8]}_{int(p.get('harga') or 0)}"
        obj = Payment(
            psb_id=p.get("id", ""),
            pemilik=p.get("pemilik", ""),
            nama_wifi=wifi,
            nama_client=nama_client,
            paket=p.get("paket", ""),
            harga=float(p.get("harga") or 0),
            periode=req.periode,
            status_bayar="BELUM",
        )
        docs.append(obj.model_dump())
        existing_wifi.add(wifi)
        created += 1

    if docs:
        await db.payments.insert_many(docs)

    return {"created": created, "skipped": skipped}


@api_router.post("/payments/import")
async def import_payments(payload: BulkPaymentImport):
    created = 0
    failed = []
    for idx, item in enumerate(payload.items):
        if not item.nama_wifi or not item.periode:
            failed.append({"index": idx, "reason": "Nama WiFi atau Periode kosong"})
            continue
        obj = Payment(**item.model_dump())
        await db.payments.insert_one(obj.model_dump())
        created += 1
    return {"created": created, "failed": failed}


# ===== STATS =====
@api_router.get("/stats")
async def get_stats(periode: str):
    psb_total = await db.psb.count_documents({"status_client": "aktif"})
    payments_this = await db.payments.find({"periode": periode}, {"_id": 0}).to_list(5000)
    all_payments = await db.payments.find({}, {"_id": 0}).to_list(10000)

    lunas = [p for p in payments_this if p.get("status_bayar") == "LUNAS"]
    belum = [p for p in payments_this if p.get("status_bayar") == "BELUM"]
    total_bayar = sum(float(p.get("harga") or 0) for p in lunas)

    # income per month
    income_map = {}
    for p in all_payments:
        if p.get("status_bayar") == "LUNAS":
            per = p.get("periode") or ""
            income_map[per] = income_map.get(per, 0) + float(p.get("harga") or 0)

    # per operator income
    user_map = {"jamil": 0, "idham": 0, "fachri": 0}
    for p in all_payments:
        if p.get("status_bayar") == "LUNAS":
            u = (p.get("user_input") or "").lower()
            if u in user_map:
                user_map[u] += float(p.get("harga") or 0)

    total_income_all = sum(float(p.get("harga") or 0) for p in all_payments if p.get("status_bayar") == "LUNAS")

    # recent activity (last 8 lunas-marked payments)
    recent = sorted(
        [p for p in all_payments if p.get("timestamp")],
        key=lambda x: x.get("timestamp") or "",
        reverse=True,
    )[:8]

    return {
        "total_pelanggan": psb_total,
        "total_bayar_bulan_ini": total_bayar,
        "lunas_count": len(lunas),
        "belum_count": len(belum),
        "total_income_all": total_income_all,
        "income_per_month": income_map,
        "income_per_user": user_map,
        "recent_activity": recent,
    }


# ===== MONITORING =====
@api_router.get("/monitoring/belum-bayar")
async def belum_bayar(periode: str):
    payments = await db.payments.find(
        {"periode": periode, "status_bayar": "BELUM"}, {"_id": 0}
    ).to_list(5000)
    psb_list = await db.psb.find({}, {"_id": 0}).to_list(5000)
    wifi_to_owner = {p.get("nama_wifi"): p.get("pemilik", "-") for p in psb_list}

    enriched = []
    summary = {}
    for p in payments:
        owner = p.get("pemilik") or wifi_to_owner.get(p.get("nama_wifi"), "-") or "-"
        p["pemilik"] = owner
        enriched.append(p)
        summary[owner] = summary.get(owner, 0) + float(p.get("harga") or 0)

    total = sum(summary.values())
    return {
        "items": enriched,
        "summary_per_owner": summary,
        "total_tunggakan": total,
    }


@api_router.get("/")
async def root():
    return {"message": "RT/RW Net Manager API"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
