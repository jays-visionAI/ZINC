# Brand Mind Map V2.0 - Refactoring & Implementation Plan

## 1. Overview
The current Mind Map implementation suffers from interaction bugs (events not firing, data not updating) and architectural complexity. This plan outlines a clean, robust refactoring strategy to ensure all CRUD, Drag-and-Drop, and Inspector features function perfectly.

## 2. Core Architecture
- **State Management**: 
  - `rootData`: The pure JSON object representing the tree. **Single Source of Truth**.
  - No manipulation of D3 node objects (`d.parent`, `d.children`) directly for logic. Always manipulate `rootData`.
- **Rendering Strategy**:
  - **Re-render on Change**: On any data mutation (add/delete/move), clear the SVG group and re-draw the entire tree.
  - *Rationale*: D3's enter/update/exit pattern is optimization-heavy but error-prone for structural changes. Given the typical size of a mind map (< 1000 nodes), full re-rendering is instant and eliminates sync bugs.
- **Event Handling**:
  - Remove all inline `onclick="..."` from HTML. Use `document.getElementById(...).addEventListener` in JS.
  - This solves "function not defined" errors caused by ES6 module scoping.

## 3. Detailed Feature Requirements

### 3.1. Visualization
- **Layout**: D3 Tree (Tidy Tree) - left-to-right.
- **Node Shapes**:
  - **Category (Parent)**: Rounded Rectangle (Capsule) with white text inside.
  - **Leaf**: Circle with text outside (right-aligned).
- **Connections**: Curved Bezier links.

### 3.2. User Interaction (Mouse & Toolbar)
- **Selection**:
  - Click node -> Set `selectedNode`.
  - Update Visuals: Add dashed Cyan/White stroke to selected node.
  - **Show Floating Toolbar** immediately above the node.
  - **Open Inspector** in the right panel.
- **Floating Toolbar Actions**:
  - **(+) Add Child**: Adds a new child node to the selected node's data -> Re-render.
  - **(Copy) Copy Branch**: Deep clones the selected node's data to a global clipboard.
  - **(Paste) Paste Branch**: Adds clipboard data as a child of selected node -> Re-render.
  - **(Trash) Delete**: Removes selected node from its parent's children array -> Re-render.

### 3.3. Drag & Drop (Structure Editing)
- **Logic**: Reparenting.
- **Behavior**:
  - Drag a node.
  - If dropped onto another node (distance < threshold):
    - Remove dragged node data from old parent.
    - Add dragged node data to new parent.
    - Re-render.
  - If dropped in empty space:
    - Snap back to original position (Tree Layout enforces data-driven position).

### 3.4. Inspector (Right Panel)
- **Fields**:
  - **Name**: Text input (Updates `d.name`).
  - **Description**: Textarea.
  - **Memo**: Textarea (Personal notes).
- **Source Card**: Display if `sourceReference` exists.

## 4. Implementation Steps (Plan)

1.  **Clean HTML**: Remove logic-dependent attributes from `brand-mindmap.html`.
2.  **Refactor JS (`brand-mindmap.js`)**:
    - **Init**: Setup SVG, Zoom, Event Listeners.
    - **Data Logic**: Create pure functions `addNode(parentId, data)`, `deleteNode(id)`, `moveNode(id, newParentId)`.
    - **Render Function**: `renderTree(data)` -> Clears canvas, computes layout, draws nodes/links.
    - **Interaction**: Bind click/drag events to D3 elements.

## 5. Verification Checklist
- [ ] Clicking a node shows the Inspector with correct data.
- [ ] Clicking (+) adds a child instantly.
- [ ] Clicking (Trash) deletes the node.
- [ ] Dragging Node A onto Node B makes A a child of B.
- [ ] Copy/Paste works between different branches.
- [ ] Saving updates Firestore correctly.
