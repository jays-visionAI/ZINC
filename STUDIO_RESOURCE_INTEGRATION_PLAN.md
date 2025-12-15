# Studio Resource Integration & Visualization Plan (Updated)

This document outlines the implementation plan for integrating core data resources (Project Context, Brand Brain, Knowledge Base, Previous Outputs) into the Studio workflow and visualizing their usage via a dedicated Report Modal using D3.js.

## 1. Objective
To enhance the AI content generation quality by dynamically injecting relevant context and providing transparency through a "Resource Usage Report" UI.

## 2. Core Resources ( The 4 Pillars )
1.  **Project Context**: Basic project info (Name, Description, Target Audience).
2.  **Brand Brain**: Brand Persona, Tone of Voice, Key Values.
3.  **Knowledge Base**: User-uploaded documents (RAG-lite).
4.  **Previous Step Output**: Results from preceding agents (Context Chaining).

---

## 3. Backend Implementation (`functions/index.js`)

### 3.1 Data Fetching Logic
Modify `executeSubAgent` to fetch context data before calling the LLM.

-   **Parallel Fetching**: Use `Promise.all` to fetch Project metadata, Brand Brain settings, and Knowledge Hub documents simultaneously.
-   **Knowledge Retrieval**:
    -   Fetch documents tagged with the current project.
    -   (Phase 1) Load full text of active documents (limit by token count).

### 3.2 Prompt Engineering (Context Injection)
Construct a structured System Prompt that clearly separates these contexts.

```text
# SYSTEM CONTEXT
[Role Definition]

# PROJECT CONTEXT
Name: ...
Target Audience: ...

# BRAND PROFILE
Persona: ...
Tone: ...

# KNOWLEDGE BASE
(Relevant excerpts)

# WORKFLOW CONTEXT
(Previous agent outputs)
```

### 3.3 Response Metadata
Return detailed metadata regarding resource usage.

```javascript
return {
    success: true,
    result: "Generated content...",
    metadata: {
        model: "gpt-4-turbo",
        resources: {
            projectContext: { active: true },
            brandBrain: { active: true, persona: "Wit" },
            knowledgeBase: { usedDocs: ["Q3_Financials.pdf"] },
            previousSteps: { count: 2 }
        },
        weights: { // Simulated or calculated contribution weights (0-100)
            project: 20,
            brand: 30,
            knowledge: 40,
            history: 10
        }
    }
}
```

---

## 4. Frontend Visualization (`studio/studio.js`, `chatbot.css`)

### 4.1 "Review" Button Integration
-   **Trigger**: Upon agent execution completion (`setNodeState` to 'complete'), render a **"Review"** button (small icon or badge) on the Agent Node in the DAG canvas.
-   **Action**: Clicking the button opens the **Agent Report Modal**.

### 4.2 Report Visualization (Modal + D3.js)
-   **Reference**: Refer to `knowledgeHub.js` (lines ~5480) for D3.js implementation patterns.
-   **Visualization Logic (Inside Modal)**:
    -   **Library**: D3.js (Force Layout or Tree Layout).
    -   **Structure**:
        -   **Central Node**: The Generated Output (Agent Result).
        -   **Satellite Nodes**: The 4 Resources (Project, Brand, Knowledge, History).
    -   **Animation**:
        -   On modal open, Satellite Nodes appear and flow/converge towards the Central Node.
        -   Link thickness corresponds to the `metadata.weights` returned from the backend.
        -   Nodes pulse to indicate "Active" usage.
    -   **Interactivity**: Hovering over a satellite node shows specific details (e.g., "Used Document: Manual.pdf").

### 4.3 Report Modal UI
-   **Layout**:
    -   **Header**: Agent Name & Status (with Model used, e.g., "GPT-4o").
    -   **Body (Visual)**: D3.js Canvas showing the resource convergence.
    -   **Footer (Details)**: Accordion list showing exact text excerpts or references used.

---

## 5. Development Steps

### Step 1: Backend Data Integration
1.  Update `executeSubAgent` in `functions/index.js`.
2.  Implement helper functions to fetch Project, Brand, and Knowledge data.
3.  Inject data into `systemPrompt` and calculate/return `metadata`.

### Step 2: Frontend "Review" Action
1.  Update `studio/dag-executor.js` to store the returned `metadata`.
2.  Update `studio/studio.js` (or node renderer) to append a "Review" button to completed nodes.
3.  Create the `AgentReportModal` HTML structure.

### Step 3: D3.js Visualization
1.  Create `studio/report-visualizer.js`.
2.  Implement `renderResouceGraph(metadata)` function using D3.js.
3.  Replicate the style and physics simulation from Knowledge Hub's implementation.

## 6. Estimated Effort
-   Backend: 2-3 hours
-   Frontend (D3 Integration): 3-4 hours
-   **Total**: ~1 day
