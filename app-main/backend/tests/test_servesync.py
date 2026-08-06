import os
import pytest
import requests

BASE_URL = os.environ.get(
    'EXPO_PUBLIC_BACKEND_URL',
    'https://order-kitchen-hub-16.preview.emergentagent.com',
).rstrip('/')
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# ---------- Auth (iteration 2 new) ----------
class TestAuth:
    def test_verify_admin_ok(self, s):
        r = s.post(f"{API}/auth/verify", json={"role": "admin", "password": "MissionImpossible10*"})
        assert r.status_code == 200
        assert r.json() == {"ok": True, "role": "admin"}

    def test_verify_master_ok(self, s):
        r = s.post(f"{API}/auth/verify", json={"role": "master", "password": "Sandy0088"})
        assert r.status_code == 200
        assert r.json() == {"ok": True, "role": "master"}

    def test_verify_chef_ok(self, s):
        r = s.post(f"{API}/auth/verify", json={"role": "chef", "password": "Sari0808"})
        assert r.status_code == 200
        assert r.json() == {"ok": True, "role": "chef"}

    def test_verify_wrong_password(self, s):
        r = s.post(f"{API}/auth/verify", json={"role": "admin", "password": "wrong"})
        assert r.status_code == 401

    def test_verify_invalid_role(self, s):
        r = s.post(f"{API}/auth/verify", json={"role": "manager", "password": "x"})
        assert r.status_code == 422


# ---------- Categories (iteration 2 new) ----------
class TestCategories:
    created_id = None

    def test_list_seed_categories(self, s):
        r = s.get(f"{API}/categories")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        for c in data:
            assert "_id" not in c
            assert {"id", "name", "created_at"}.issubset(c.keys())
        names = {c["name"] for c in data}
        assert {"Starters", "Main Course", "Soups"} & names, f"Seed cats missing: {names}"

    def test_create_category(self, s):
        r = s.post(f"{API}/categories", json={"name": "TEST_Desserts"})
        assert r.status_code == 200
        c = r.json()
        assert c["name"] == "TEST_Desserts"
        assert "_id" not in c
        TestCategories.created_id = c["id"]

    def test_create_duplicate_idempotent(self, s):
        r1 = s.post(f"{API}/categories", json={"name": "TEST_Desserts"})
        assert r1.status_code == 200
        assert r1.json()["id"] == TestCategories.created_id

    def test_create_empty_name_400(self, s):
        r = s.post(f"{API}/categories", json={"name": "   "})
        assert r.status_code == 400

    def test_delete_cascades_items(self, s):
        # create category + item under it, then delete cat and ensure item is gone
        c = s.post(f"{API}/categories", json={"name": "TEST_CASCADE"}).json()
        item = s.post(f"{API}/menu", json={
            "name": "TEST_CascadeItem", "price": 10.0, "category": "TEST_CASCADE"
        }).json()
        item_id = item["id"]
        d = s.delete(f"{API}/categories/{c['id']}")
        assert d.status_code == 200
        # item should be gone
        menu = s.get(f"{API}/menu").json()
        assert not any(i["id"] == item_id for i in menu)

    def test_delete_nonexistent_category_404(self, s):
        r = s.delete(f"{API}/categories/does-not-exist")
        assert r.status_code == 404

    def test_delete_created_category(self, s):
        if TestCategories.created_id:
            r = s.delete(f"{API}/categories/{TestCategories.created_id}")
            assert r.status_code == 200


# ---------- Menu (iteration 2 changes: category req, tag) ----------
class TestMenu:
    created_id = None

    def test_root(self, s):
        r = s.get(f"{API}/")
        assert r.status_code == 200
        assert "message" in r.json()

    def test_list_menu_no_id_leak(self, s):
        r = s.get(f"{API}/menu")
        assert r.status_code == 200
        for item in r.json():
            assert "_id" not in item
            assert {"id", "name", "price", "category", "created_at"}.issubset(item.keys())

    def test_seed_items_have_category(self, s):
        items = s.get(f"{API}/menu").json()
        names = {i["name"] for i in items}
        expected_any = {"Paneer Tikka", "Butter Chicken", "Tomato Soup"}
        assert expected_any & names, f"None of seeded items found. Got {names}"
        for i in items:
            assert i.get("category"), f"Item missing category: {i}"

    def test_seed_items_tags(self, s):
        items = s.get(f"{API}/menu").json()
        by_name = {i["name"]: i for i in items}
        # Paneer Tikka must_buy, Butter Chicken most_selling per seed
        if "Paneer Tikka" in by_name:
            assert by_name["Paneer Tikka"].get("tag") == "must_buy"
        if "Butter Chicken" in by_name:
            assert by_name["Butter Chicken"].get("tag") == "most_selling"

    def test_create_menu_missing_category_fails(self, s):
        r = s.post(f"{API}/menu", json={"name": "TEST_NoCat", "price": 20.0})
        # 422 (pydantic) is the natural response for missing required field
        assert r.status_code in (400, 422)

    def test_create_menu_empty_category_400(self, s):
        r = s.post(f"{API}/menu", json={"name": "TEST_EmptyCat", "price": 20.0, "category": "   "})
        assert r.status_code == 400

    def test_create_menu_with_tag(self, s):
        r = s.post(f"{API}/menu", json={
            "name": "TEST_TaggedItem", "price": 55.0, "category": "Starters", "tag": "must_buy"
        })
        assert r.status_code == 200
        item = r.json()
        assert item["tag"] == "must_buy"
        assert item["category"] == "Starters"
        TestMenu.created_id = item["id"]

    def test_invalid_tag_rejected(self, s):
        r = s.post(f"{API}/menu", json={
            "name": "TEST_BadTag", "price": 10.0, "category": "Starters", "tag": "invalid_tag"
        })
        assert r.status_code == 422

    def test_category_filter(self, s):
        r = s.get(f"{API}/menu", params={"category": "Starters"})
        assert r.status_code == 200
        for it in r.json():
            assert it["category"] == "Starters"

    def test_delete_created_item(self, s):
        if TestMenu.created_id:
            d = s.delete(f"{API}/menu/{TestMenu.created_id}")
            assert d.status_code == 200

    def test_delete_nonexistent_menu(self, s):
        r = s.delete(f"{API}/menu/nonexistent-id-xxx")
        assert r.status_code == 404


# ---------- Orders (regression from iteration 1) ----------
class TestOrders:
    order_id = None

    def test_create_order_empty_400(self, s):
        r = s.post(f"{API}/orders", json={"items": []})
        assert r.status_code == 400

    def test_create_order(self, s):
        menu = s.get(f"{API}/menu").json()
        assert menu, "Need at least one menu item"
        it = menu[0]
        r = s.post(f"{API}/orders", json={
            "items": [{
                "menu_item_id": it["id"],
                "name": it["name"],
                "price": it["price"],
                "quantity": 2,
            }],
            "table_number": "T1",
            "notes": "TEST_note",
        })
        assert r.status_code == 200
        o = r.json()
        assert "_id" not in o
        assert o["status"] == "pending"
        assert o["total"] == round(it["price"] * 2, 2)
        TestOrders.order_id = o["id"]

    def test_transition_lifecycle(self, s):
        assert TestOrders.order_id
        r1 = s.patch(f"{API}/orders/{TestOrders.order_id}/status", json={"status": "preparing"})
        assert r1.status_code == 200 and r1.json()["status"] == "preparing"
        r2 = s.patch(f"{API}/orders/{TestOrders.order_id}/status", json={"status": "completed"})
        assert r2.status_code == 200 and r2.json()["status"] == "completed"
        pend = s.get(f"{API}/orders", params={"status": "pending"}).json()
        assert not any(o["id"] == TestOrders.order_id for o in pend)

    def test_get_order_404(self, s):
        r = s.get(f"{API}/orders/no-such-order")
        assert r.status_code == 404
