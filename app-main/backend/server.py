from fastapi import FastAPI, APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse, HTMLResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import io
import hmac
import hashlib
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Dict, Any
import uuid
from datetime import datetime, timezone, date, timedelta

import razorpay
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

ROLE_PASSWORDS = {
    "admin": os.environ.get("ADMIN_PASSWORD", ""),
    "master": os.environ.get("MASTER_PASSWORD", ""),
    "chef": os.environ.get("CHEF_PASSWORD", ""),
}

RAZORPAY_SETTINGS_ID = "razorpay"

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

api_router = APIRouter(prefix="/api")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def get_next_token_number() -> int:
    counter = await db.order_counters.find_one_and_update(
        {"_id": "token_number"},
        {"$inc": {"value": 1}},
        return_document=True,
        upsert=True
    )
    return counter["value"]


def make_order_id() -> str:
    now = datetime.now(timezone.utc)
    return f"{now:%d-%m-%Y-%H:%M:%S}-{uuid.uuid4().hex[:8].upper()}"


# ---------- Models ----------
class Category(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    created_at: str = Field(default_factory=now_iso)


class CategoryCreate(BaseModel):
    name: str


class CategoryUpdate(BaseModel):
    name: str


ItemTag = Literal["most_selling", "must_buy"]


class MenuItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    price: float
    category: str
    tag: Optional[ItemTag] = None
    image_base64: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)


class MenuItemCreate(BaseModel):
    name: str
    price: float
    category: str
    tag: Optional[ItemTag] = None
    image_base64: Optional[str] = None


class MenuItemUpdate(BaseModel):
    name: str
    price: float
    tag: Optional[ItemTag] = None
    image_base64: Optional[str] = None


class OrderItem(BaseModel):
    menu_item_id: str
    name: str
    price: float
    quantity: int
    image_base64: Optional[str] = None


class Order(BaseModel):
    id: str = Field(default_factory=make_order_id)
    token_number: int = 0
    items: List[OrderItem]
    total: float
    status: Literal["pending", "preparing", "completed", "cancelled"] = "pending"
    payment_status: Literal["unpaid", "paid"] = "unpaid"
    payment: Optional[Dict[str, Any]] = None
    table_number: Optional[str] = None
    notes: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)


class OrderCreate(BaseModel):
    items: List[OrderItem]
    table_number: Optional[str] = None
    notes: Optional[str] = None


class OrderStatusUpdate(BaseModel):
    status: Literal["pending", "preparing", "completed", "cancelled"]


class AuthRequest(BaseModel):
    role: Literal["admin", "master", "chef"]
    password: str


class RazorpaySettingsIn(BaseModel):
    key_id: str
    key_secret: str


class FinalizePayload(BaseModel):
    razorpay_payment_id: str
    razorpay_signature: str


# ---------- Helpers ----------
def _mask_key_id(key_id: str) -> str:
    if not key_id:
        return ""
    if len(key_id) <= 8:
        return "****"
    return f"{key_id[:6]}****{key_id[-4:]}"


async def _get_rzp_settings() -> Optional[dict]:
    return await db.razorpay_settings.find_one({"_id": RAZORPAY_SETTINGS_ID}, {"_id": 0})


def _rzp_client(settings: dict) -> razorpay.Client:
    return razorpay.Client(auth=(settings["key_id"], settings["key_secret"]))


# ---------- Routes ----------
@api_router.get("/")
async def root():
    return {"message": "ServeSync API"}


@api_router.post("/auth/verify")
async def verify_role(payload: AuthRequest):
    expected = ROLE_PASSWORDS.get(payload.role, "")
    if not expected or payload.password != expected:
        raise HTTPException(status_code=401, detail="Invalid password")
    return {"ok": True, "role": payload.role}


# Categories
@api_router.get("/categories", response_model=List[Category])
async def list_categories():
    cats = await db.categories.find({}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    print(f"DEBUG: Found {len(cats)} categories", flush=True)
    return [Category(**c) for c in cats]


@api_router.post("/categories", response_model=Category)
async def create_category(payload: CategoryCreate):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Category name required")
    existing = await db.categories.find_one({"name": name}, {"_id": 0})
    if existing:
        return Category(**existing)
    cat = Category(name=name)
    await db.categories.insert_one(cat.dict())
    return cat


@api_router.patch("/categories/{cat_id}", response_model=Category)
async def update_category(cat_id: str, payload: CategoryUpdate):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Category name required")
    
    result = await db.categories.find_one_and_update(
        {"id": cat_id},
        {"$set": {"name": name}},
        return_document=True,
        projection={"_id": 0},
    )
    if not result:
        raise HTTPException(status_code=404, detail="Category not found")
    return Category(**result)


@api_router.delete("/categories/{cat_id}")
async def delete_category(cat_id: str):
    print(f"DEBUG: Attempting to delete category {cat_id}", flush=True)
    cat = await db.categories.find_one({"id": cat_id}, {"_id": 0})
    if not cat:
        print(f"DEBUG: Category {cat_id} not found", flush=True)
        raise HTTPException(status_code=404, detail="Category not found")
    print(f"DEBUG: Found category, deleting...", flush=True)
    await db.menu_items.delete_many({"category": cat["name"]})
    await db.categories.delete_one({"id": cat_id})
    print(f"DEBUG: Category {cat_id} deleted", flush=True)
    return {"ok": True}


# Menu
@api_router.get("/menu", response_model=List[MenuItem])
async def list_menu(category: Optional[str] = None):
    query = {}
    if category:
        query["category"] = category
    items = await db.menu_items.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [MenuItem(**it) for it in items]


@api_router.post("/menu", response_model=MenuItem)
async def create_menu_item(payload: MenuItemCreate):
    if not payload.category.strip():
        raise HTTPException(status_code=400, detail="Category required")
    item = MenuItem(**payload.dict())
    await db.menu_items.insert_one(item.dict())
    return item


@api_router.patch("/menu/{item_id}", response_model=MenuItem)
async def update_menu_item(item_id: str, payload: MenuItemUpdate):
    result = await db.menu_items.find_one_and_update(
        {"id": item_id},
        {"$set": {
            "name": payload.name.strip(),
            "price": payload.price,
            "tag": payload.tag,
            "image_base64": payload.image_base64,
        }},
        return_document=True,
        projection={"_id": 0},
    )
    if not result:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return MenuItem(**result)


@api_router.delete("/menu/{item_id}")
async def delete_menu_item(item_id: str):
    result = await db.menu_items.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return {"ok": True}


# Orders
@api_router.get("/orders", response_model=List[Order])
async def list_orders(status: Optional[str] = None):
    try:
        query = {}
        if status:
            query["status"] = status
        orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(2000)
        logger.info(f"Found {len(orders)} orders with status filter: {status}")
        return [Order(**o) for o in orders]
    except Exception as e:
        logger.error(f"Error listing orders: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error listing orders: {str(e)}")  


@api_router.post("/orders", response_model=Order)
async def create_order(payload: OrderCreate):
    try:
        if not payload.items:
            raise HTTPException(status_code=400, detail="Order must contain at least one item")
        total = sum(i.price * i.quantity for i in payload.items)
        token_number = await get_next_token_number()
        order = Order(
            token_number=token_number,
            items=payload.items,
            total=round(total, 2),
            table_number=payload.table_number,
            notes=payload.notes,
            payment_status="unpaid",
        )
        await db.orders.insert_one(order.dict())
        return order
    except Exception as e:
        logger.error(f"Error creating order: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error creating order: {str(e)}")


@api_router.patch("/orders/{order_id}/status", response_model=Order)
async def update_order_status(order_id: str, payload: OrderStatusUpdate):
    updated_at = now_iso()
    result = await db.orders.find_one_and_update(
        {"id": order_id},
        {"$set": {"status": payload.status, "updated_at": updated_at}},
        return_document=True,
        projection={"_id": 0},
    )
    if not result:
        raise HTTPException(status_code=404, detail="Order not found")
    return Order(**result)


@api_router.delete("/orders/{order_id}")
async def delete_order(order_id: str):
    try:
        result = await db.orders.delete_one({"id": order_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Order not found")
        logger.info(f"Order {order_id} deleted")
        return {"ok": True}
    except Exception as e:
        logger.error(f"Error deleting order: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error deleting order: {str(e)}")


# Razorpay settings
@api_router.get("/razorpay/settings/status")
async def rzp_status():
    s = await _get_rzp_settings()
    if not s:
        return {"configured": False, "key_id_masked": None}
    return {"configured": True, "key_id_masked": _mask_key_id(s.get("key_id", ""))}


@api_router.post("/razorpay/settings")
async def rzp_save_settings(payload: RazorpaySettingsIn):
    key_id = payload.key_id.strip()
    key_secret = payload.key_secret.strip()
    if not key_id or not key_secret:
        raise HTTPException(status_code=400, detail="key_id and key_secret required")
    await db.razorpay_settings.update_one(
        {"_id": RAZORPAY_SETTINGS_ID},
        {"$set": {"key_id": key_id, "key_secret": key_secret, "updated_at": now_iso()}},
        upsert=True,
    )
    return {"ok": True, "key_id_masked": _mask_key_id(key_id)}


@api_router.delete("/razorpay/settings")
async def rzp_clear_settings():
    await db.razorpay_settings.delete_one({"_id": RAZORPAY_SETTINGS_ID})
    return {"ok": True}


# Payment intents
@api_router.post("/razorpay/intent")
async def rzp_create_intent(payload: OrderCreate):
    if not payload.items:
        raise HTTPException(status_code=400, detail="Order must contain at least one item")
    settings = await _get_rzp_settings()
    if not settings:
        raise HTTPException(status_code=503, detail="Payment not configured")

    total = round(sum(i.price * i.quantity for i in payload.items), 2)
    amount_paise = int(round(total * 100))

    intent_id = uuid.uuid4().hex
    try:
        rzp = _rzp_client(settings)
        rzp_order = rzp.order.create({
            "amount": amount_paise,
            "currency": "INR",
            "receipt": intent_id[:20],
            "notes": {"table": payload.table_number or "", "internal_intent": intent_id},
        })
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Razorpay error: {e}")

    intent_doc = {
        "id": intent_id,
        "razorpay_order_id": rzp_order["id"],
        "amount_paise": amount_paise,
        "items": [i.dict() for i in payload.items],
        "table_number": payload.table_number,
        "notes": payload.notes,
        "status": "pending",  # pending | completed | failed
        "created_order_id": None,
        "created_at": now_iso(),
    }
    await db.payment_intents.insert_one(intent_doc)

    backend = os.environ.get("PUBLIC_BACKEND_URL", "").rstrip("/")
    checkout_url = f"{backend}/api/razorpay/checkout/{intent_id}" if backend else f"/api/razorpay/checkout/{intent_id}"
    return {
        "intent_id": intent_id,
        "razorpay_order_id": rzp_order["id"],
        "key_id": settings["key_id"],
        "amount": amount_paise,
        "currency": "INR",
        "checkout_url": checkout_url,
    }


@api_router.get("/razorpay/intent/{intent_id}")
async def rzp_get_intent(intent_id: str):
    it = await db.payment_intents.find_one({"id": intent_id}, {"_id": 0})
    if not it:
        raise HTTPException(status_code=404, detail="Intent not found")
    return it


@api_router.post("/razorpay/intent/{intent_id}/finalize")
async def rzp_finalize(intent_id: str, payload: FinalizePayload):
    intent = await db.payment_intents.find_one({"id": intent_id}, {"_id": 0})
    if not intent:
        raise HTTPException(status_code=404, detail="Intent not found")
    if intent["status"] == "completed":
        return {"ok": True, "order_id": intent.get("created_order_id")}

    settings = await _get_rzp_settings()
    if not settings:
        raise HTTPException(status_code=503, detail="Payment not configured")

    # Verify signature
    msg = f"{intent['razorpay_order_id']}|{payload.razorpay_payment_id}".encode()
    expected = hmac.new(
        settings["key_secret"].encode(), msg, hashlib.sha256
    ).hexdigest()
    if not hmac.compare_digest(expected, payload.razorpay_signature):
        await db.payment_intents.update_one(
            {"id": intent_id},
            {"$set": {"status": "failed", "failed_reason": "signature_mismatch"}},
        )
        raise HTTPException(status_code=400, detail="Invalid payment signature")

    # Create the order marked as paid
    total = sum(i["price"] * i["quantity"] for i in intent["items"])
    token_number = await get_next_token_number()
    order = Order(
        token_number=token_number,
        items=[OrderItem(**i) for i in intent["items"]],
        total=round(total, 2),
        table_number=intent.get("table_number"),
        notes=intent.get("notes"),
        payment_status="paid",
        payment={
            "provider": "razorpay",
            "razorpay_order_id": intent["razorpay_order_id"],
            "razorpay_payment_id": payload.razorpay_payment_id,
            "razorpay_signature": payload.razorpay_signature,
        },
    )
    await db.orders.insert_one(order.dict())
    await db.payment_intents.update_one(
        {"id": intent_id},
        {"$set": {"status": "completed", "created_order_id": order.id, "finalized_at": now_iso()}},
    )
    return {"ok": True, "order_id": order.id}


@api_router.get("/razorpay/checkout/{intent_id}", response_class=HTMLResponse)
async def rzp_checkout_page(intent_id: str):
    intent = await db.payment_intents.find_one({"id": intent_id}, {"_id": 0})
    if not intent:
        return HTMLResponse("<h2>Payment link expired or invalid.</h2>", status_code=404)
    settings = await _get_rzp_settings()
    if not settings:
        return HTMLResponse("<h2>Payment not configured.</h2>", status_code=503)

    if intent["status"] == "completed":
        return HTMLResponse(
            "<div style='font-family:system-ui;padding:40px;text-align:center'>"
            "<h1 style='color:#34C759'>Already paid</h1>"
            "<p>You can close this window and return to ServeSync.</p></div>"
        )

    html = f"""<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>ServeSync · Pay</title>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      margin: 0;
      background: #F9F9F8;
      color: #1C1C1E;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }}
    .card {{
      background: #fff;
      padding: 28px 24px;
      border-radius: 20px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
      max-width: 420px;
      width: calc(100% - 32px);
      text-align: center;
    }}
    h1 {{ margin: 0 0 6px; font-size: 22px; }}
    p {{ color: #555; margin: 0 0 20px; }}
    button {{
      background: #E07A5F;
      color: white;
      border: 0;
      padding: 14px 24px;
      border-radius: 999px;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      width: 100%;
    }}
    .status {{ margin-top: 16px; font-size: 14px; }}
    .ok {{ color: #34C759; font-weight: 700; }}
    .err {{ color: #FF3B30; font-weight: 700; }}
    .total {{ font-size: 32px; font-weight: 800; margin: 8px 0 20px; }}
  </style>
</head>
<body>
  <div class="card">
    <h1>ServeSync</h1>
    <p>Complete your payment to place the order.</p>
    <div class="total">₹{intent['amount_paise']/100:.0f}</div>
    <button id="pay">Pay with UPI / Card</button>
    <div class="status" id="status"></div>
  </div>
  <script>
    const INTENT_ID = "{intent_id}";
    const KEY = "{settings['key_id']}";
    const RZP_ORDER = "{intent['razorpay_order_id']}";
    const AMOUNT = {intent['amount_paise']};
    const statusEl = document.getElementById('status');

    function pay() {{
      const rzp = new Razorpay({{
        key: KEY,
        amount: AMOUNT,
        currency: "INR",
        order_id: RZP_ORDER,
        name: "ServeSync",
        description: "Restaurant Order",
        theme: {{ color: "#E07A5F" }},
        handler: async function (response) {{
          statusEl.innerHTML = "Verifying payment...";
          try {{
            const r = await fetch("/api/razorpay/intent/" + INTENT_ID + "/finalize", {{
              method: "POST",
              headers: {{ "Content-Type": "application/json" }},
              body: JSON.stringify({{
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }}),
            }});
            const data = await r.json();
            if (r.ok) {{
              statusEl.innerHTML = '<span class="ok">Payment successful. You can return to ServeSync.</span>';
              document.getElementById('pay').style.display = 'none';
            }} else {{
              statusEl.innerHTML = '<span class="err">Verification failed: ' + (data.detail || 'unknown') + '</span>';
            }}
          }} catch (e) {{
            statusEl.innerHTML = '<span class="err">Network error. Please try again.</span>';
          }}
        }},
        modal: {{
          ondismiss: function() {{
            statusEl.innerHTML = 'Payment cancelled. You can retry above.';
          }}
        }}
      }});
      rzp.open();
    }}
    document.getElementById('pay').addEventListener('click', pay);
    // Auto-open on load for a smoother experience
    setTimeout(pay, 300);
  </script>
</body>
</html>"""
    return HTMLResponse(html)


# Daily xlsx report
@api_router.get("/reports/daily.xlsx")
async def daily_report(date_str: Optional[str] = Query(None, alias="date")):
    if date_str:
        try:
            target_date = date.fromisoformat(date_str)
        except ValueError:
            raise HTTPException(status_code=400, detail="date must be YYYY-MM-DD")
    else:
        target_date = datetime.now(timezone.utc).date()

    start = datetime.combine(target_date, datetime.min.time()).replace(tzinfo=timezone.utc)
    end = start + timedelta(days=1)

    orders = await db.orders.find(
        {"created_at": {"$gte": start.isoformat(), "$lt": end.isoformat()}},
        {"_id": 0},
    ).sort("created_at", 1).to_list(5000)

    wb = Workbook()
    ws = wb.active
    ws.title = "Orders"

    headers = [
        "Order ID", "Time (UTC)", "Table", "Items", "Item Count",
        "Total (₹)", "Payment Status", "Order Status", "Payment ID", "Notes",
    ]
    ws.append(headers)

    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill("solid", fgColor="E07A5F")
    for col_idx, _ in enumerate(headers, start=1):
        cell = ws.cell(row=1, column=col_idx)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="left", vertical="center")

    total_revenue_paid = 0.0
    total_revenue_all = 0.0

    for o in orders:
        items_summary = ", ".join(
            f"{i['quantity']}× {i['name']}" for i in o.get("items", [])
        )
        item_count = sum(i.get("quantity", 0) for i in o.get("items", []))
        pay_id = (o.get("payment") or {}).get("razorpay_payment_id", "")
        ws.append([
            o.get("id", ""),
            o.get("created_at", ""),
            o.get("table_number", "") or "",
            items_summary,
            item_count,
            float(o.get("total", 0)),
            o.get("payment_status", "unpaid"),
            o.get("status", "pending"),
            pay_id,
            o.get("notes", "") or "",
        ])
        total_revenue_all += float(o.get("total", 0))
        if o.get("payment_status") == "paid":
            total_revenue_paid += float(o.get("total", 0))

    # Summary section
    ws.append([])
    ws.append(["Summary", target_date.isoformat()])
    ws.append(["Total orders", len(orders)])
    ws.append(["Total revenue (₹)", round(total_revenue_all, 2)])
    ws.append(["Paid revenue (₹)", round(total_revenue_paid, 2)])
    ws.append(["Unpaid revenue (₹)", round(total_revenue_all - total_revenue_paid, 2)])

    # Column widths
    widths = [30, 26, 8, 60, 12, 12, 16, 14, 26, 30]
    for i, w in enumerate(widths, start=1):
        ws.column_dimensions[chr(64 + i)].width = w

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)

    filename = f"servesync-report-{target_date.isoformat()}.xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

# Draft Orders
@api_router.post("/drafts", response_model=Order)
async def save_draft(payload: OrderCreate):
    try:
        if not payload.items:
            raise HTTPException(status_code=400, detail="Draft must contain at least one item")
        total = sum(i.price * i.quantity for i in payload.items)
        draft_id = f"DRAFT-{uuid.uuid4().hex[:12]}"
        draft = Order(
            id=draft_id,
            items=payload.items,
            total=round(total, 2),
            table_number=payload.table_number,
            notes=payload.notes,
            payment_status="unpaid",
        )
        await db.drafts.insert_one(draft.dict())
        return draft
    except Exception as e:
        logger.error(f"Error saving draft: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error saving draft: {str(e)}")


@api_router.get("/drafts", response_model=List[Order])
async def list_drafts():
    try:
        drafts = await db.drafts.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
        return [Order(**d) for d in drafts]
    except Exception as e:
        logger.error(f"Error listing drafts: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error listing drafts: {str(e)}")


@api_router.post("/drafts/{draft_id}/send")
async def send_draft(draft_id: str):
    try:
        draft = await db.drafts.find_one({"id": draft_id}, {"_id": 0})
        if not draft:
            raise HTTPException(status_code=404, detail="Draft not found")
        
        token_number = await get_next_token_number()
        order_dict = dict(draft)
        order_dict["id"] = make_order_id()
        order_dict["token_number"] = token_number
        order_dict["status"] = "pending"
        
        await db.orders.insert_one(order_dict)
        await db.drafts.delete_one({"id": draft_id})
        return {"ok": True, "order_id": order_dict["id"]}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending draft: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error sending draft: {str(e)}")


@api_router.delete("/drafts/{draft_id}")
async def delete_draft(draft_id: str):
    try:
        result = await db.drafts.delete_one({"id": draft_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Draft not found")
        return {"ok": True}
    except Exception as e:
        logger.error(f"Error deleting draft: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error deleting draft: {str(e)}")
        
app.include_router(api_router)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
