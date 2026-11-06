# SmartPark — System Architecture & Design Specification

## 1. System Overview

SmartPark is built using a clean layered architecture with a clear separation of concerns between API routing, business domain logic, Gang of Four design patterns, persistent data models, and a modern single-page frontend.

```mermaid
flowchart TD
    subgraph Frontend["React 18 + TypeScript + Vite SPA"]
        UI["Tailwind CSS SaaS UI"]
        AxiosClient["Centralized Axios API Client"]
        Routes["React Router Pages & AppShell"]
        UI --> Routes
        Routes --> AxiosClient
    end

    subgraph Backend["FastAPI Python 3.11 Backend"]
        API["REST API Endpoints (/api/v1)"]
        Services["Business Services Layer"]
        
        subgraph GoFPatterns["Gang of Four Design Patterns"]
            FactoryMethod["1. Factory Method (Slot Creators)"]
            Strategy["2. Strategy (Pricing Algorithms)"]
            State["3. State (Reservation Lifecycle)"]
            Observer["4. Observer (Multi-channel Alerts)"]
            Command["5. Command (Actions & Snapshot Undo)"]
            Adapter["6. Adapter (Unified Payment Gateways)"]
        end

        Repo["SQLAlchemy 2.0 ORM"]
        API --> Services
        Services --> GoFPatterns
        GoFPatterns --> Repo
    end

    subgraph Database["Persistent SQLite Database"]
        DB[(smartpark.db)]
        Repo --> DB
    end

    AxiosClient <-->|"JSON over HTTP (CORS)"| API
```

---

## 2. Database Schema (Entity-Relationship)

```mermaid
erDiagram
    ParkingLocation ||--o{ ParkingSlot : contains
    ParkingLocation ||--o{ Reservation : hosts
    ParkingSlot ||--o{ Reservation : allocates
    Reservation ||--o{ PaymentTransaction : settles
    Reservation ||--o{ NotificationRecord : generates
    Reservation ||--o{ ReservationAction : audits

    ParkingLocation {
        int id PK
        string name
        string address
        string zone "Suburb | City Centre | Airport"
        text description
        datetime created_at
    }

    ParkingSlot {
        int id PK
        string slot_code
        int location_id FK
        string slot_type "Regular | EV | Disabled | Premium"
        decimal base_rate
        string availability_status "Available | Reserved | Occupied | Unavailable"
        text description
        string features
        datetime created_at
    }

    Reservation {
        int id PK
        string reference_code UK
        string driver_name
        string driver_email
        string driver_phone
        string vehicle_type "Bike | Car | SUV"
        int location_id FK
        int slot_id FK
        decimal duration_hours
        string pricing_strategy
        decimal estimated_amount
        decimal final_amount
        string status "Pending | Confirmed | Active | Completed | Cancelled"
        datetime created_at
        datetime updated_at
        datetime checked_in_at
        datetime checked_out_at
    }

    PaymentTransaction {
        int id PK
        string transaction_reference UK
        int reservation_id FK
        string payment_method "UPI | Card | Wallet"
        decimal amount
        string status "SUCCESS | FAILED"
        string gateway_reference
        datetime created_at
    }

    NotificationRecord {
        int id PK
        int reservation_id FK
        string notification_type "SMS | Email | DisplayBoard"
        text message
        string delivery_status
        datetime created_at
    }

    ReservationAction {
        int id PK
        int reservation_id FK
        string action_type
        string previous_state
        string resulting_state
        boolean success
        boolean undo_available
        text snapshot_data
        datetime created_at
    }
```

---

## 3. Pattern Interactions in the Core Workflow

When a driver books, confirms, enters, and exits a parking slot:

```mermaid
sequenceDiagram
    autonumber
    actor Driver
    participant Frontend as React UI
    participant API as FastAPI Router
    participant Service as ReservationService
    participant Strategy as PricingStrategy
    participant Command as CommandInvoker
    participant State as ReservationState
    participant Observer as ReservationSubject
    participant Adapter as PaymentAdapter
    participant DB as SQLite Database

    Driver->>Frontend: Select bay & pricing strategy
    Frontend->>API: POST /api/v1/pricing/estimate
    API->>Strategy: calculate(session)
    Strategy-->>Frontend: Return breakdown & estimated INR total

    Driver->>Frontend: Submit Booking
    Frontend->>API: POST /api/v1/reservations
    API->>Service: create_reservation()
    Service->>DB: Lock bay (status='Reserved')
    Service->>DB: Insert Reservation (status='Pending')
    Service->>Observer: notify('CREATE')
    Observer->>DB: Log SMS, Email, Display alerts

    Driver->>Frontend: Confirm Booking
    Frontend->>API: POST /api/v1/reservations/{id}/confirm
    API->>Command: run(ConfirmCommand)
    Command->>State: confirm() -> Transition to ConfirmedState
    Command->>DB: Save snapshot & set undo_available=True
    Command->>Observer: notify('CONFIRM')

    Driver->>Frontend: Arrive on-site (Check In)
    Frontend->>API: POST /api/v1/reservations/{id}/check-in
    API->>Command: run(CheckInCommand)
    Command->>State: enter() -> Transition to ActiveState
    Command->>DB: Slot status='Occupied'

    Driver->>Frontend: Pay via UPI
    Frontend->>API: POST /api/v1/reservations/{id}/payments
    API->>Adapter: pay(₹125.50, 'user@vpa')
    Adapter->>Adapter: Convert ₹125.50 -> 12550 paise
    Adapter-->>API: Normalized PaymentResult (SUCCESS)
    API->>DB: Insert PaymentTransaction

    Driver->>Frontend: Depart (Check Out)
    Frontend->>API: POST /api/v1/reservations/{id}/check-out
    API->>Command: run(CheckOutCommand)
    Command->>State: exit() -> Transition to CompletedState
    Command->>DB: Slot status='Available' (released)
```
