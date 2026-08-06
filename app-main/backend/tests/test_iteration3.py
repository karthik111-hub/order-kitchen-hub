"""Iteration 3 tests: order ID format, Razorpay settings/intent/finalize, daily xlsx report."""
import os
import re
import hmac
import hashlib
import uuid
import pytest
import requests
from datetime import datetime, timezone
from pymongo import MongoClient

BASE_URL = os.environ.get(
    'EXPO_PUBLIC_BACKEND_URL',
    'https://order-kitchen-hub-16.preview.emergentagent.com',
).rstrip('/')
API = f"{BASE_URL}/api"

ORDER_ID_RE = re.compile(r"^\d{8}-\d{6}-[0-9A-F]{8}$")


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


@pytest.fixture(scope="module")
def mongo():
    url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    dbname = os.environ.get('DB_NAME', 'test_database')
    cli = MongoClient(url)
    yield cli[dbname]
    cli.close()


# ---------- Order ID Format (iteration 3) ----------
class TestOrderIdFormat:
    def test_new_order_id_format_and_unpaid_default(self, s):
        menu = s.get(f"{API}/menu").json()
        assert menu, "need seed menu"
        it = menu[0]
        r = s.post(f"{API}/orders", json={
            "items": [{
                "menu_item_id": it["id"], "name": it["name"],
                "price": it["price"], "quantity": 1,
            }],
        })
        assert r.status_code == 200
        o = r.json()
        assert ORDER_ID_RE.match(o["id"]), f"Bad id format: {o['id']}"
        assert o["payment_status"] == "unpaid"
        assert o["status"] == "pending"

    def test_multiple_orders_unique_ids(self, s):
        menu = s.get(f"{API}/menu").json()
        it = menu[0]
        ids = set()
        for _ in range(3):
            r = s.post(f"{API}/orders", json={
                "items": [{
                    "menu_item_id": it["id"], "name": it["name"],
                    "price": it["price"], "quantity": 1,
                }],
            })
            assert r.status_code == 200
            oid = r.json()["id"]
            assert ORDER_ID_RE.match(oid)
            ids.add(oid)
        assert len(ids) == 3


# ---------- Razorpay Settings (iteration 3) ----------
class TestRazorpaySettings:
    def test_status_initial_not_configured(self, s):
        # Ensure clean state
        s.delete(f"{API}/razorpay/settings")
        r = s.get(f"{API}/razorpay/settings/status")
        assert r.status_code == 200
        body = r.json()
        assert body == {"configured": False, "key_id_masked": None}

    def test_save_settings_missing_blank_400(self, s):
        r = s.post(f"{API}/razorpay/settings", json={"key_id": "", "key_secret": ""})
        assert r.status_code == 400
        r2 = s.post(f"{API}/razorpay/settings", json={"key_id": "  ", "key_secret": "x"})
        assert r2.status_code == 400

    def test_save_settings_ok_and_masked(self, s):
        payload = {"key_id": "rzp_test_ABC123DEF456", "key_secret": "SECRETSECRETSEC1"}
        r = s.post(f"{API}/razorpay/settings", json=payload)
        assert r.status_code == 200
        j = r.json()
        assert j["ok"] is True
        # first 6 + **** + last 4
        assert j["key_id_masked"].startswith("rzp_te")
        assert j["key_id_masked"].endswith("F456")
        assert "****" in j["key_id_masked"]

        st = s.get(f"{API}/razorpay/settings/status").json()
        assert st["configured"] is True
        assert st["key_id_masked"] == j["key_id_masked"]

    def test_save_settings_upsert(self, s):
        # Save again with different key
        r = s.post(f"{API}/razorpay/settings", json={
            "key_id": "rzp_test_XYZXYZXYZ999", "key_secret": "NEWSECRETNEWSECR",
        })
        assert r.status_code == 200
        st = s.get(f"{API}/razorpay/settings/status").json()
        assert st["configured"] is True
        assert st["key_id_masked"].endswith("Z999")

    def test_delete_settings(self, s):
        r = s.delete(f"{API}/razorpay/settings")
        assert r.status_code == 200
        st = s.get(f"{API}/razorpay/settings/status").json()
        assert st == {"configured": False, "key_id_masked": None}


# ---------- Razorpay Intent (iteration 3) ----------
class TestRazorpayIntent:
    def test_intent_when_not_configured_503(self, s):
        s.delete(f"{API}/razorpay/settings")
        r = s.post(f"{API}/razorpay/intent", json={
            "items": [{
                "menu_item_id": "x", "name": "T", "price": 100.0, "quantity": 1
            }],
        })
        assert r.status_code == 503
        assert "not configured" in r.json()["detail"].lower()

    def test_intent_empty_items_400(self, s):
        # Configure first so we hit items check
        s.post(f"{API}/razorpay/settings", json={
            "key_id": "rzp_test_XXXXXXXXXXXX", "key_secret": "XXXXXXXXXXXXXXXX"
        })
        r = s.post(f"{API}/razorpay/intent", json={"items": []})
        assert r.status_code == 400

    def test_intent_configured_but_bad_keys_502(self, s):
        s.post(f"{API}/razorpay/settings", json={
            "key_id": "rzp_test_XXXXXXXXXXXX", "key_secret": "XXXXXXXXXXXXXXXX"
        })
        r = s.post(f"{API}/razorpay/intent", json={
            "items": [{
                "menu_item_id": "x", "name": "T", "price": 100.0, "quantity": 1
            }],
        })
        # Bad dummy keys → Razorpay call fails. Backend returns 502.
        # Note: with really-slow Razorpay timeouts the ingress may also produce a 502 HTML page.
        # Either way, status must be 502 and NO order should be created.
        assert r.status_code == 502, f"Expected 502, got {r.status_code}: {r.text[:200]}"


# ---------- Razorpay Finalize signature (iteration 3) ----------
class TestRazorpayFinalize:
    def test_finalize_wrong_signature_400_no_order_created(self, s, mongo):
        # Configure known secret
        secret = "TESTSECRET_ABCDEF"
        s.post(f"{API}/razorpay/settings", json={
            "key_id": "rzp_test_KNOWN_KEY_00", "key_secret": secret,
        })

        # Seed a payment_intent directly in Mongo
        intent_id = uuid.uuid4().hex
        rzp_order_id = "order_TEST_" + uuid.uuid4().hex[:10]
        mongo.payment_intents.insert_one({
            "id": intent_id,
            "razorpay_order_id": rzp_order_id,
            "amount_paise": 10000,
            "items": [{"menu_item_id": "x", "name": "T", "price": 100.0, "quantity": 1}],
            "table_number": "T-SIG",
            "notes": None,
            "status": "pending",
            "created_order_id": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

        orders_before = mongo.orders.count_documents({"table_number": "T-SIG"})

        r = s.post(f"{API}/razorpay/intent/{intent_id}/finalize", json={
            "razorpay_payment_id": "pay_FAKE_1234",
            "razorpay_signature": "totallywrongsig",
        })
        assert r.status_code == 400
        assert "signature" in r.json()["detail"].lower()

        # Verify NO order was created
        orders_after = mongo.orders.count_documents({"table_number": "T-SIG"})
        assert orders_after == orders_before, "Order was created despite bad signature!"

        # Intent marked failed
        it = mongo.payment_intents.find_one({"id": intent_id})
        assert it["status"] == "failed"

        # cleanup
        mongo.payment_intents.delete_one({"id": intent_id})

    def test_finalize_correct_signature_creates_paid_order(self, s, mongo):
        # This validates the HMAC path even without touching real Razorpay
        secret = "TESTSECRET_QWERTY"
        s.post(f"{API}/razorpay/settings", json={
            "key_id": "rzp_test_SIGCHECK_00", "key_secret": secret,
        })

        intent_id = uuid.uuid4().hex
        rzp_order_id = "order_SIGOK_" + uuid.uuid4().hex[:10]
        mongo.payment_intents.insert_one({
            "id": intent_id,
            "razorpay_order_id": rzp_order_id,
            "amount_paise": 25000,
            "items": [{"menu_item_id": "x", "name": "TEST_PaidItem", "price": 250.0, "quantity": 1}],
            "table_number": "T-OK",
            "notes": "TEST_paid",
            "status": "pending",
            "created_order_id": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

        pay_id = "pay_OK_" + uuid.uuid4().hex[:10]
        msg = f"{rzp_order_id}|{pay_id}".encode()
        good_sig = hmac.new(secret.encode(), msg, hashlib.sha256).hexdigest()

        r = s.post(f"{API}/razorpay/intent/{intent_id}/finalize", json={
            "razorpay_payment_id": pay_id,
            "razorpay_signature": good_sig,
        })
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["ok"] is True
        order_id = body["order_id"]
        assert ORDER_ID_RE.match(order_id)

        # Verify order created + paid + payment recorded
        got = s.get(f"{API}/orders/{order_id}").json()
        assert got["payment_status"] == "paid"
        assert got["payment"]["razorpay_payment_id"] == pay_id
        assert got["payment"]["razorpay_order_id"] == rzp_order_id
        assert got["total"] == 250.0

        # Idempotency: second call returns ok with same order_id
        r2 = s.post(f"{API}/razorpay/intent/{intent_id}/finalize", json={
            "razorpay_payment_id": pay_id, "razorpay_signature": good_sig,
        })
        assert r2.status_code == 200
        assert r2.json()["order_id"] == order_id

        # cleanup
        mongo.payment_intents.delete_one({"id": intent_id})
        mongo.orders.delete_one({"id": order_id})

    def test_finalize_unknown_intent_404(self, s):
        r = s.post(f"{API}/razorpay/intent/does-not-exist/finalize", json={
            "razorpay_payment_id": "x", "razorpay_signature": "y",
        })
        assert r.status_code == 404


# ---------- Daily xlsx report (iteration 3) ----------
class TestDailyReport:
    def test_default_today(self, s):
        r = s.get(f"{API}/reports/daily.xlsx")
        assert r.status_code == 200
        assert r.headers["content-type"] == \
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        cd = r.headers.get("content-disposition", "")
        assert "attachment" in cd.lower()
        assert ".xlsx" in cd.lower()
        # xlsx = zip, starts with PK
        assert r.content[:2] == b"PK"

    def test_date_filter_ok(self, s):
        r = s.get(f"{API}/reports/daily.xlsx", params={"date": "2024-01-01"})
        assert r.status_code == 200
        assert r.content[:2] == b"PK"

    def test_date_filter_invalid_400(self, s):
        r = s.get(f"{API}/reports/daily.xlsx", params={"date": "not-a-date"})
        assert r.status_code == 400

    def test_report_contains_new_order(self, s):
        # Create order, then download today's report and confirm order id appears
        menu = s.get(f"{API}/menu").json()
        it = menu[0]
        r = s.post(f"{API}/orders", json={
            "items": [{
                "menu_item_id": it["id"], "name": it["name"],
                "price": it["price"], "quantity": 1,
            }],
            "table_number": "T-RPT",
        })
        oid = r.json()["id"]

        rep = s.get(f"{API}/reports/daily.xlsx")
        assert rep.status_code == 200
        # xlsx is a compressed zip — extract and check sheet contents
        import io as _io, zipfile as _zip
        with _zip.ZipFile(_io.BytesIO(rep.content)) as z:
            with z.open("xl/worksheets/sheet1.xml") as fh:
                sheet = fh.read().decode("utf-8", errors="ignore")
        assert oid in sheet, "New order id should appear in today's report sheet"


# ---------- Regression (existing endpoints still work) ----------
class TestRegression:
    def test_auth_still_works(self, s):
        r = s.post(f"{API}/auth/verify", json={
            "role": "admin", "password": "MissionImpossible10*",
        })
        assert r.status_code == 200

    def test_categories_still_work(self, s):
        r = s.get(f"{API}/categories")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_menu_still_works(self, s):
        r = s.get(f"{API}/menu")
        assert r.status_code == 200

    def test_orders_lifecycle_still_works(self, s):
        menu = s.get(f"{API}/menu").json()
        it = menu[0]
        r = s.post(f"{API}/orders", json={
            "items": [{
                "menu_item_id": it["id"], "name": it["name"],
                "price": it["price"], "quantity": 1,
            }],
        })
        oid = r.json()["id"]
        r1 = s.patch(f"{API}/orders/{oid}/status", json={"status": "preparing"})
        assert r1.status_code == 200 and r1.json()["status"] == "preparing"
        r2 = s.patch(f"{API}/orders/{oid}/status", json={"status": "completed"})
        assert r2.status_code == 200 and r2.json()["status"] == "completed"


# ---------- Cleanup ----------
def test_final_cleanup(s):
    # Remove razorpay settings so app is left in a clean state
    s.delete(f"{API}/razorpay/settings")
    st = s.get(f"{API}/razorpay/settings/status").json()
    assert st["configured"] is False
