backend/
│
├── src/
│   ├── api/
│   │   ├── controllers/            # Handles HTTP requests, calls services, returns responses
│   │   ├── routes/                 # Defines API endpoints and maps them to controllers
│   │   └── validators/             # Request validation schemas (Zod)
│   │
│   ├── modules/                    # Domain-based architecture (each can become a microservice later)
│   │   ├── auth/                   # Authentication and authorization logic
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.repository.ts
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.validator.ts
│   │   │   └── auth.types.ts
│   │   │   └── Dockerfile
│   │   │
│   │   ├── user/                   # Central user identity and role management
│   │   ├── hospital/               # Hospital, departments, staff, infrastructure
│   │   ├── doctor/                 # Doctor profiles, availability, specialization
│   │   ├── patient/                # Patient profiles and health data
│   │   ├── appointment/            # Booking, scheduling, conflict resolution
│   │   ├── medical-record/         # EHR, reports, attachments
│   │   ├── prescription/           # Digital prescriptions and medication logic
│   │   ├── pharmacy/               # Medicine inventory and orders
│   │   ├── billing/                # Invoices, payments, transactions
│   │   ├── notification/           # Email, SMS, push notifications
│   │   ├── communication/          # Chat and real-time messaging
│   │   ├── analytics/              # Metrics, dashboards, aggregation
│   │   ├── search/                 # Full-text and filtered search
│   │   └── audit/                  # Logs and compliance tracking
│   │
│   ├── repositories/               # DB abstraction layer (Prisma/Mongo queries)
│   │   ├── postgres/               # SQL queries and Prisma access
│   │   ├── mongo/                  # MongoDB models and queries
│   │   └── redis/                  # Redis data access
│   │
│   ├── services/                   # Shared business logic across modules
│   │   ├── auth.service.ts
│   │   ├── email.service.ts
│   │   ├── sms.service.ts
│   │   └── payment.service.ts
│   │
│   ├── events/                     # Event-driven system (RabbitMQ producers/consumers)
│   │   ├── producers/              # Publish events (e.g., appointment.created)
│   │   ├── consumers/              # Handle async events
│   │   └── event.types.ts
│   │
│   ├── queue/                      # RabbitMQ setup and connection management
│   │   ├── connection.ts
│   │   └── channels.ts
│   │
│   ├── jobs/                       # Background jobs and scheduled tasks
│   │   ├── appointment.job.ts
│   │   ├── notification.job.ts
│   │   └── cleanup.job.ts
│   │
│   ├── db/                         # Database connections
│   │   ├── postgres.ts             # Prisma client setup
│   │   ├── mongo.ts                # MongoDB connection
│   │   └── redis.ts                # Redis connection
│   │
│   ├── cache/                      # Redis abstraction layer
│   │   ├── cache.service.ts
│   │   └── cache.keys.ts
│   │
│   ├── middleware/                 # Request lifecycle handlers
│   │   ├── auth.middleware.ts      # JWT verification
│   │   ├── role.middleware.ts      # RBAC enforcement
│   │   ├── error.middleware.ts     # Global error handling
│   │   └── logger.middleware.ts    # Request logging
│   │
│   ├── config/                     # Environment and service configuration
│   │   ├── env.ts                  # Env validation (Zod)
│   │   ├── database.ts             # DB configs
│   │   ├── redis.ts
│   │   └── rabbitmq.ts
│   │
│   ├── constants/                  # Enums and static values
│   │   ├── roles.ts
│   │   ├── appointment.ts
│   │   └── status.ts
│   │
│   ├── types/                      # Global TypeScript types/interfaces
│   │   ├── express.d.ts
│   │   └── common.types.ts
│   │
│   ├── utils/                      # Helper utilities
│   │   ├── logger.ts
│   │   ├── crypto.ts
│   │   └── date.ts
│   │
│   ├── cli/                        # CLI tools (seed, migrations, scripts)
│   │   ├── seed.ts
│   │   └── migrate.ts
│   │
│   ├── tests/                      # Unit and integration tests
│   │   ├── unit/
│   │   └── integration/
│   │
│   ├── app.ts                      # Express app configuration
│   └── server.ts                   # Application entry point
│
├── prisma/                         # Prisma ORM schema and migrations
│   ├── schema.prisma
│   └── migrations/
│
├── docker/                         # Docker configuration
│   ├── Dockerfile
│   └── docker-compose.yml
│
├── .env                            # Environment variables
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.json










ALSO HERE : 
services/core-api/
│
├── src/
│   ├── api/
│   ├── modules/
│   ├── repositories/
│   ├── services/
│   ├── events/
│   ├── queue/
│   ├── db/
│   ├── cache/
│   ├── middleware/
│   ├── config/
│   ├── utils/
│   ├── app.ts
│   └── server.ts
│
├── prisma/
└── Dockerfile

services/ai-service/
│
├── app/
│   ├── routes/
│   │   ├── summarize.py
│   │   ├── report_simplifier.py
│   │   └── chatbot.py
│
│   ├── services/
│   │   ├── langchain_service.py
│   │   ├── embedding_service.py
│   │   └── inference_service.py
│
│   ├── vectorstore/
│   │   └── faiss_index/
│
│   ├── models/
│   │   └── ollama_client.py
│
│   └── main.py
│
├── requirements.txt
└── Dockerfile

services/pdf-service/
│
├── app/
│   ├── templates/
│   ├── invoice_generator.py
│   └── main.py
│
├── requirements.txt
└── Dockerfile

Communication Between Services
Sync (HTTP) : Core API → AI Service → Response ; Core API → PDF Service → PDF URL
Async (RabbitMQ): AppointmentCreated → Queue → Notification Worker → AI Processing