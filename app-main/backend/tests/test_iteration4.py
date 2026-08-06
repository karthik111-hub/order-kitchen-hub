"""Iteration 4 tests: cancelled order status support + regression."""
import os
import re
import pytest
import requests

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
def menu_item(s):
    menu = s.get(f"{API}/menu").json()
    assert menu, "need seed menu"
    return menu[0]


def _mk_order(s, menu_item, table="T-CANCEL"):
    r = s.post(f"{API}/orders", json={
        "items": [{
            "menu_item_id": menu_item["id"],
            "name": menu_item["name"],
            "price": menu_item["price"],
            "quantity": 1,
        }],
        "table_number": table,
    })
    assert r.status_code == 200, r.text
    return r.json()


# ---------- Cancelled status accepted (iteration 4) ----------
class TestCancelStatus:
    def test_pending_to_cancelled(self, s, menu_item):
        o = _mk_order(s, menu_item, "T-C1")
        assert o["status"] == "pending"
        r = s.patch(f"{API}/orders/{o['id']}/status", json={"status": "cancelled"})
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "cancelled"

    def test_preparing_to_cancelled(self, s, menu_item):
        o = _mk_order(s, menu_item, "T-C2")
        r1 = s.patch(f"{API}/orders/{o['id']}/status", json={"status": "preparing"})
        assert r1.status_code == 200 and r1.json()["status"] == "preparing"
        r2 = s.patch(f"{API}/orders/{o['id']}/status", json={"status": "cancelled"})
        assert r2.status_code == 200 and r2.json()["status"] == "cancelled"

    def test_cancelled_order_still_fetchable(self, s, menu_item):
        o = _mk_order(s, menu_item, "T-C3")
        s.patch(f"{API}/orders/{o['id']}/status", json={"status": "cancelled"})
        g = s.get(f"{API}/orders/{o['id']}")
        assert g.status_code == 200
        body = g.json()
        assert body["status"] == "cancelled"
        assert body["id"] == o["id"]

    def test_cancelled_appears_in_status_filter(self, s, menu_item):
        o = _mk_order(s, menu_item, "T-C4")
        s.patch(f"{API}/orders/{o['id']}/status", json={"status": "cancelled"})
        r = s.get(f"{API}/orders", params={"status": "cancelled"})
        assert r.status_code == 200
        ids = [x["id"] for x in r.json()]
        assert o["id"] in ids
        # All returned must be cancelled
        assert all(x["status"] == "cancelled" for x in r.json())

    def test_invalid_status_422(self, s, menu_item):
        o = _mk_order(s, menu_item, "T-C5")
        r = s.patch(f"{API}/orders/{o['id']}/status", json={"status": "foobar"})
        assert r.status_code == 422, f"expected 422 got {r.status_code}: {r.text[:200]}"

    def test_unknown_order_cancel_404(self, s):
        r = s.patch(f"{API}/orders/does-not-exist/status", json={"status": "cancelled"})
        assert r.status_code == 404


# ---------- Full lifecycle regression ----------
class TestLifecycle:
    def test_pending_preparing_completed(self, s, menu_item):
        o = _mk_order(s, menu_item, "T-LIFE")
        r1 = s.patch(f"{API}/orders/{o['id']}/status", json={"status": "preparing"})
        assert r1.status_code == 200 and r1.json()["status"] == "preparing"
        r2 = s.patch(f"{API}/orders/{o['id']}/status", json={"status": "completed"})
        assert r2.status_code == 200 and r2.json()["status"] == "completed"
        # Verify GET persistence
        g = s.get(f"{API}/orders/{o['id']}").json()
        assert g["status"] == "completed"


# ---------- Regression: prior endpoints still function ----------
class TestRegression:
    def test_auth_master(self, s):
        r = s.post(f"{API}/auth/verify", json={"role": "master", "password": "Sandy0088"})
        assert r.status_code == 200 and r.json()["role"] == "master"

    def test_auth_chef(self, s):
        r = s.post(f"{API}/auth/verify", json={"role": "chef", "password": "Sari0808"})
        assert r.status_code == 200 and r.json()["role"] == "chef"

    def test_auth_admin(self, s):
        r = s.post(f"{API}/auth/verify", json={
            "role": "admin", "password": "MissionImpossible10*",
        })
        assert r.status_code == 200

    def test_auth_bad_password_401(self, s):
        r = s.post(f"{API}/auth/verify", json={"role": "chef", "password": "wrong"})
        assert r.status_code == 401

    def test_categories_list(self, s):
        r = s.get(f"{API}/categories")
        assert r.status_code == 200 and isinstance(r.json(), list)

    def test_menu_list(self, s):
        r = s.get(f"{API}/menu")
        assert r.status_code == 200 and isinstance(r.json(), list)

    def test_orders_list_all(self, s):
        r = s.get(f"{API}/orders")
        assert r.status_code == 200 and isinstance(r.json(), list)

    def test_orders_pending_filter_excludes_cancelled(self, s):
        r = s.get(f"{API}/orders", params={"status": "pending"})
        assert r.status_code == 200
        assert all(x["status"] == "pending" for x in r.json())

    def test_rzp_status_endpoint(self, s):
        r = s.get(f"{API}/razorpay/settings/status")
        assert r.status_code == 200
        assert "configured" in r.json()

    def test_new_order_id_format_still(self, s, menu_item):
        o = _mk_order(s, menu_item, "T-FMT")
        assert ORDER_ID_RE.match(o["id"]), f"Bad id: {o['id']}"
        assert o["payment_status"] == "unpaid"
