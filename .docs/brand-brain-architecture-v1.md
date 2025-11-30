# Brand Brain Architecture V1

This document outlines the architecture for the "Brand Brain" layer in ZYNK 8.0, which serves as the centralized knowledge base for projects.

## 1. Core Concept

**Brand Brain** is a project-level entity that aggregates knowledge from various sources (websites, PDFs, social feeds) and provides relevant context to Sub-Agents via RAG (Retrieval-Augmented Generation).

## 2. Data Model

### BrandBrain (Firestore)
A singleton-like document per project (or one per brand group).
- **Sources**: List of URLs/Files to crawl.
- **VectorStoreConfig**: Connection details for the vector database (Pinecone/Weaviate).
- **Guardrails**: Brand-specific safety and style rules.

(See `.docs/firestore-schema.md` for full TypeScript interface)

## 3. Integration Flow

### A. Configuration Time (Admin UI)
1.  **Sub-Agent Template**:
    - `requiresBrandBrain`: Boolean. If true, this agent *can* use Brand Brain.
    - `brandContextMode`: 'light' (summary) or 'full' (detailed chunks).
2.  **Sub-Agent Instance**:
    - `brandBrainScope`: Defines which Brand Brain to query (default: 'project').

### B. Execution Time (Runtime)
When a Sub-Agent is executed (e.g., via `agent-runner`):

1.  **Check Requirement**:
    - If `template.requiresBrandBrain` is true:
2.  **Query Brand Brain**:
    - Call `queryBrandBrain(projectId, taskPrompt, { mode: template.brandContextMode })`.
    - This function (in `utils-brand-brain.js`) retrieves relevant snippets from the vector store.
3.  **Enrich Prompt**:
    - Call `enrichSystemPromptWithBrandContext(systemPrompt, contextResults)`.
    - Appends the retrieved context to the system prompt.
4.  **Resolve Runtime Config**:
    - Call `resolveRuntimeConfig` (as usual) to get model settings.
5.  **Call LLM**:
    - Execute the LLM call with the enriched prompt and resolved config.

## 4. Knowledge Curator Role

The **Knowledge Curator** (`engineTypeId: knowledge_curator`) is a special Sub-Agent that:
- **Manages** the Brand Brain (add sources, trigger crawls).
- **Synthesizes** new knowledge from other agents' outputs (e.g., "This post performed well, let's add its style to the guidelines").
- **Default Config**: `requiresBrandBrain: true`, `brandContextMode: full`.

## 5. Future Roadmap (TODO)
- [ ] Implement actual Vector Store connection (Pinecone/Weaviate).
- [ ] Build "Knowledge Ingestion" pipeline (Crawler -> Embedding -> Vector DB).
- [ ] Implement "Feedback Loop" where high-performing content automatically updates the Brand Brain.
