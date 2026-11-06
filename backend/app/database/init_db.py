import json
from decimal import Decimal
from sqlalchemy.orm import Session
from app.database.session import Base, engine
from app.models.models import (
    ParkingLocation,
    ParkingSlot,
    Reservation,
    PaymentTransaction,
    NotificationRecord,
    ReservationAction,
)
from app.patterns.factory_method import get_creator


def init_database(db: Session) -> None:
    """
    Creates tables if they do not exist and seeds initial data if database is fresh.
    Ensures idempotency (no duplicate entries on subsequent restarts).
    """
    Base.metadata.create_all(bind=engine)

    # Check if locations already exist
    existing_locations_count = db.query(ParkingLocation).count()
    if existing_locations_count > 0:
        return

    # 1. Seed Locations
    locations_data = [
        {
            "name": "Central Business District Parking",
            "address": "42 MG Road, Financial District",
            "zone": "City Centre",
            "description": "Multi-level underground automated parking with rapid entry sensors and 24/7 security surveillance.",
        },
        {
            "name": "Airport Terminal Parking",
            "address": "Terminal 2 Ground Transportation Hub, Airport Blvd",
            "zone": "Airport",
            "description": "Convenient direct-terminal access parking with high-capacity EV charging and VIP valet services.",
        },
        {
            "name": "Residential Community Parking",
            "address": "18 Palm Meadows Boulevard, Whitefield",
            "zone": "Suburb",
            "description": "Quiet residential sector parking with dedicated accessible bays and overnight EV charging points.",
        },
        {
            "name": "City Centre Plaza Parking",
            "address": "108 Brigade Road, Shopping District",
            "zone": "City Centre",
            "description": "Prime urban shopping center parking deck with real-time digital occupancy display boards.",
        },
    ]

    location_entities = []
    for loc_dict in locations_data:
        loc = ParkingLocation(**loc_dict)
        db.add(loc)
        location_entities.append(loc)
    db.flush()

    # 2. Seed Slots using Factory Method creators
    slots_seed_info = [
        # Central Business District
        (0, "A-101", "Regular", Decimal("60.00"), "Close to Main Lobby Elevator", "CCTV, Shaded", "Available"),
        (0, "A-102", "Regular", Decimal("60.00"), "Ground level bay near turnstile", "CCTV, Wide angle", "Available"),
        (0, "A-EV1", "Electric Vehicle", Decimal("95.00"), "Fast-charging EV bay with Type 2 plug", "50kW DC Fast Charger, Smart Meter", "Available"),
        (0, "A-D01", "Disabled", Decimal("45.00"), "Ramp adjacent accessible bay", "Wheelchair ramp, 3.5m wide bay", "Available"),
        (0, "A-P01", "Premium", Decimal("130.00"), "VIP Reserved covered bay", "Valet service, Premium canopy", "Reserved"),

        # Airport Terminal
        (1, "T2-101", "Regular", Decimal("80.00"), "Terminal 2 walk-in bay", "Covered walkover access", "Available"),
        (1, "T2-EV1", "Electric Vehicle", Decimal("120.00"), "High power fast charger near gates", "60kW Fast EV Charger", "Available"),
        (1, "T2-EV2", "Electric Vehicle", Decimal("120.00"), "Secondary EV charging space", "50kW EV Charger", "Occupied"),
        (1, "T2-D01", "Disabled", Decimal("50.00"), "Direct elevator terminal access", "Wheelchair accessible lift, Braille", "Available"),
        (1, "T2-VIP", "Premium", Decimal("180.00"), "Executive terminal valet suite", "Valet Concierge, Luggage assistance", "Available"),

        # Residential Community
        (2, "R-01", "Regular", Decimal("35.00"), "Courtyard ground slot", "Well lit, open air", "Available"),
        (2, "R-02", "Regular", Decimal("35.00"), "Near community clubhouse", "CCTV monitored", "Available"),
        (2, "R-EV1", "Electric Vehicle", Decimal("65.00"), "Overnight trickle charger", "22kW AC EV Charger", "Available"),
        (2, "R-D01", "Disabled", Decimal("30.00"), "Clubhouse entrance accessible bay", "Level access, Extra width", "Available"),

        # City Centre Plaza
        (3, "P-101", "Regular", Decimal("55.00"), "Level 1 shopping mall bay", "Near mall entrance escalator", "Available"),
        (3, "P-102", "Regular", Decimal("55.00"), "Level 1 mid-aisle space", "Covered parking", "Occupied"),
        (3, "P-EV1", "Electric Vehicle", Decimal("85.00"), "Shopping plaza EV station", "50kW Fast EV Charger", "Available"),
        (3, "P-D01", "Disabled", Decimal("40.00"), "Next to automatic sliding doors", "Tactile paving, 3.8m bay", "Available"),
        (3, "P-VIP", "Premium", Decimal("110.00"), "Priority reserved mall bay", "Covered, Concierge reserved", "Available"),
    ]

    slot_entities = []
    for loc_idx, code, s_type, rate, desc, feats, avail in slots_seed_info:
        loc = location_entities[loc_idx]
        creator = get_creator(s_type)
        product = creator.create_slot(
            slot_code=code,
            location_id=loc.id,
            base_rate=rate,
            description=desc,
            features=feats,
        )
        slot = ParkingSlot(
            slot_code=product.slot_code,
            location_id=product.location_id,
            slot_type=product.slot_type,
            base_rate=product.base_rate,
            availability_status=avail,
            description=product.description,
            features=product.features,
        )
        db.add(slot)
        slot_entities.append(slot)
    db.flush()

    # 3. Seed Sample Initial Reservation (for A-P01 which is Reserved)
    sample_res = Reservation(
        reference_code="SPK-DEMO-20261020-001",
        driver_name="Arjun Sharma",
        driver_email="arjun.sharma@example.com",
        driver_phone="+91 98765 43210",
        vehicle_type="SUV",
        location_id=location_entities[0].id,
        slot_id=slot_entities[4].id,  # A-P01
        duration_hours=Decimal("3.0"),
        pricing_strategy="VehicleType",
        estimated_amount=Decimal("585.00"),  # 3 * 130 * 1.5 = 585
        status="Confirmed",
    )
    db.add(sample_res)
    db.flush()

    # Seed Action History for Sample Reservation
    action1 = ReservationAction(
        reservation_id=sample_res.id,
        action_type="CONFIRM",
        previous_state="Pending",
        resulting_state="Confirmed",
        success=True,
        undo_available=True,
        snapshot_data=json.dumps({"prev_state": "Pending", "prev_slot_status": "Reserved"}),
    )
    db.add(action1)

    # Seed Notifications for Sample Reservation
    sms_rec = NotificationRecord(
        reservation_id=sample_res.id,
        notification_type="SMS",
        message=f"[SmartPark SMS] Hi Arjun Sharma, reservation {sample_res.reference_code} for slot A-P01 at Central Business District Parking is CONFIRMED. Safe travels!",
        delivery_status="DELIVERED",
    )
    email_rec = NotificationRecord(
        reservation_id=sample_res.id,
        notification_type="Email",
        message=f"[SmartPark Email to arjun.sharma@example.com] Subject: Booking Confirmed ({sample_res.reference_code}) — Dear Arjun Sharma, your parking slot A-P01 has been booked.",
        delivery_status="DELIVERED",
    )
    board_rec = NotificationRecord(
        reservation_id=sample_res.id,
        notification_type="DisplayBoard",
        message=f"[GATE DISPLAY: Central Business District Parking] Bay A-P01 RESERVED for Arjun Sharma (0001). Welcome!",
        delivery_status="DELIVERED",
    )
    db.add_all([sms_rec, email_rec, board_rec])

    # 4. Seed an Occupied slot reservation (for T2-EV2 which is Occupied)
    sample_res2 = Reservation(
        reference_code="SPK-DEMO-20261020-002",
        driver_name="Priya Patel",
        driver_email="priya.patel@example.com",
        driver_phone="+91 91234 56789",
        vehicle_type="Car",
        location_id=location_entities[1].id,
        slot_id=slot_entities[7].id,  # T2-EV2
        duration_hours=Decimal("2.0"),
        pricing_strategy="Location",
        estimated_amount=Decimal("480.00"),  # 2 * 120 * 2.0 = 480
        status="Active",
    )
    db.add(sample_res2)
    db.flush()

    action2 = ReservationAction(
        reservation_id=sample_res2.id,
        action_type="CHECK_IN",
        previous_state="Confirmed",
        resulting_state="Active",
        success=True,
        undo_available=True,
        snapshot_data=json.dumps({"prev_state": "Confirmed", "prev_slot_status": "Reserved"}),
    )
    db.add(action2)

    db.commit()
