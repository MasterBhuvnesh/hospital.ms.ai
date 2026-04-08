You are a Senior AI Engineer and Backend Architect. Your task is to build a production-grade AI service for a Hospital Management System (HMS). This service will act as an independent microservice and integrate with the core backend via HTTP and RabbitMQ.

Tech Stack Requirements:

* Language: Python
* Framework: FastAPI
* LLM Runtime: Ollama (local models)
* AI Framework: LangChain
* Vector Store: FAISS
* Embeddings: Ollama embeddings or compatible local embedding models
* Queue: RabbitMQ (for async processing)
* Containerization: Docker
* Data Input: Medical records, reports, prescriptions, chat context

Architecture Requirements:

* Must be a standalone service (no coupling with TypeScript codebase)
* Follow clean architecture:
  Routes → Services → Models → External Integrations
* All AI logic must be inside service layer (not routes)
* Must support both synchronous (API) and asynchronous (queue-based) processing
* Must be stateless (except vector store persistence)

Project Structure:

ai-service/

* app/

  * routes/

    * summarize.py
    * report_simplifier.py
    * chatbot.py
  * services/

    * langchain_service.py
    * embedding_service.py
    * vector_service.py
    * inference_service.py
  * models/

    * ollama_client.py
  * vectorstore/

    * faiss_index/
  * schemas/

    * request_schemas.py
    * response_schemas.py
  * utils/
  * config/

    * settings.py
  * queue/

    * consumer.py
    * producer.py
  * main.py
* requirements.txt
* Dockerfile

Core Features to Implement:

1. Medical Report Simplifier:

* Input: raw medical report text
* Output: simplified explanation in plain language
* Highlight abnormal values and severity
* Use LangChain prompt templates
* Include confidence score

2. Clinical Summary Generator:

* Input: patient medical history and records
* Output: structured summary (key conditions, recent events, risks)
* Optimize for doctor readability

3. AI Chatbot (Context-Aware):

* Input: user query + optional patient context
* Output: conversational response
* Use Retrieval-Augmented Generation (RAG)
* Retrieve relevant data from FAISS vector store

4. Embedding & Vector Store:

* Convert medical documents into embeddings
* Store and retrieve vectors using FAISS
* Support similarity search for chatbot and summarization

5. Ollama Integration:

* Connect to local Ollama instance
* Load and manage models
* Handle inference requests
* Support configurable models (via env)

6. Async Processing (RabbitMQ):

* Consume events like:

  * medical_record.created
  * appointment.completed
* Trigger AI processing (summary generation, indexing)
* Publish results if needed

7. API Endpoints:

POST /summarize

* Input: medical_text
* Output: simplified summary

POST /clinical-summary

* Input: structured patient data
* Output: doctor-friendly summary

POST /chat

* Input: query + optional patient_id
* Output: contextual response

POST /embed

* Input: document text
* Output: stored embeddings reference

GET /health

* Service health check

8. Error Handling:

* Gracefully handle model failures
* Timeout handling for LLM calls
* Return fallback responses if AI fails

9. Logging:

* Log all AI requests and responses (without sensitive data leakage)
* Track latency and failures

10. Configuration:

* All configs via environment variables:

  * OLLAMA_BASE_URL
  * MODEL_NAME
  * RABBITMQ_URL
  * VECTOR_DB_PATH

11. Docker Requirements:

* Expose FastAPI on port 8000
* Ensure Ollama connectivity
* Mount volume for FAISS persistence

12. Code Quality:

* Use type hints everywhere
* Follow clean, modular structure
* Avoid hardcoding prompts (use templates)
* Ensure reusability of LangChain chains

Output Requirements:

* Generate full working FastAPI service
* Include all routes, services, and integrations
* Provide requirements.txt
* Provide Dockerfile
* Ensure service runs with: docker build + docker run

Do not skip implementation details. Build as if this will be deployed in production and integrated with a real hospital system.
