# Cognee Memory Architecture in CareerVault

## Overview

CareerVault integrates **Cognee** to elevate the platform from a simple document vault to a **Career Memory System**. This architecture enables the platform to continuously ingest documents, extract factual career data, and build a unified, queryable knowledge graph.

## High-Level Data Flow

1. **Upload & OCR (Node.js)**
   - A user uploads a document via the `/upload` API endpoint in the Node.js backend.
   - The file is stored, categorized, and OCR/Vision extraction takes place as part of the core ParseFlow pipeline.

2. **Trigger Memory Sync (Node.js -> Python ML Service)**
   - Once the document is persisted (`persistAndNotify`), `triggerMemorySync` makes a non-blocking asynchronous POST request to the Python ML Service `/memory/sync`.
   - The document state (`memory_status`) is set to `PROCESSING`.

3. **Information Extraction (Python)**
   - `memory_sync.py` receives the document data.
   - `memory_extractor.py` leverages rules and heuristics to generate unstructured factual strings from the document based on its category (Resume, Certificate, Internship, etc.).

4. **Schema Transformation (Python)**
   - `memory_builder.py` normalizes the extracted facts into Pydantic models (e.g., `CareerProfile`, `Skill`, `Experience`, `Achievement`).

5. **Graph Ingestion (Cognee Layer)**
   - `cognee_service.py` manages a singleton connection to Cognee.
   - Using `cognee.add()` and `cognee.cognify()`, the semantic schemas are inserted into the Knowledge Graph under a consistent dataset name (`careervault_memory`).

6. **Insights & Retrieval**
   - **Assistant:** The `guidebotService.js` hits the `/memory/ask` endpoint before calling Groq. The Python side uses `cognee.search()` to retrieve top memory insights, which are then injected as context into the GuideBot prompt.
   - **Dashboard Visualization:** `Insights.jsx` requests network topologies from the `/memory/insights` endpoint, allowing users to visually explore their extracted knowledge graph nodes and edges.

## Key Components

- **Node.js (`server.js`)**: Orchestrates the initial upload and dispatches data to Python.
- **Node.js (`guidebotService.js`)**: Uses graph context to give personalized AI responses.
- **Python ML Service (`ml_api.py`)**: Hosts the endpoints (`/memory/sync`, `/memory/ask`, `/memory/insights`).
- **Python ML Service (`memory/`)**:
  - `memory_sync.py`: Async pipeline orchestrator.
  - `memory_extractor.py`: Rule-based factual extractor.
  - `memory_builder.py`: Maps data into Cognee Pydantic objects.
  - `cognee_service.py`: Encapsulates all Cognee API interactions.
  - `memory_queries.py`: Facilitates retrieval for GuideBot and the Insights dashboard.

## Resilience

- The memory graph sync is *decoupled* from the main upload loop. A failure in Cognee ingestion will set `memory_status` to `FAILED` but will **never** prevent the document from being securely stored in the user's vault.
- Cognee deduplication is handled at the `MemoryNode` generation stage inside `memory_builder.py` ensuring stable IDs.
