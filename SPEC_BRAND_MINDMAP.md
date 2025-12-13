# TECHNICAL SPECIFICATION: Brand Mind Map v2.0

## 1. Overview
This document defines the functional and design requirements for the **Brand Mind Map** feature within the Knowledge Hub. The goal is to build an interactive, editable visualization tool that allows users to explore and structure brand concepts.

---

## 2. Visual Design & Layout
Unlike generic force-directed graphs, this implementation shall follow a **Classic Mind Map** aesthetic to improve readability and structural understanding.

### 2.1. Visualization Style
*   **Structure**: **Hierarchical Tree Layout**.
    *   **Center Node**: The core Brand Name (Root).
    *   **branches**: Major categories (Level 1) extending outward.
    *   **leaves**: Specific keywords/concepts (Level 2+) branching from categories.
*   **Node Appearance**:
    *   **Root Node**: Large, distinct, circular or pill-shaped container.
    *   **Child Nodes**: Text labels with underline or minimal capsule background. Color-coded by branch.
*   **Link Style**: **Smooth Bezier Curves** (organic feel) connecting parent to child.
*   **Animation**: Smooth transitions when expanding/collapsing branches.

### 2.2. Interactive Canvas (Left Panel)
*   **Background**: Dark theme canvas (infinite space concept).
*   **Controls Toolbar** (Top-Left overlay):
    *   `(+)` Zoom In
    *   `(-)` Zoom Out
    *   `[ ]` Fit to Screen (Reset View)
*   **Interactions**:
    *   **Pan**: Click & drag background to move the canvas.
    *   **Zoom**: Mouse wheel or Toolbar buttons.
    *   **Drag Node**: Click & drag specific nodes to rearrange layout manually.
    *   **Expand/Collapse**: Clicking a node toggles visibility of its children (sub-entities).
    *   **Select**: Clicking a node highlights it and opens the "Node Inspector".

### 2.3. Node Inspector (Right Panel)
A fixed sidebar panel appearing on the right side of the visualization.
*   **Header**: Node Name & Type (e.g., "Sustainability" [Value]).
*   **Attributes**: Editable fields for description or tags.
*   **Source Reference Section**:
    *   **Source Title**: The document name where this concept was found (e.g., "Brand_Guidelines_2024.pdf").
    *   **Snippet**: A preview text (approx. 200 characters) showing the context.
    *   **Link**: A "Go to Source" button that opens the original document viewer.

---

## 3. Functional Requirements

### 3.1. Content Generation & User Input
*   **Creation Modal**: When generating the map, the user can input specific instructions or additional entities.
    *   *Requirement*: The LLM prompt must include these user inputs to ensure the initial map reflects user intent.
*   **Data Structure**: The backend must return a JSON object containing:
    *   `nodes`: { id, name, type, description, *sourceDocumentId*, *sourceSnippet* }
    *   `children`: Recursive array for tree structure.

### 3.2. Editing Capabilities
*   **Add Node**: Context menu (Right-click) on a node to "Add Child Node".
*   **Delete Node**: Context menu or Inspector button to remove a node.
*   **Modify Info**: Users can edit the Name, Description, and Source in the Inspector panel.

### 3.3. State Management (Save Logic)
*   **No Auto-Save**: Changes to the map (move, edit, add) are kept in the local session state.
*   **Manual Save**: A explicit **"Save Changes"** button (located in the header or inspector) commits the updated JSON structure to Firestore.
*   **Revision History**: (Optional Phase 2) Keep track of saved versions.

---

## 4. Technical Strategy
*   **Library**: **D3.js (v7)** via CDN.
    *   Reason: Best-in-class support for Tree Layouts (`d3.tree` or `d3.cluster`), curved paths (`d3.linkHorizontal`), and zoom behavior (`d3.zoom`).
*   **Data Flow**:
    1.  User requests generation -> Cloud Function (LLM) returns JSON Tree.
    2.  Frontend renders Tree using D3.js.
    3.  User interacts/edits (modifies local D3 data object).
    4.  User clicks Save -> Frontend sends updated JSON to Firestore.

---

## 5. Development Tasks
1.  **Backend (LLM)**: Update `generatePlan` prompt for 'brand_mind_map' to return strict JSON with `sourceSnippet` (200 chars).
2.  **Frontend (D3)**: Implement `MindMapRenderer` class.
    *   Implement Tree Layout & Curved Links.
    *   Implement Zoom/Drag/Click behaviors.
3.  **UI Components**:
    *   Build "Node Inspector" panel.
    *   Build Toolbar (Zoom controls).
4.  **Integration**: Connect "Go to Source" button to `viewDocument` function.
