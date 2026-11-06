# SmartPark — College Review Demonstration Guide

This guide provides a step-by-step demonstration walkthrough for college evaluators, reviewers, and professors to verify all six Gang of Four design patterns and functional workflows.

---

## Pre-Demonstration Checklist

1. **Verify Backend Server** is running on: `http://localhost:8000`
   - FastAPI Docs: `http://localhost:8000/docs`
   - Health Status: `http://localhost:8000/api/v1/health`
2. **Verify Frontend Application** is running on: `http://localhost:5173`
3. **Database**: Initialized with realistic sample hubs, slots, and seed records.

---

## Ordered Demonstration Steps

### Step 1: Dashboard & System Telemetry
- Open `http://localhost:5173` in your browser.
- **Explain to Evaluator**:
  - The dashboard displays live database-backed statistics (Total Bays, Available Bays, Active Drivers, Revenue).
  - The Recharts visualizer renders occupancy by parking facility and slot distribution.
  - Notice the **Audit Activity Stream** in the lower right, reflecting GoF Command pattern events stored in SQLite.

---

### Step 2: Factory Method Pattern — Creating a New Parking Bay
- In the left sidebar, click **Administration -> Manage Slots (Factory)** (`/admin/slots`).
- Point out the **Creational Factory Method** badge at the top.
- Choose a target location (e.g. `Central Business District Parking`).
- Enter a unique bay code: `EV-901`.
- Under **Concrete Slot Creator Type**, click **Electric Vehicle**.
  - Notice the badge updates to display `EVSlotCreator`.
  - The creator automatically populates default features: `50kW Type-2 EV Fast Charger, Dedicated power metering`.
- Click **Construct Slot via Factory**.
- **Result**:
  - A success toast confirms that `EVSlotCreator` constructed the slot product.
  - The slot immediately appears in the **Slot Inventory Table** below.
  - **Code Reference**: Show `backend/app/patterns/factory_method/slot_factory.py`.

---

### Step 3: Strategy Pattern — Dynamic Pricing Engine
- Click **Find Parking** in the sidebar (`/parking`).
- Locate the newly created bay `EV-901` (or click on any Available slot).
- Click **Reserve Bay**. The booking modal opens.
- Notice the **Strategy Pattern** pill in the modal header.
- Demonstrate interchangeable strategies:
  1. Select **By Duration**:
     - Set duration to `6 hours`.
     - Point out the calculation formula: first 4 hours at 100%, next 2 hours discounted at 70% ($0.7 \times R$).
  2. Select **By Vehicle**:
     - Switch vehicle from `Car (1.0x)` to `Bike (0.5x)` or `SUV (1.5x)`.
     - Notice the total recalculates in real-time through the backend endpoint `POST /api/v1/pricing/estimate`.
  3. Select **By Location**:
     - Shows the zone multiplier applied (Suburb 1.0x, City Centre 1.5x, Airport 2.0x).
- Fill in driver name: `Aakash Mehta`, phone: `+91 98765 00001`, email: `aakash@example.com`.
- Click **Confirm Reservation**.

---

### Step 4: State & Observer Patterns — Lifecycle Progression & Live Alerts
- Navigate to **Reservations** in the sidebar (`/reservations`).
- Find Aakash Mehta's booking (marked with status badge **Pending**).
- **Observer Demonstration**:
  - Open **Notifications** (`/notifications`) in a new tab or inspect the bottom of the reservation details page.
  - Notice the 3 simulated alerts generated: `[SmartPark SMS]`, `[SmartPark Email]`, and `[GATE DISPLAY]`.
- **State Transition 1 (Confirm)**:
  - On the reservation row, click the green **Confirm** button.
  - The status advances to **Confirmed**.
  - Go to `/parking` and verify the slot status changed to **Reserved**.
- **State Transition 2 (Check In)**:
  - Return to Reservations and click **Check In**.
  - Status advances from **Confirmed -> Active**.
  - Go to `/parking` and observe that the bay is now marked **Occupied**.
- **State Transition 3 (Check Out)**:
  - Click **Check Out**.
  - Status advances to terminal state **Completed**.
  - The slot immediately reverts to **Available** on the parking map.
- **Code Reference**: Show `backend/app/patterns/state/reservation_state.py` and `backend/app/patterns/observer/notification_observer.py`.

---

### Step 5: Command Pattern — Undo Last Action
- Navigate to **Activity & Undo** in the sidebar (`/activity`).
- Point out the latest command record in the table with an **Undoable** badge.
- Click **Undo Action** and confirm the dialog.
- **Explain to Evaluator**:
  - The backend executes `CommandInvoker.undo_last()`.
  - It retrieves the persistent JSON snapshot stored in SQLite.
  - The reservation reverts safely to `Active`, and slot occupancy is restored to `Occupied`.
  - A new `UNDO` audit action is written to the database.
- **Code Reference**: Show `backend/app/patterns/command/reservation_command.py`.

---

### Step 6: Adapter Pattern — Simulated Payments
- Return to **Reservations** (`/reservations`) and click the black **Pay** button on a reservation.
- Notice the **Adapter Pattern** badge in the modal.
- Select the **UPI VPA** gateway:
  - Enter dummy VPA `driver@oksbi`.
  - **Explain to Evaluator**: The `UPIAdapter` receives the Decimal amount in Indian Rupees (e.g. ₹125.50) and converts it to integer paise (`12550 paise`) as required by the simulated UPI gateway.
- Click **Pay**.
- Once cleared, navigate to **Administration -> Payment Ledger** (`/admin/payments`).
- Review the transaction record showing the normalized reference `TXN-UPI-...`, amount, gateway reference, and status.
- **Code Reference**: Show `backend/app/patterns/adapter/payment_adapter.py`.

---

### Step 7: Automated Test Suite Verification
- In PowerShell, run the automated test suite:
  ```powershell
  $env:PYTHONPATH="C:\Users\sanja\.gemini\antigravity\scratch\smartpark\backend"
  & "C:\Users\sanja\.gemini\antigravity\scratch\smartpark\backend\venv\Scripts\pytest.exe" "C:\Users\sanja\.gemini\antigravity\scratch\smartpark\backend\tests" -v
  ```
- **Show Evaluator**:
  - All 39 test cases pass covering Factory Method, Strategy, State transitions, Observer dispatch, Command execution & Undo, and Payment Adapters.
