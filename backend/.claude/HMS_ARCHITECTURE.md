# Hospital Management System (HMS) - Complete Architecture

## Project Overview

**Name:** Atelier Health - AI-Augmented Hospital Management System  
**Architecture:** Microservices-based with API Gateway  
**Total Services:** 1 API Gateway + 20 microservices (21 total)  
**Frontend:** Separate repository (`../frontend`) — Next.js 14+ on Port 3000  
**Primary Goal:** Complete digitization of hospital-patient interaction including online booking, physical queue management, automatic patient sheet generation, and full medical workflow automation.

---

## Core Features Required

Based on specific requirements, the system must support:

- **Doctor Management:** Track attendance, leave, availability schedules
- **Patient Journey:** Online discovery -> Booking -> Physical queue -> Consultation -> Tests -> Pharmacy -> Billing
- **Automatic Workflows:** Patient sheets auto-generated and sent to doctor when turn comes
- **Real-time Updates:** Live queue tracking, instant notifications
- **Lab Integration:** Doctor allocates tests, patient books, results auto-delivered
- **Pharmacy Integration:** Medicine availability check, direct booking
- **Complete Documentation:** Patient history, prescriptions, invoices
- **Search & Discovery:** Find hospitals by services, find doctors by specialization
- **Communication:** Voice/video calls (ElevenLabs + WebRTC), WhatsApp notifications

---

## Complete Service Architecture (21 Services)

### Infrastructure Service

#### 1. API Gateway
**Port:** 4000  
**Package:** `@hms/api-gateway`  
**Container:** `hms-api-gateway`  
**Purpose:** Single entry point for all client requests

**Responsibilities:**
- Route traffic to appropriate microservices
- Rate limiting and throttling
- Request/response transformation
- SSL termination
- Load balancing
- API versioning management
- JWT validation at entry point
- WebSocket upgrade handling

---

### Core Business Services

#### 2. Identity & Access Management Service
**Port:** 5001  
**Package:** `@hms/identity-service`  
**Container:** `hms-identity-service`  
**Purpose:** Centralized authentication and authorization

**Responsibilities:**
- User registration/login (JWT + refresh tokens)
- Role management (Patient, Doctor, Admin, Receptionist, Lab Technician, Pharmacist)
- Multi-factor authentication (2FA)
- Password reset and recovery
- Session management across all services
- Account lockout after failed attempts
- Device management and logout from all devices

---

#### 3. Doctor Management Service
**Port:** 5002  
**Package:** `@hms/doctor-service`  
**Container:** `hms-doctor-service`  
**Purpose:** Doctor data, attendance, and availability

**Responsibilities:**
- Doctor profiles (specialization, qualifications, fees)
- **Attendance tracking** (check-in/check-out times)
- **Leave management** (scheduled leaves, sick days, vacation)
- **Availability calendar** (real-time availability)
- Working hours configuration (slots)
- Doctor ratings and reviews aggregation
- Performance metrics
- Shift roster management

---

#### 4. Hospital Management Service
**Port:** 5003  
**Package:** `@hms/hospital-service`  
**Container:** `hms-hospital-service`  
**Purpose:** Hospital and department data

**Responsibilities:**
- Hospital profiles and locations
- **Services offered by each hospital** (cardiology, orthopedics, etc.)
- Department management
- Hospital capacity tracking (beds, ICUs)
- Facility photos and descriptions
- Hospital timing and holidays
- Emergency services availability

---

#### 5. Search & Discovery Service
**Port:** 5004  
**Package:** `@hms/search-service`  
**Container:** `hms-search-service`  
**Purpose:** Find doctors and hospitals

**Responsibilities:**
- **Search hospitals by services offered**
- **Search doctors by specialization, name, hospital**
- Filter by location, availability, ratings, fees
- Advanced search with multiple criteria
- Search suggestions and autocomplete
- Sort by distance, ratings, experience
- Save favorite searches

---

#### 6. Appointment Scheduling Service
**Port:** 5005  
**Package:** `@hms/appointment-service`  
**Container:** `hms-appointment-service`  
**Purpose:** Online booking system

**Responsibilities:**
- View doctor schedules
- **Book appointments** (select available slots)
- Real-time availability checking
- Reschedule/cancel appointments
- Appointment confirmations via SMS/Email
- Block slots for emergencies
- Recurring appointments for chronic patients
- Waitlist for fully booked doctors

---

#### 7. Hospital Queue Management Service
**Port:** 5006  
**Package:** `@hms/queue-service`  
**Container:** `hms-queue-service`  
**Purpose:** Physical visit queue system (CRITICAL)

**Responsibilities:**
- **Patient check-in at hospital** (generates queue number)
- **Real-time queue tracking** (current number, your position)
- Multiple queue types (OPD, Emergency, Follow-up)
- **Merge walk-in and appointment queues**
- Estimated wait time calculation based on doctor speed
- Token generation and printing
- Receptionist dashboard for queue control
- Priority handling for elderly/emergency
- SMS notification when turn is approaching
- Digital display boards integration

---

#### 8. Patient Records Service
**Port:** 5007  
**Package:** `@hms/patient-records-service`  
**Container:** `hms-patient-records-service`  
**Purpose:** Medical history and documents

**Responsibilities:**
- Store patient medical history
- **Patient shares records with new doctor**
- Document upload (PDF, images, scans)
- Allergies and adverse reactions tracking
- Family medical history
- Immunization records
- Record access permissions (grant/revoke)
- Historical data timeline view
- Download records as PDF

---

#### 9. Consultation Service
**Port:** 5008  
**Package:** `@hms/consultation-service`  
**Container:** `hms-consultation-service`  
**Purpose:** Doctor-patient interaction workflow

**Responsibilities:**
- **Doctor check-in patient** (marks as "with doctor")
- **Doctor check-out patient** (completes consultation)
- Current consultation status tracking
- Doctor workload view (patients seen today)
- Patient waiting list per doctor
- Consultation notes (SOAP format)
- Time tracking per consultation
- Flag high-priority cases

---

#### 10. E-Prescription Service
**Port:** 5009  
**Package:** `@hms/prescription-service`  
**Container:** `hms-prescription-service`  
**Purpose:** Digital prescriptions

**Responsibilities:**
- Doctor writes prescriptions
- **Check medicine availability** before prescribing
- Drug interaction checking
- Allergy alerts
- Prescription history
- Digital signature on prescriptions
- Send prescription to patient app
- Generic drug suggestions
- Dosage and duration management

---

#### 11. Lab Test Management Service
**Port:** 5010  
**Package:** `@hms/lab-test-service`  
**Container:** `hms-lab-test-service`  
**Purpose:** Diagnostic test workflow

**Responsibilities:**
- **Doctor allocates tests to patients**
- **Patient views and books prescribed tests**
- Test catalog with descriptions and pricing
- Home collection booking
- **Track test status** (pending, sample collected, in-progress, completed)
- Lab slot booking
- Package deals (full body checkup)
- Test preparation instructions

---

#### 12. Lab Result Service
**Port:** 5011  
**Package:** `@hms/lab-result-service`  
**Container:** `hms-lab-result-service`  
**Purpose:** Test result processing and delivery

**Responsibilities:**
- Upload lab results (manual and machine integration)
- **Auto-send results to patient** when ready
- Result normalization and reference ranges
- Historical result comparison and trending
- Critical value alerts (auto-notify doctor)
- Result explanation notes
- Share results with doctor
- Download as PDF

---

#### 13. Pharmacy Service
**Port:** 5012  
**Package:** `@hms/pharmacy-service`  
**Container:** `hms-pharmacy-service`  
**Purpose:** Medicine ordering and management

**Responsibilities:**
- **Patient books medicines directly**
- **Check medicine availability** in real-time
- Online medicine catalog with search
- Prescription validation for restricted medicines
- Medicine delivery tracking
- Alternative medicine suggestions
- Refill reminders for chronic medications
- Online payment for medicines

---

#### 14. Inventory Service
**Port:** 5013  
**Package:** `@hms/inventory-service`  
**Container:** `hms-inventory-service`  
**Purpose:** Stock management

**Responsibilities:**
- Medicine stock tracking
- **Real-time availability checking**
- Low stock alerts and reordering
- Batch number and expiry tracking
- Vendor management
- Purchase order processing
- Consumption analytics
- Stock adjustment (damage, expiry)

---

#### 15. Billing & Invoice Service
**Port:** 5014  
**Package:** `@hms/billing-service`  
**Container:** `hms-billing-service`  
**Purpose:** Payment and invoicing

**Responsibilities:**
- **Generate patient invoices**
- Consultation charges calculation
- Lab test billing
- Medicine billing
- Combined billing (packages)
- Payment processing integration (Razorpay, Stripe)
- Payment plans and installments
- Invoice download and email
- Payment status tracking
- Refund processing

---

#### 16. Notification Service
**Port:** 5015  
**Package:** `@hms/notification-service`  
**Container:** `hms-notification-service`  
**Purpose:** Multi-channel email notifications

**Responsibilities:**
- Email notifications (appointment confirmations, lab results, billing receipts)
- Push notifications for mobile app
- Notification templates management
- Scheduled notifications
- Delivery status tracking

---

#### 17. Patient Sheet Service
**Port:** 5016  
**Package:** `@hms/patient-sheet-service`  
**Container:** `hms-patient-sheet-service`  
**Purpose:** Auto-generate doctor summaries (CRITICAL)

**Responsibilities:**
- **Generate patient summary sheet** when turn comes
- Include patient demographics
- Include previous visits summary
- Include allergies and chronic conditions
- Include current medications
- Include last lab results
- **Auto-send to doctor's dashboard**
- Format for quick doctor review (1-page summary)
- Update in real-time if new info arrives

---

#### 18. Real-Time Service
**Port:** 5017  
**Package:** `@hms/realtime-service`  
**Container:** `hms-realtime-service`  
**Purpose:** Live updates via WebSocket (CRITICAL)

**Responsibilities:**
- **Live queue updates** (token numbers changing)
- **Real-time patient sheet delivery** to doctor screen
- **Doctor availability status** (online/busy/offline)
- Live notifications without page refresh
- Broadcast messages
- Connection management
- Room-based subscriptions
- Presence detection

---

#### 19. Analytics Service
**Port:** 5018  
**Package:** `@hms/analytics-service`  
**Container:** `hms-analytics-service`  
**Purpose:** Reports and insights

**Responsibilities:**
- Doctor performance metrics (patients seen, ratings)
- Hospital queue analytics (avg wait time, peak hours)
- Patient flow analysis
- Revenue reports and trends
- Popular services tracking
- No-show analytics
- Patient demographics insights
- Custom report builder
- Data export (CSV, Excel, PDF)

---

#### 20. Calling Service
**Port:** 5019  
**Package:** `@hms/calling-service`  
**Container:** `hms-calling-service`  
**Purpose:** Voice calls using ElevenLabs and video consultations

**Responsibilities:**
- **Voice calling** using ElevenLabs AI voice
- **Video calling** (WebRTC) between patient and doctor
- Screen sharing for reports/images
- **Virtual queue** for online consultations
- Session recording (with consent)
- Digital prescription during video call
- Chat alongside video
- Connection quality monitoring

---

#### 21. WhatsApp Service
**Port:** 5020  
**Package:** `@hms/whatsapp-service`  
**Container:** `hms-whatsapp-service`  
**Purpose:** WhatsApp notifications and messaging

**Responsibilities:**
- **WhatsApp Business API integration**
- **SMS-equivalent notifications via WhatsApp:**
  - "Your token is next"
  - "Patient sheet sent to doctor"
  - "Lab results ready"
  - "Your appointment confirmed"
- Template message management
- Rich media messages (PDFs, images)
- Two-way conversational messaging
- Delivery and read receipt tracking

---

## Shared / Common Packages

Located in `packages/common/`:

### Common Logging (`@hms/common-logging`)
- Shared Winston logging configuration for all services
- Daily rotating log files
- CLI tool: `checklog` for log inspection
- Used by every microservice

### Observatory
- Placeholder for observability tooling (metrics, tracing)
- Status: Not yet implemented

---

## Key Workflows

### Workflow 1: Online Booking Journey

```
1. Search Service -> Find hospitals by service
2. Search Service -> Find doctors by specialization
3. Doctor Management Service -> Check doctor schedule
4. Appointment Scheduling Service -> Book slot
5. Notification Service -> Send confirmation email
6. WhatsApp Service -> Send confirmation via WhatsApp
7. Billing Service -> Collect payment (if required)
```

### Workflow 2: Physical Hospital Visit (Core Differentiator)

```
1. Hospital Queue Service -> Patient checks in at reception
   -> Generates queue number (e.g., A-42)
   -> WhatsApp Service sends token number

2. Real-Time Service -> Patient watches live queue on app/screen
   -> Shows current token
   -> Shows estimated wait time

3. Patient Sheet Service -> When turn approaches (3 numbers before)
   -> Generates patient summary
   -> Includes history, allergies, previous visits
   -> Auto-sends to doctor's dashboard

4. WhatsApp Service -> "Your turn is next. Proceed to Room 4"

5. Consultation Service -> Doctor checks in patient
   -> Marks as "with doctor"
   -> Doctor reviews auto-generated patient sheet

6. E-Prescription Service -> Doctor writes prescription
   -> Checks medicine availability
   -> Allergy warnings shown

7. Lab Test Management Service -> Doctor allocates tests
   -> Shows in patient's app

8. Consultation Service -> Doctor checks out patient
   -> Marks as completed
   -> Next patient notified

9. Billing Service -> Generate invoice
   -> Consultation + Tests + Medicines

10. Pharmacy Service -> Patient books medicines
    -> Shows availability
    -> Home delivery or pickup
```

### Workflow 3: Lab Test Journey

```
1. Lab Test Management Service -> Patient sees prescribed tests
2. Lab Test Management Service -> Patient selects and books tests
3. Billing Service -> Pay for tests
4. Lab Test Management Service -> Schedule home collection or visit
5. Lab Result Service -> Process results
6. Notification Service -> Email: "Results available"
7. WhatsApp Service -> WhatsApp: "Results available"
8. Lab Result Service -> Auto-send results to patient
9. Patient Records Service -> Archive results
```

### Workflow 4: Remote Consultation (Calling)

```
1. Appointment Scheduling Service -> Book online consultation slot
2. Calling Service -> Initiate voice/video call (ElevenLabs + WebRTC)
3. Patient Records Service -> Doctor views patient history during call
4. E-Prescription Service -> Write prescription during call
5. Lab Test Management Service -> Allocate tests if needed
6. Billing Service -> Generate invoice
7. Notification Service -> Send consultation summary email
```

---

## Critical Integration Points

### Integration 1: Queue + Patient Sheet + Notification (Most Critical)
```
Queue Service <-> Patient Sheet Service <-> Real-Time Service <-> WhatsApp Service
     |                    |                    |                       |
Patient checks     System generates      Doctor receives      Patient gets
in at hospital     patient summary       sheet on screen      WhatsApp when turn
```

### Integration 2: Doctor Availability
```
Doctor Management Service -> Appointment Scheduling
         |                           |
    Attendance status          Available slots
    (Present/Absent)           for booking
```

### Integration 3: Inventory Check
```
E-Prescription Service -> Inventory Service -> Pharmacy Service
        |                        |                    |
   Doctor prescribes      Check availability   Patient orders
   medicine               in stock               medicines
```

### Integration 4: Lab Automation
```
Lab Test Management -> Billing -> Lab Result -> Notification + WhatsApp
        |                |           |            |
   Patient books      Payment    Results      Patient
   prescribed tests   received     ready       notified
```

### Integration 5: Communication
```
Calling Service <-> Real-Time Service <-> Notification Service + WhatsApp Service
       |                   |                        |
  Voice/Video call   Live status updates    Appointment reminders
  (ElevenLabs/WebRTC)                       and follow-ups
```

---

## Technology Stack

### Backend Services
- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Language:** TypeScript 5.3+
- **Package Manager:** pnpm (workspaces)
- **API Style:** REST + WebSocket
- **Documentation:** OpenAPI/Swagger

### Frontend (Separate Repository)
- **Framework:** Next.js 14+ with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Animations:** Framer Motion
- **Icons:** Lucide React

### Database
- **Primary:** PostgreSQL (relational data)
- **Cache:** Redis (sessions, frequent queries)
- **Search:** Elasticsearch (doctor/hospital search)
- **Document:** MongoDB (logs, unstructured data)

### Message Queue
- **Primary:** RabbitMQ (event-driven architecture)
- **Alternative:** Apache Kafka (high throughput)

### AI/ML
- **Voice:** ElevenLabs (Calling Service)
- **OCR:** Tesseract + OCR.space API (future)
- **LLM:** Google Gemini API / OpenAI (future)

### Infrastructure
- **Containerization:** Docker
- **Orchestration:** Kubernetes (production)
- **CI/CD:** GitHub Actions
- **Registry:** Docker Hub (`verma2904/hms-*`)
- **Monitoring:** Prometheus + Grafana
- **Logging:** Winston + Daily Rotate (per-service)

### External Integrations
- **WhatsApp:** WhatsApp Business API
- **Email:** SendGrid / AWS SES
- **Payments:** Razorpay / Stripe
- **Storage:** AWS S3 / Google Cloud Storage
- **Video:** WebRTC
- **Voice:** ElevenLabs
- **Maps:** Google Maps API

---

## Project Structure

```
backend/
├── packages/
│   ├── services/                     (21 services)
│   │   ├── api-gateway/              Port 4000
│   │   ├── identity-service/         Port 5001
│   │   ├── doctor-service/           Port 5002
│   │   ├── hospital-service/         Port 5003
│   │   ├── search-service/           Port 5004
│   │   ├── appointment-service/      Port 5005
│   │   ├── queue-service/            Port 5006
│   │   ├── patient-records-service/  Port 5007
│   │   ├── consultation-service/     Port 5008
│   │   ├── prescription-service/     Port 5009
│   │   ├── lab-test-service/         Port 5010
│   │   ├── lab-result-service/       Port 5011
│   │   ├── pharmacy-service/         Port 5012
│   │   ├── inventory-service/        Port 5013
│   │   ├── billing-service/          Port 5014
│   │   ├── notification-service/     Port 5015
│   │   ├── patient-sheet-service/    Port 5016
│   │   ├── realtime-service/         Port 5017
│   │   ├── analytics-service/        Port 5018
│   │   ├── calling-service/          Port 5019
│   │   └── whatsapp-service/         Port 5020
│   └── common/
│       ├── logging/                  @hms/common-logging
│       └── observatory/              (placeholder)
├── docker-compose.local.yml          Local build compose
├── docker-compose.production.yml     Production compose (Docker Hub images)
├── Makefile                          Build & push automation
├── services.json                     Service registry metadata
└── pnpm-workspace.yaml               Workspace config
```

---

## Deployment Configuration

### Docker
- **Network:** `hms-network` (bridge driver)
- **Image Naming:** `verma2904/hms-<service-name>:latest`
- **Build:** `make build-all` or `make build-<service>`
- **Push:** `make push-all` or `make push-<service>`

### Docker Compose Files
- **Local Development:** `docker-compose.local.yml` (builds from source)
- **Production:** `docker-compose.production.yml` (pulls from Docker Hub)

---

## Database Schema Highlights

### Core Tables

**users**
- id, email, password_hash, role, phone, created_at

**doctors**
- id, user_id, first_name, last_name, specialization, qualification, experience_years, fees, hospital_id, rating, is_active

**doctor_schedules**
- id, doctor_id, day_of_week, start_time, end_time, slot_duration, is_available

**doctor_attendance**
- id, doctor_id, date, check_in_time, check_out_time, status (present/absent/leave)

**hospitals**
- id, name, address, city, phone, services[], total_beds, available_beds, latitude, longitude

**appointments**
- id, patient_id, doctor_id, hospital_id, appointment_date, slot_time, status, type (online/walk-in), created_at

**queue_tokens**
- id, patient_id, doctor_id, hospital_id, token_number, status (waiting/in-progress/completed), generated_at, called_at, completed_at

**patient_sheets**
- id, patient_id, doctor_id, appointment_id, generated_at, content (JSON), status

**prescriptions**
- id, patient_id, doctor_id, appointment_id, medicines[], diagnosis, notes, created_at

**lab_tests**
- id, name, description, price, preparation_instructions, duration_hours

**lab_bookings**
- id, patient_id, doctor_id, test_id, booking_date, status (pending/completed), result_url

**medicines**
- id, name, description, manufacturer, price, stock_quantity, category, requires_prescription

**invoices**
- id, patient_id, appointment_id, items[], total_amount, discount, tax, final_amount, status (pending/paid), paid_at

---

## Security Requirements

### Authentication & Authorization
- JWT tokens with refresh token rotation
- Role-based access control (RBAC)
- API key validation for service-to-service
- Rate limiting per user/IP

### Data Protection
- Encryption at rest (AES-256)
- Encryption in transit (TLS 1.3)
- PHI (Protected Health Information) masking in logs
- Data anonymization for analytics

### Compliance
- HIPAA compliance (audit trails, encryption)
- GDPR compliance (data export, right to be forgotten)
- Data retention policies
- Breach notification protocols

### Audit Logging
- Every data access logged
- Every modification logged with before/after values
- Failed login attempts tracked
- Audit logs immutable and encrypted

---

## Scaling Considerations

### Horizontal Scaling
- Each service can be scaled independently
- Load balancers for high-traffic services
- Database read replicas for query-heavy services

### Caching Strategy
- Redis for session storage (Identity Service)
- Redis for queue state (Queue Management Service)
- CDN for static assets and images
- Application-level caching for hospital/doctor lists

### Database Optimization
- Database per service pattern
- Event sourcing for audit trails
- CQRS for read-heavy operations (search, analytics)

---

## Monitoring & Alerting

### Metrics to Track
- API response times per service
- Queue wait times per hospital
- Doctor consultation duration
- Patient no-show rates
- System error rates
- Database connection pool usage

### Alerts
- High queue wait times (>30 minutes)
- Doctor hasn't checked in by scheduled time
- Lab results delayed beyond SLA
- Service downtime
- Database connection exhaustion

---

## Future Services (Planned - Not Yet Implemented)

The following services are planned for future phases but do not exist in the codebase yet:

| Service | Planned Port | Purpose |
|---------|-------------|---------|
| Ambulance & Emergency | 5021 | Emergency response, panic button, GPS tracking |
| Insurance Verification | 5022 | Real-time eligibility, cashless approval |
| Feedback & Rating | 5023 | Patient reviews, doctor ratings, sentiment analysis |
| Medical History AI Analysis | 5024 | AI-powered health insights, predictive alerts |
| Diet & Nutrition | 5025 | Diet plans, calorie tracking, nutritionist booking |
| Second Opinion | 5026 | Multi-doctor consultation, case sharing |
| Vaccination | 5027 | Immunization schedules, digital certificates |
| Medical Document OCR | 5028 | Scan/digitize reports, extract text from prescriptions |
| Health Monitoring | TBD | Wearable integration, vital trends, anomaly detection |
| Telemedicine (expanded) | TBD | Enhanced video consultation features |

---

## Documentation Reference

This document serves as the master architecture specification for the Hospital Management System backend. For detailed API specifications, refer to individual service documentation.

**Last Updated:** 2026-04-11  
**Version:** 2.0  
**Status:** Architecture Updated - Reflects Actual Implementation
