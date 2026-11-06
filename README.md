# SmartPark — Smart Parking Reservation and Management System

**A College Design Patterns Implementation Project**  
Demonstrating **Six Gang of Four (GoF) Design Patterns** through a fully functional, production-style web application.

---

## 1. Project Overview & Problem Statement

Urban parking often suffers from inefficient bay utilization, lack of real-time visibility, rigid pricing systems, and fragmented payment providers.  
**SmartPark** is a complete, full-stack smart parking platform designed to simulate multi-hub urban parking reservation and management with:
- Dynamic slot creation based on physical and hardware requirements.
- Real-time slot availability synchronization across booking states.
- Strategy-driven pricing based on parking duration, vehicle category, or geographic zone.
- Auditable operations with snapshot-based state reversal (undo).
- Decoupled multi-channel simulated notifications (SMS, Email, and Entrance Gate Display Boards).
- Normalized payment gateway adaptation for UPI (paise conversion), Cards, and Digital Wallets.

---

## 2. Technology Stack

### Backend
- **Language**: Python 3.11+
- **Framework**: FastAPI (Asynchronous REST API, automatic OpenAPI / Swagger documentation)
- **Validation**: Pydantic v2 + Pydantic-Settings
- **ORM & Database**: SQLAlchemy 2.0 with persistent SQLite (`smartpark.db`)
- **Server**: Uvicorn ASGI
- **Testing**: Pytest, HTTPX, Pytest-Asyncio

### Frontend
- **Framework**: React 18 + Vite + TypeScript
- **Styling**: Tailwind CSS (Minimalist warm neutral SaaS aesthetic inspired by Claude's design language)
- **Routing**: React Router v6
- **Icons**: Lucide React
- **Data Visualization**: Recharts (occupancy and slot breakdown charts)
- **HTTP Client**: Axios with centralized error normalization

---

## 3. The Six Gang of Four (GoF) Design Patterns

| Pattern | Category | Implementation Package | Application Role |
|---------|----------|------------------------|------------------|
| **Factory Method** | Creational | `backend/app/patterns/factory_method/` | Instantiates `RegularSlot`, `EVSlot`, `DisabledSlot`, and `PremiumSlot` via `SlotCreator` subclasses. |
| **Strategy** | Behavioral | `backend/app/patterns/strategy/` | Interchangeable pricing algorithms: `DurationPricing` (30% off > 4h), `VehicleTypePricing` (0.5x, 1.0x, 1.5x), and `LocationPricing` (zone multipliers). |
| **State** | Behavioral | `backend/app/patterns/state/` | Enforces reservation lifecycle (`Pending -> Confirmed -> Active -> Completed/Cancelled`) and synchronizes slot status (`Available`, `Reserved`, `Occupied`). |
| **Observer** | Behavioral | `backend/app/patterns/observer/` | Broadcasts state transitions to `SMSObserver`, `EmailObserver`, and `DisplayBoardObserver` without coupling. |
| **Command** | Behavioral | `backend/app/patterns/command/` | Encapsulates actions (`ConfirmCommand`, `CheckInCommand`, `CheckOutCommand`, `CancelCommand`) with atomic execution, audit history, and snapshot undo. |
| **Adapter** | Structural | `backend/app/patterns/adapter/` | Unifies incompatible payment interfaces: converts rupees to paise for `UPIGateway`, authorizes with `CardGateway`, and debits `WalletService`. |

For complete documentation with diagrams, class structures, and code references, see [`docs/DESIGN_PATTERNS.md`](docs/DESIGN_PATTERNS.md).

---

## 4. Project Structure

```
smartpark/
├── README.md                          # Main project guide
├── .gitignore                         # Git exclusion rules
├── docs/
│   ├── DESIGN_PATTERNS.md             # In-depth GoF design patterns breakdown
│   ├── DEMO_GUIDE.md                  # Step-by-step college review demonstration script
│   └── ARCHITECTURE.md                # System diagrams, ER model, sequence workflows
│
├── backend/
│   ├── requirements.txt               # Backend Python dependencies
│   ├── .env.example                   # Backend environment sample
│   ├── app/
│   │   ├── main.py                    # FastAPI application initialization & lifespan
│   │   ├── core/                      # Configuration and settings
│   │   ├── database/                  # SQLAlchemy session & automatic DB seeder
│   │   ├── models/                    # Persistent database models
│   │   ├── schemas/                   # Pydantic validation schemas
│   │   ├── services/                  # Business domain services
│   │   ├── api/v1/                    # REST API endpoints (/health, /slots, /reservations, etc.)
│   │   └── patterns/                  # The 6 Gang of Four design pattern implementations
│   │       ├── factory_method/        # Slot creators & products
│   │       ├── strategy/              # Pricing strategies & context
│   │       ├── state/                 # State classes & lifecycle context
│   │       ├── observer/              # Subject & notification observers
│   │       ├── command/               # Commands, invoker & undo snapshots
│   │       └── adapter/               # Payment gateways & adapters
│   └── tests/                         # Pytest automated test suite (39 tests)
│
└── frontend/
    ├── package.json                   # Frontend npm packages
    ├── vite.config.ts                 # Vite bundler configuration
    ├── tsconfig.json                  # TypeScript compiler settings
    ├── tailwind.config.js             # Tailwind design palette
    ├── index.html                     # HTML5 entrypoint
    └── src/
        ├── main.tsx                   # React root mount
        ├── App.tsx                    # React Router configuration
        ├── api/client.ts              # Axios API client & error extractor
        ├── types/                     # TypeScript entity definitions
        ├── utils/formatters.ts        # Currency (INR ₹) & date formatters
        ├── layouts/                   # AppShell, Sidebar, Topbar
        ├── pages/                     # Dashboard, Parking, Reservations, Activity, Notifications
        │   └── admin/                 # Admin console, Location & Slot management, Payment ledger
        └── components/                # Reusable UI cards, badges, modals, dialogs
```

---

## 5. Installation and Execution (Windows PowerShell)

### Prerequisites
- **Python 3.11+** installed (`python --version`)
- **Node.js v18+ & npm** installed (`node --version`, `npm --version`)

---

### Step 1: Backend Setup & Execution

Open a **Windows PowerShell** terminal:

```powershell
# Navigate to the backend directory
cd "C:\Users\sanja\.gemini\antigravity\scratch\smartpark\backend"

# Create a virtual environment (if not already created)
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Install backend dependencies
pip install -r requirements.txt

# Start the FastAPI backend server
$env:PYTHONPATH="C:\Users\sanja\.gemini\antigravity\scratch\smartpark\backend"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

- **Backend API**: `http://localhost:8000`
- **Interactive OpenAPI Documentation (Swagger)**: `http://localhost:8000/docs`
- **Health Check**: `http://localhost:8000/api/v1/health`

---

### Step 2: Frontend Setup & Execution

Open a **second Windows PowerShell** terminal:

```powershell
# Navigate to the frontend directory
cd "C:\Users\sanja\.gemini\antigravity\scratch\smartpark\frontend"

# Install npm dependencies (if not already installed)
npm install

# Start the Vite development server
npm run dev
```

- **Web Application URL**: `http://localhost:5173`

---

### Step 3: Running the Automated Backend Test Suite

In a PowerShell terminal with the virtual environment activated:

```powershell
cd "C:\Users\sanja\.gemini\antigravity\scratch\smartpark\backend"
$env:PYTHONPATH="C:\Users\sanja\.gemini\antigravity\scratch\smartpark\backend"
pytest tests -v
```

All **39 automated tests** verify:
- Factory Method creator production and invalid type rejection.
- Strategy pattern pricing math and boundary conditions.
- State machine valid transitions and illegal transition prevention.
- Observer notification delivery and error resilience.
- Command execution, snapshot history, and safe undo.
- Adapter rupee-to-paise conversion and gateway response normalization.
- End-to-end API integration and concurrency conflict handling.

---

### Step 4: Safely Resetting the Database

To reset the database back to initial seed data:

```powershell
# Stop the backend server (Ctrl + C), then remove the SQLite database file:
Remove-Item "C:\Users\sanja\.gemini\antigravity\scratch\smartpark\backend\smartpark.db" -ErrorAction SilentlyContinue

# Restarting the backend will automatically re-create all tables and seed fresh sample data.
```

---

## 6. Key Features Implemented

1. **Live Multi-Hub Dashboard**: Visualizes capacity across city hubs, airport terminals, and residential zones.
2. **Interactive Parking Bay Browser**: Filter by location, slot type, rate, and availability in real-time.
3. **Dynamic Pricing Estimator**: Choose between Duration tiered rates, Vehicle category rates, or Location zone rates.
4. **Lifecycle State Progression**: Drivers move through `Pending -> Confirmed -> Active -> Completed`. Invalid transitions return clean HTTP 400 errors.
5. **Decoupled Simulated Alerts**: SMS, Email, and LED gate displays receive state change notices automatically.
6. **Command Audit Log & Safe Undo**: Previous reservation actions can be safely undone, reverting slot availability and notifying observers.
7. **Simulated Payment Adapters**: Safe dummy payment processing for UPI (rupees to paise), Cards, and Digital Wallets.
8. **Comprehensive Administration**: Create parking facilities, instantiate bays via Factory Method creators, and review payment transactions.

---

## 7. Known Limitations & Simulation Notice

- **Software Simulation**: Payment gateways (UPI, Cards, Wallets) and driver messaging (SMS, Email) are simulated in software. No real monetary transactions or telecommunication network messages are dispatched.
- **Demo Mode**: The application runs in demo review mode without requiring credentials, making it immediately explorative for academic evaluation.
- **Single-Node Concurrency**: Slot concurrency safeguards utilize database transactions and optimistic locking suitable for SQLite and single-instance deployments.
