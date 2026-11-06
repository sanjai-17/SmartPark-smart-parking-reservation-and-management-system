import pytest
from decimal import Decimal


def test_health_endpoint(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "SmartPark" in data["service"]


def test_dashboard_stats_endpoint(client):
    response = client.get("/api/v1/dashboard/stats")
    assert response.status_code == 200
    data = response.json()
    assert "total_slots" in data
    assert "available_slots" in data
    assert "occupancy_percentage" in data
    assert len(data["location_breakdown"]) > 0


def test_locations_endpoints(client):
    # List locations
    response = client.get("/api/v1/locations")
    assert response.status_code == 200
    locations = response.json()
    assert len(locations) >= 4

    loc_id = locations[0]["id"]
    # Get location slots
    slots_res = client.get(f"/api/v1/locations/{loc_id}/slots")
    assert slots_res.status_code == 200
    assert len(slots_res.json()) > 0


def test_slot_creation_via_factory_method_api(client):
    # Fetch a location
    loc_res = client.get("/api/v1/locations")
    loc_id = loc_res.json()[0]["id"]

    # Create EV slot
    ev_payload = {
        "slot_code": "API-EV-999",
        "location_id": loc_id,
        "slot_type": "Electric Vehicle",
        "base_rate": 95.0,
        "description": "High power fast charger created in test",
        "features": "60kW DC, Type-2",
    }
    response = client.post("/api/v1/slots", json=ev_payload)
    assert response.status_code == 201
    created = response.json()
    assert created["slot_code"] == "API-EV-999"
    assert created["slot_type"] == "Electric Vehicle"
    assert created["availability_status"] == "Available"

    # Reject unknown slot type
    invalid_payload = {
        "slot_code": "API-BAD-001",
        "location_id": loc_id,
        "slot_type": "SpaceshipDock",
    }
    bad_res = client.post("/api/v1/slots", json=invalid_payload)
    assert bad_res.status_code == 422


def test_pricing_estimate_api(client):
    payload = {
        "duration_hours": 5.0,
        "base_rate": 60.0,
        "pricing_strategy": "Duration",
        "vehicle_type": "Car",
        "location_zone": "City Centre",
    }
    response = client.post("/api/v1/pricing/estimate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["strategy_name"] == "Duration"
    # First 4 hrs: 240, 5th hr at 70%: 42 -> 282.00
    assert float(data["final_amount"]) == 282.0


def test_full_reservation_lifecycle_and_payment_api(client):
    # 1. Find an available slot
    slots_res = client.get("/api/v1/slots?availability=Available")
    slots = slots_res.json()
    assert len(slots) > 0
    slot_id = slots[0]["id"]

    # 2. Create reservation
    res_payload = {
        "slot_id": slot_id,
        "driver_name": "Integration Driver",
        "driver_email": "integration@test.com",
        "driver_phone": "+91 98888 11111",
        "vehicle_type": "Car",
        "duration_hours": 2.0,
        "pricing_strategy": "Duration",
    }
    create_res = client.post("/api/v1/reservations", json=res_payload)
    assert create_res.status_code == 201
    res_data = create_res.json()
    res_id = res_data["id"]
    assert res_data["status"] == "Pending"

    # Verify slot is now Reserved (held)
    slot_check = client.get(f"/api/v1/slots/{slot_id}").json()
    assert slot_check["availability_status"] == "Reserved"

    # Attempting to double-book the same slot must fail with 409 Conflict
    dup_res = client.post("/api/v1/reservations", json=res_payload)
    assert dup_res.status_code == 409

    # 3. Confirm reservation
    confirm_res = client.post(f"/api/v1/reservations/{res_id}/confirm")
    assert confirm_res.status_code == 200
    assert confirm_res.json()["status"] == "Confirmed"

    # 4. Check In
    checkin_res = client.post(f"/api/v1/reservations/{res_id}/check-in")
    assert checkin_res.status_code == 200
    assert checkin_res.json()["status"] == "Active"

    # Verify slot is now Occupied
    slot_check2 = client.get(f"/api/v1/slots/{slot_id}").json()
    assert slot_check2["availability_status"] == "Occupied"

    # 5. Check Out
    checkout_res = client.post(f"/api/v1/reservations/{res_id}/check-out")
    assert checkout_res.status_code == 200
    assert checkout_res.json()["status"] == "Completed"

    # Verify slot is now Available again
    slot_check3 = client.get(f"/api/v1/slots/{slot_id}").json()
    assert slot_check3["availability_status"] == "Available"

    # 6. Simulate Payment
    pay_payload = {
        "payment_method": "UPI",
        "account_identifier": "driver@oksbi",
    }
    pay_res = client.post(f"/api/v1/reservations/{res_id}/payments", json=pay_payload)
    assert pay_res.status_code == 201
    pay_data = pay_res.json()
    assert pay_data["status"] == "SUCCESS"
    assert pay_data["payment_method"] == "UPI"

    # Duplicate payment must be rejected with 409 Conflict
    dup_pay = client.post(f"/api/v1/reservations/{res_id}/payments", json=pay_payload)
    assert dup_pay.status_code == 409

    # 7. Check Notifications and Activity
    notif_res = client.get(f"/api/v1/notifications?reservation_id={res_id}")
    assert notif_res.status_code == 200
    assert len(notif_res.json()) >= 3

    act_res = client.get(f"/api/v1/reservations/{res_id}/activity")
    assert act_res.status_code == 200
    assert len(act_res.json()) >= 4
