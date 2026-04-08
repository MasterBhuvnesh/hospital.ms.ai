Authentication Service

* User registration, login, and logout
* JWT token generation and validation
* OAuth integration (optional external login)
* Role-based access control (RBAC) enforcement
* Password hashing, reset, and security policies
* Session management and token refresh
* Multi-tenant identity handling (hospital-level isolation)

---

User Service

* Central user profile management (common for all roles)
* Role assignment and updates (patient, doctor, admin, staff)
* Linking users to hospital entities
* Contact information and account settings
* Account activation, deactivation, and status control
* Basic user search and lookup across system

---

Hospital Service

* Hospital profile and branch management
* Department and specialization configuration
* Staff onboarding and management
* Bed, room, and facility tracking
* Operational settings (working hours, policies)
* Hospital-level analytics configuration
* Multi-tenant configuration and isolation

---

Doctor Service

* Doctor profile and credentials management
* Specialization and department mapping
* Availability and schedule management
* Consultation fee and service configuration
* Doctor-hospital association management
* Doctor performance metrics tracking
* Doctor search and discovery support

---

Patient Service

* Patient profile and demographic data management
* Health profile (blood group, allergies, conditions)
* Patient-hospital association tracking
* Emergency contact and preferences
* Patient search and lookup
* Patient lifecycle management (active/inactive)

---

Appointment Service

* Appointment booking, rescheduling, and cancellation
* Slot generation and availability validation
* Conflict detection and resolution
* Queue and waitlist management
* Appointment status lifecycle management
* Emergency and priority handling
* Doctor schedule synchronization
* Appointment history tracking

---

Medical Record Service

* Creation and storage of medical records (EHR)
* Doctor notes, diagnosis, and treatment logs
* File attachments (reports, scans, prescriptions)
* Structured and unstructured data handling
* Patient health timeline generation
* Record versioning and updates
* Secure access and sharing of records
* Compliance and audit tracking

---

Prescription Service

* Digital prescription creation and management
* Medication details, dosage, and instructions
* Prescription history tracking
* Integration with pharmacy service
* Refill and renewal management
* Drug interaction alerts (future enhancement)

---

Pharmacy Service

* Medicine catalog and inventory management
* Prescription-based order processing
* Order tracking and delivery status
* Stock updates and alerts
* Refill reminders and automation
* Integration with external pharmacy vendors
* Billing integration for medicine purchases

---

Billing & Payment Service

* Invoice generation (appointments, pharmacy, services)
* Payment processing integration (Razorpay/Stripe)
* Payment status tracking and reconciliation
* Insurance claim summaries and support
* Refund and cancellation handling
* Financial reporting and revenue tracking
* Bill itemization and breakdown

---

Notification Service

* Email, SMS, and push notification delivery
* Appointment reminders and updates
* Payment and billing notifications
* Prescription and medicine reminders
* System alerts and announcements
* Notification templates and customization
* Retry and failure handling for message delivery

---

Communication Service

* Real-time chat between doctor and patient
* Conversation and message management
* File and media sharing in chats
* Read receipts and delivery tracking
* Integration with notification service
* Optional video consultation support (WebRTC)

---

AI Processing Service

* Medical report simplification (NLP)
* Clinical summary generation
* Medical image analysis (X-ray, MRI)
* Risk prediction and health insights
* Chatbot intelligence and response generation
* Model inference orchestration
* AI result storage and retrieval
* Confidence scoring and audit logging

---

Analytics Service

* Hospital performance metrics (revenue, occupancy)
* Doctor performance and workload analytics
* Patient health trends and insights
* Operational dashboards and reporting
* Data aggregation and transformation
* Real-time and batch analytics processing

---

Search Service

* Doctor search (specialization, availability)
* Hospital and department search
* Patient lookup (internal use)
* Full-text search for medical records
* Indexing and query optimization
* Integration with OpenSearch/Meilisearch

---

File Storage Service

* Upload and storage of medical files and images
* Secure file access and retrieval
* File metadata management
* Integration with S3 or object storage
* Access control and signed URLs
* File versioning and lifecycle management

---

Queue / Event Service

* Event publishing and consumption (RabbitMQ)
* Asynchronous workflow handling
* Decoupling between services
* Retry mechanisms and dead-letter queues
* Event logging and monitoring
* Integration with jobs and background processing

---

Cache Service

* Redis-based caching for frequently accessed data
* Session storage and management
* Rate limiting and throttling
* Performance optimization for APIs
* Temporary data storage (OTP, tokens)

---

Audit & Compliance Service

* Tracking all critical system actions
* User activity logs and access history
* Compliance support (HIPAA/GDPR readiness)
* Data access auditing and traceability
* Security event logging
* Report generation for audits

---

Integration Service

* External lab system integration
* Insurance provider integration
* Payment gateway integration
* Third-party API management
* Data synchronization with external systems
* Webhook handling and processing
