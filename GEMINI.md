# Hospital MS AI - Project Overview

This project is a production-grade, scalable **Hospital Management System (HMS)** backend and **AI Ecosystem**. It is designed as a polyglot system to leverage the strengths of both TypeScript (for business logic) and Python (for AI/ML and specialized processing).

## 🚀 Vision
To build a modern HMS that integrates cutting-edge AI features like medical report simplification, clinical summary generation, and risk prediction, while maintaining high performance and strict multi-tenant isolation.

## 🛠 Tech Stack

### Core Backend (Business Logic)
- **Language:** TypeScript
- **Runtime:** Node.js
- **Framework:** Express.js
- **ORM:** Prisma (PostgreSQL)
- **Validation:** Zod
- **Auth:** JWT + RBAC

### AI & Specialized Services
- **Language:** Python
- **Framework:** FastAPI
- **AI Framework:** LangChain
- **LLM Runtime:** Ollama (Local models)
- **Vector DB:** FAISS
- **PDF Generation:** WeasyPrint / ReportLab (Python-based)

### Infrastructure & Data
- **Relational DB:** PostgreSQL
- **NoSQL DB:** MongoDB (Chat, Logs, AI outputs)
- **Cache:** Redis (Sessions, OTP, Rate limiting)
- **Messaging:** RabbitMQ (Event-driven async workflows)
- **Search:** Meilisearch / OpenSearch
- **File Storage:** MinIO (S3 compatible)
- **Containerization:** Docker & Docker Compose

## 🏗 Architecture Principles
1. **Modular Monolith/Microservices:** The core-api is a modular monolith in TypeScript, designed for easy extraction into microservices.
2. **Polyglot Separation:** AI and heavy processing (PDF, data science) are isolated in Python services.
3. **Clean Architecture:** Controller → Service → Repository → Database.
4. **Event-Driven:** Async workflows are handled via RabbitMQ.
5. **Multi-Tenancy:** Strict isolation using `hospitalId` across all core entities.

## 📂 Project Structure
- `.github/`: CI/CD (GitHub Actions) and repository assets.
- `.prompts/`: **Source of Truth** for requirements and implementation instructions.
  - `PROMPT.md`: Global objectives and execution strategy.
  - `PROMPT_BACKEND.md`: Backend implementation requirements.
  - `PROMPT_AI_AGENTS.md`: AI service implementation requirements.
  - `SAMPLE_ARCHITECTURE.md`: Example architecture and project structure.
  - `PORTAL.md`: Portal features for different user roles.
  - `TECH_STACK.md`: Detailed technology choices.
  - `SERVICE.md`: Definitions for 20+ microservices/modules.
  - `AI_AGENTS.md`: Detailed AI feature specifications.
  - `PORTAL.md`: Feature lists for Hospital, Doctor, and Patient portals.
- `backend/`: (Work in Progress) Expected structure:
  - `services/core-api/`: TypeScript backend.
  - `services/ai-service/`: Python AI service.
  - `services/pdf-service/`: Python PDF renderer.
  -`services.json`: Service definitions and contracts.
  - `infra/`: Docker and environment configurations.

## 🚦 Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js & pnpm (for local TS development)
- Python 3.10+ (for local Python development)
- Ollama (for AI features)

### Running the System
Once implemented, the entire ecosystem can be started via:
```bash
docker-compose up
```

## 📝 Development Conventions
- **Strict Typing:** No `any` in TypeScript; mandatory type hints in Python.
- **Validation:** Use Zod (TS) and Pydantic (Python) for all boundaries.
- **Logging:** Centralized logging using Pino (Node) and Loguru (Python).
- **Git:** Commit messages should be clear and follow standard conventions.
- **Documentation:** Maintain updated markdown files in `.prompts/` as the system evolves.
