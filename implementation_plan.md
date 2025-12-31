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

## Proposed Changes

### [Backend]

#### [MODIFY] [universal_creator.js](file:///Users/sangjaeseo/Antigravity/ZINC/functions/agents/universal_creator.js)
- **Extreme Minimization for Press Releases**:
    - **Persona Shift**: Change the system persona for PRs from "Designer" to "Pure News Wire Editor".
    - **UI Elimination**: Explicitly forbid any website components: no hero sections, no navigation, no buttons, no glassmorphism, no marketing "slides".
    - **Document Styling**: Use a plain, single-column layout with 1-inch equivalent margins. Black text on white background. Standard serif typography (`EB Garamond` or `Times New Roman`).
    - **Linear Flow**: News title followed immediately by dateline and body text. No "sections".
    - **Embedded Imagery**: Change image placement from "gallery" or "sections" to "embedded within text flow" (e.g., one impact image below the headline, one in the middle of the body).
- **Design Archetype Variety (Non-PR)**:
    - Retain the variety system for Pitch Decks and Brochures to ensure they don't all look the same, but keep them strictly separated from the PR logic.

### [Frontend]
- No major frontend changes needed, but ensure the Cloud Function call passes the `newsType` correctly to influence the editor persona.

## Verification Plan
1. **Visual Check**: Generate a PR and confirm it looks like a Google Doc or Word document.
2. **Layout Check**: No "Explore Feature" buttons or icons should be present.
3. **Hierarchy Check**: Headline -> Subheadline -> Dateline -> Body -> Boilerplate.

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
