You are a Senior Backend Engineer and Software Architect. Your task is to build a production-grade backend system for a Hospital Management Platform (HMS). The system must be scalable, modular, and ready for future microservices extraction.

Tech Stack Requirements:

* Language: TypeScript only
* Runtime: Node.js
* Package Manager: pnpm (monorepo-ready structure)
* Framework: Express.js (strict separation of concerns)
* ORM: Prisma (PostgreSQL)
* NoSQL: MongoDB (Mongoose or native driver)
* Cache: Redis
* Queue/Event System: RabbitMQ
* Containerization: Docker (all services including DBs)
* Validation: Zod
* Auth: JWT-based authentication with RBAC

Architecture Requirements:

* Follow modular monolith architecture (microservice-ready)
* Use clean architecture principles:
  Controller → Service → Repository → Database
* No business logic in controllers
* All database access must go through repository layer
* Use environment-based config management
* Use async event-driven patterns where appropriate

Project Structure:
Create the following backend structure:

backend/

* src/

  * api/

    * controllers/
    * routes/
    * validators/
  * modules/

    * auth/
    * user/
    * hospital/
    * doctor/
    * patient/
    * appointment/
    * medical-record/
    * prescription/
    * pharmacy/
    * billing/
    * notification/
    * communication/
    * analytics/
    * search/
    * audit/
  * repositories/

    * postgres/
    * mongo/
    * redis/
  * services/
  * events/

    * producers/
    * consumers/
  * queue/
  * jobs/
  * db/
  * cache/
  * middleware/
  * config/
  * constants/
  * types/
  * utils/
  * cli/
  * tests/
  * app.ts
  * server.ts
* prisma/

  * schema.prisma
* docker/

  * Dockerfile
  * docker-compose.yml

Core Functional Requirements:

1. Authentication Service:

* User registration and login
* JWT generation and validation
* Role-based access control (roles: SUPER_ADMIN, HOSPITAL_ADMIN, STAFF, DOCTOR, PATIENT)
* Password hashing and reset functionality

2. User Service:

* Central user identity
* Role assignment
* Link users to hospital

3. Hospital Service:

* Create and manage hospitals
* Department and staff management

4. Doctor Service:

* Doctor profiles
* Availability scheduling
* Consultation configuration

5. Patient Service:

* Patient profiles
* Health-related metadata

6. Appointment Service:

* Appointment booking, cancellation, rescheduling
* Slot validation and conflict handling
* Appointment lifecycle management
* Event publishing (appointment.created, cancelled)

7. Medical Record Service:

* EHR storage
* Doctor notes and attachments
* Record history tracking

8. Prescription Service:

* Digital prescriptions
* Medication tracking

9. Billing Service:

* Invoice generation
* Payment tracking

10. Notification Service:

* Email/SMS/Push abstraction
* Event-triggered notifications

11. Communication Service:

* Chat system (store in MongoDB)

12. Event System:

* Use RabbitMQ for async communication
* Implement producers and consumers
* Include retry and error handling

13. Cache Layer:

* Redis for caching frequently accessed data
* Session and OTP storage

Database Requirements:

* Use Prisma schema for PostgreSQL (multi-tenant using hospitalId)
* Use MongoDB for chat and AI-related data
* Use Redis for caching and sessions

Deliverables:

* Complete working backend codebase
* Prisma schema and migrations
* Docker setup for:

  * backend
  * postgres
  * mongodb
  * redis
  * rabbitmq
* Environment configuration (.env.example)
* Sample seed script
* Basic unit test setup
* API routes for all modules

Code Quality Constraints:

* Strict TypeScript typing (no any)
* Use async/await consistently
* Proper error handling and centralized error middleware
* Logging system (Winston or Pino)
* Clean, readable, production-level code
* Follow consistent naming conventions

Output Instructions:

* Generate full folder structure with files
* Provide code for each core module (auth, user, appointment at minimum)
* Ensure project can run with docker-compose up
* Include instructions to run locally
