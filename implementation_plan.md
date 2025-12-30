# ZYNK Development Roadmap: Specialized Agents & Nano Banana Integration

## Overview
This document outlines the transition from a monolithic content generation function to a specialized agentic workflow, prioritizing the correct integration of Google's "Nano Banana" (Gemini Image) models and infographic visualization capabilites.

## Phase 1: Foundation - Correct Models & Branding (Immediate)
**Goal:** Fix the "Nano Banana" integration based on Google Cloud documentation and implement ZYNK branding.

### 1.1 Correct Model Integration
*   **Objective:** Use exact model IDs from Vertex AI documentation.
*   **Target Models:**
    *   **Nano Banana:** `gemini-2.5-flash-image` (Legacy/Internal name) or `gemini-2.0-flash` (Public) -> *Action: Test exact ID from screenshot.*
    *   **Nano Banana Pro:** `gemini-3-pro-image-preview`.
*   **Implementation:**
    *   Modify `functions/index.js` to support these specific IDs.
    *   Ensure proper API Endpoint (Vertex AI vs AI Studio) usage.

### 1.2 ZYNK Watermark System
*   **Objective:** Ensure all generated visuals/slides verify origin.
*   **Implementation:**
    *   **Method:** CSS Overlay (Lightweight & High Quality).
    *   **Logic:** Inject a fixed position `div` with high z-index containing the ZYNK logo/text into the generated HTML structure of Pitch Decks and Brochures.
    *   **Benefit:** Visible on screen and included in PDF exports without server-side image processing latency.

### 1.3 Admin Configuration
*   **Objective:** Allow switching between these specific models.
*   **Implementation:** Update `admin-settings.html` to list the new Gemini Image models.

---

## Phase 2: Structural Shift - Specialized Agents
**Goal:** Create a dedicated "Pitch Deck Agent" capable of visual planning, not just text generation.

### 2.1 Agent Segregation
*   **Action:** Create `functions/agents/pitchDeckAgent.js`.
*   **Role:** Separate the Pitch Deck logic from the generic `generateCreativeContent` function.

### 2.2 Infographic Prompting Engine
*   **Concept:** Context-Aware Visual Generation.
*   **Flow:**
    1.  **Context Extraction:** Agent reads Knowledge Hub data.
    2.  **Visual Planning:** LLM determines *what* to visualize (e.g., "A bar chart showing 200% growth").
    3.  **Prompt Generation:** LLM writes a specific prompt for Nano Banana: *"Minimalist info-graphic style bar chart, dark background with neon purple bars, text '200% Growth', high resolution."*
    4.  **Generation:** Call Image Model.
    5.  **Placement:** Insert into Slide Layout.

---

## Phase 3: Observability & Workflow
**Goal:** Integrate into the DAG Executor for visibility.

### 3.1 DAG Integration
*   Connect the "Create Pitch Deck" button to the `DAGExecutor` class instead of direct Cloud Function call.
*   Define a new "Publication" phase in the DAG.

### 3.2 Visual Monitoring
*   Update Admin Dashboard to show the specific sub-steps of the Pitch Deck Agent (Planning -> Drawing -> Coding).
