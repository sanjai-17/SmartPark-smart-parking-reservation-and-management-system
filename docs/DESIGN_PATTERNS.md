# SmartPark — Gang of Four Design Patterns Implementation Guide

This document provides a comprehensive technical breakdown of the **six Gang of Four (GoF) design patterns** implemented in the **SmartPark — Smart Parking Reservation and Management System**.

---

## Pattern Overview Matrix

| # | Design Pattern | Category | Role in SmartPark | Trigger Endpoint / Action |
|---|----------------|----------|-------------------|---------------------------|
| 1 | **Factory Method** | Creational | Dynamic instantiation of specialized parking slots (Regular, EV, Disabled, Premium) | `POST /api/v1/slots` (Admin bay creation) |
| 2 | **Strategy** | Behavioral | Interchangeable pricing algorithms (Duration, VehicleType, Location) | `POST /api/v1/pricing/estimate` & Reservation creation |
| 3 | **State** | Behavioral | Strict reservation lifecycle enforcement & slot occupancy synchronization | `POST /api/v1/reservations/{id}/confirm`, `check-in`, etc. |
| 4 | **Observer** | Behavioral | Decoupled multi-channel alerts (SMS, Email, Gate Display Boards) | Triggered upon state changes in `ReservationLifecycleContext` |
| 5 | **Command** | Behavioral | Encapsulating lifecycle operations with persistent audit snapshots & undo | `POST /api/v1/reservations/{id}/undo` |
| 6 | **Adapter** | Structural | Normalizing disparate 3rd party gateways (UPI paise, Card auth, Wallet debits) | `POST /api/v1/reservations/{id}/payments` |

---

## 1. Factory Method Pattern (Creational)

### Problem
The SmartPark system supports multiple distinct types of parking bays, each having distinct base rates, physical attributes, safety protocols, and hardware features (e.g., high-voltage EV chargers, accessible wheelchair clearance, VIP valet canopies). Instantiating these slots using hardcoded `if-elif` conditionals in API routes or frontend code introduces tight coupling, violates the Open/Closed Principle (OCP), and complicates introducing future bay types (such as Solar Canopy or Truck Bays).

### Solution
Define an abstract creator class `SlotCreator` with a factory method `create_slot(...)`. Concrete creator subclasses instantiate specific `SlotProduct` products. A central creator registry resolves the appropriate creator at runtime from the incoming request.

### Classes & Responsibilities
- **`SlotProduct` (Abstract Product)**: Base class defining slot properties (`slot_code`, `location_id`, `base_rate`, `features`, `description`).
- **`RegularSlot`**: Standard parking bay product (default ₹50.00/hr, CCTV surveillance).
- **`EVSlot`**: High-power EV charging bay product (default ₹90.00/hr, 50kW Type-2 DC charger).
- **`DisabledSlot`**: Accessible bay product (default ₹40.00/hr, wheelchair ramp clearance).
- **`PremiumSlot`**: VIP covered bay product (default ₹120.00/hr, valet concierge, prime entry).
- **`SlotCreator` (Abstract Creator)**: Declares the factory method `create_slot(...)`.
- **`RegularSlotCreator`, `EVSlotCreator`, `DisabledSlotCreator`, `PremiumSlotCreator`**: Concrete creators implementing `create_slot` to produce concrete slot products.
- **`get_creator(slot_type)`**: Registry resolver that rejects unknown slot types with `UnknownSlotTypeError`.

### Source Code Paths
- `backend/app/patterns/factory_method/slot_factory.py`
- `backend/app/patterns/factory_method/__init__.py`
- `backend/app/services/parking_service.py` (`create_slot` method)
- `backend/tests/test_factory_method.py`

### Trigger & Workflow
1. Administrator navigates to **Administration -> Manage Slots (Factory)** (`/admin/slots`).
2. Admin selects bay type (e.g., `Electric Vehicle`) and submits bay code `EV-401`.
3. The API endpoint `POST /api/v1/slots` resolves `EVSlotCreator` via `get_creator("Electric Vehicle")`.
4. `EVSlotCreator.create_slot(...)` initializes an `EVSlot` with dedicated EV telemetry and hardware features.
5. The slot is saved to SQLite database and rendered on the live map.

---

## 2. Strategy Pattern (Behavioral)

### Problem
Parking charge calculations vary according to business rules: tiered duration discounts, vehicle category classifications, or municipal geographic zones. Hardcoding these pricing algorithms inside controllers or frontend components leads to algorithmic rigidity, duplication, and makes adding new pricing models difficult.

### Solution
Define a common `PricingStrategy` interface with a `calculate(session)` method. Implement concrete strategies for each pricing algorithm. Encapsulate execution within a `PricingContext` that can swap strategies dynamically.

### Classes & Responsibilities
- **`PricingStrategy` (Abstract Strategy)**: Common interface declaring `calculate(session: PricingSession) -> PricingResult`.
- **`DurationPricing`**:
  - First 4 hours: billed at 100% of base rate (`min(H, 4) * R`).
  - Additional hours: billed at 70% of base rate (`max(H - 4, 0) * R * 0.70`).
  - Formula: `Total = min(H, 4) * R + max(H - 4, 0) * R * 0.70`.
- **`VehicleTypePricing`**:
  - Bike: multiplier `0.5`.
  - Car: multiplier `1.0`.
  - SUV: multiplier `1.5`.
  - Formula: `Total = H * R * vehicle_multiplier`.
- **`LocationPricing`**:
  - Suburb: multiplier `1.0`.
  - City Centre: multiplier `1.5`.
  - Airport: multiplier `2.0`.
  - Formula: `Total = H * R * location_multiplier`.
- **`PricingContext`**: Maintains reference to a strategy object and coordinates execution.
- **`get_pricing_strategy(name)`**: Registry lookup resolving strategy instances.

### Source Code Paths
- `backend/app/patterns/strategy/pricing_strategy.py`
- `backend/app/patterns/strategy/__init__.py`
- `backend/app/services/pricing_service.py`
- `backend/tests/test_strategy.py`

### Trigger & Workflow
1. Driver opens the **Reserve Bay Modal** (`/parking`).
2. Adjusting the vehicle type, hours, or strategy selector immediately triggers `POST /api/v1/pricing/estimate`.
3. The backend calculates the fee using Decimal arithmetic rounded to 2 decimal places and returns a readable breakdown with formula explanation.

---

## 3. State Pattern (Behavioral)

### Problem
A parking reservation goes through distinct lifecycle stages: `Pending`, `Confirmed`, `Active`, `Completed`, and `Cancelled`. Certain transitions are illegal (e.g. checking out a pending reservation, or cancelling an already completed reservation). Maintaining these rules via deeply nested conditional statements (`if status == 'Pending': ...`) creates brittle code with high cyclomatic complexity.

### Solution
Represent each state as an independent class implementing `ReservationState`. Operations (`confirm`, `enter`, `exit`, `cancel`) are delegated to the state object representing the current state. Illegal actions raise domain exceptions (`InvalidTransitionError`).

### State Machine Transition Rules
```
                 ┌──────────────┐
                 │   Pending    │
                 └──────┬───────┘
                        │
             ┌──────────┴──────────┐
             │ confirm()           │ cancel()
             ▼                     ▼
     ┌───────────────┐     ┌───────────────┐
     │   Confirmed   │     │   Cancelled   │ [Terminal]
     └───────┬───────┘     └───────────────┘
             │ cancel()            ▲
             ├─────────────────────┘
             │ enter() (check-in)
             ▼
     ┌───────────────┐
     │    Active     │
     └───────┬───────┘
             │ exit() (check-out)
             ▼
     ┌───────────────┐
     │   Completed   │ [Terminal]
     └───────────────┘
```

### Slot Availability Synchronization
- `PendingState`: Slot is set to `Reserved` (temporary hold).
- `ConfirmedState`: Slot remains `Reserved`.
- `ActiveState`: Slot transitions to `Occupied`.
- `CompletedState`: Slot reverts to `Available`.
- `CancelledState`: Slot reverts to `Available`.

### Source Code Paths
- `backend/app/patterns/state/reservation_state.py`
- `backend/app/patterns/state/__init__.py`
- `backend/tests/test_state.py`

---

## 4. Observer Pattern (Behavioral)

### Problem
When a reservation changes state, various external subsystems must be notified: the driver should receive an SMS and email alert, and entrance gate LED matrix display boards must update their live slot guidance. Hardcoding these notification systems into the reservation lifecycle introduces tight coupling and causes crashes if an external messaging provider fails.

### Solution
Implement the Observer pattern with a `ReservationSubject` and `NotificationObserver` interface. Concrete observers register with the subject. When a transition succeeds, the subject broadcasts an event to all observers.

### Classes & Responsibilities
- **`NotificationObserver` (Abstract Observer)**: Interface with `update(...)` method.
- **`SMSObserver`**: Simulates SMS delivery to the driver's phone with state-specific messages.
- **`EmailObserver`**: Simulates structured email notifications with subject lines and confirmation receipts.
- **`DisplayBoardObserver`**: Simulates updating parking entrance LED display boards (e.g. `[GATE DISPLAY: Bay A-101 RESERVED]`).
- **`ReservationSubject` (Subject)**: Maintains a subscriber list with `attach(observer)`, `detach(observer)`, and `notify(...)`.
- **Fault-Tolerant Notification**: If any observer raises an exception, the subject logs the failure safely into `NotificationRecord` without aborting the core transaction.

### Source Code Paths
- `backend/app/patterns/observer/notification_observer.py`
- `backend/app/patterns/observer/__init__.py`
- `backend/tests/test_observer.py`

---

## 5. Command Pattern (Behavioral)

### Problem
Operations on reservations (confirming, checking in, checking out, cancelling) need to be auditable, repeatable, and capable of being safely reversed (undone). Without encapsulating actions as objects, undo logic becomes ad-hoc and prone to leaving database state inconsistent.

### Solution
Implement `ReservationCommand` as an abstract command exposing `execute(db)` and `undo(db, action_record)`. A `CommandInvoker` executes commands within database transactions, captures a state snapshot (previous reservation state and slot status), and writes audit records to the `ReservationAction` table.

### Concrete Commands
- **`ConfirmCommand`**: Executes `Pending -> Confirmed`. Undo reverts to `Pending` and keeps slot `Reserved`.
- **`CheckInCommand`**: Executes `Confirmed -> Active`. Undo clears `checked_in_at`, returns state to `Confirmed`, and sets slot to `Reserved`.
- **`CheckOutCommand`**: Executes `Active -> Completed`. Undo returns state to `Active`, clears `checked_out_at`, and re-marks slot `Occupied`.
- **`CancelCommand`**: Executes `Pending/Confirmed -> Cancelled`. Undo restores the previous state, provided the slot is still `Available`.
- **`CommandInvoker`**:
  - `run(command, db)`: Executes command, persists action record with snapshot, marks newest action as undoable, invalidates older undo flags, and triggers observers.
  - `undo_last(reservation_id, db)`: Validates that the latest action is eligible, verifies current state matches snapshot, invokes `undo()`, marks action as settled, records an `UNDO` audit entry, and notifies observers.

### Source Code Paths
- `backend/app/patterns/command/reservation_command.py`
- `backend/app/patterns/command/__init__.py`
- `backend/tests/test_command.py`

---

## 6. Adapter Pattern (Structural)

### Problem
SmartPark supports multiple payment channels (UPI, Credit/Debit Cards, Digital Wallets). Each 3rd party payment gateway expects incompatible parameter structures, data types, and currency units:
- **UPI Gateway**: Expects a Virtual Payment Address (`vpa`) and amounts in integer **paise** (1 Rupee = 100 Paise).
- **Card Gateway**: Expects card token identifiers and amounts as floating-point numbers; returns banking auth codes.
- **Wallet Service**: Expects a digital wallet account ID and Decimal INR amounts; returns digital debit confirmations.

### Solution
Define a unified `PaymentProcessor` interface exposing `pay(amount: Decimal, account: str) -> PaymentResult`. Create concrete adapter classes that wrap each incompatible 3rd party gateway and normalize the outputs into a standard `PaymentResult`.

### Adapters & Gateway Conversions
- **`UPIAdapter`**: Converts Rupee Decimal amounts into integer Paise:
  $$\text{paise} = \text{int}(\text{rupees} \times 100)$$
  Example: ₹125.50 $\rightarrow$ `12550` paise. Invokes `UPIGateway.process_upi_collect()`.
- **`CardAdapter`**: Converts Decimal to float, invokes `CardGateway.authorize_and_charge()`, maps card network approval codes.
- **`WalletAdapter`**: Invokes `WalletService.execute_wallet_debit()` and normalizes digital wallet balances.
- **`get_payment_processor(method)`**: Registry resolving the adapter from requested payment method.

### Source Code Paths
- `backend/app/patterns/adapter/payment_adapter.py`
- `backend/app/patterns/adapter/__init__.py`
- `backend/tests/test_adapter.py`
