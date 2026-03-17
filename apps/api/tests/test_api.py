from fastapi.testclient import TestClient


def login(client: TestClient):
    r = client.post(
        "/auth/login",
        json={"email": "admin@example.com", "password": "admin123"},
    )
    assert r.status_code == 200


def test_health(client: TestClient):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_get_products_empty(client: TestClient):
    login(client)
    r = client.get("/products")
    assert r.status_code == 200
    assert r.json() == []


def test_get_actions_empty(client: TestClient):
    login(client)
    r = client.get("/actions")
    assert r.status_code == 200
    assert r.json() == []


def test_create_action_structured(client: TestClient):
    login(client)
    payload = {
        "date": "2026-02-24",
        "action_type": "Ajout de chlore",
        "product_id": None,
        "qty": "60",
        "unit": "g",
        "notes": "",
    }
    r = client.post("/actions", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data["action_type"] == "Ajout de chlore"
    assert data["qty"] == "60"
    assert data["unit"] == "g"
    assert data["product_id"] is None
    assert "id" in data
    assert "created_at" in data


def test_list_actions_returns_structured(client: TestClient):
    login(client)
    client.post("/actions", json={"date": "2026-02-24", "action_type": "Test", "notes": "note"})
    r = client.get("/actions")
    actions = r.json()
    assert len(actions) == 1
    assert actions[0]["action_type"] == "Test"
    assert actions[0]["notes"] == "note"


def test_delete_action(client: TestClient):
    login(client)
    r = client.post("/actions", json={"date": "2026-02-24", "action_type": "A supprimer", "notes": ""})
    action_id = r.json()["id"]
    del_r = client.delete(f"/actions/{action_id}")
    assert del_r.status_code == 204
    assert client.get("/actions").json() == []


def test_delete_action_not_found(client: TestClient):
    login(client)
    r = client.delete("/actions/999")
    assert r.status_code == 404
