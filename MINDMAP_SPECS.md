# ZYNK Brand Mind Map - Functional Specification
version: 2.1.0

## 1. Overview
The Brand Mind Map is an interactive, D3.js-powered visualization tool designed to edit and restructure brand strategy entities. It supports a hybrid layout system that starts with an organized tree structure but allows complete freedom of movement (Free Positioning).

## 2. Core Features

### 2.1 Visualization & Layout
- **Hybrid Free Layout**: 
  - **Initial Load**: Uses `d3.tree` to automatically organize nodes hierarchically.
  - **Interaction**: Once a node is moved, its position (x, y) is permanently saved in the data. Subsequent loads use these saved coordinates, ensuring the map looks exactly as you left it.
  - **Persistence**: Coordinates are saved to Firestore within the `mindMapData` object.
- **Node Styling**: 
  - **Root/Concept Nodes**: Rendered as pill shapes with dynamic width based on text length.
  - **Leaf Nodes**: Rendered as simple circles to reduce visual clutter.
  - **Dynamic Coloring**: Nodes are colored based on their hierarchy branch (Hash-based coloring).

### 2.2 Interaction Controls
- **Navigation**:
  - **Zoom & Pan**: Use scroll wheel or trackpad to zoom/pan the canvas.
  - **Zoom Controls**: Dedicated (+), (-), and [Fit View] buttons on the bottom left.
- **Selection**:
  - **Single Click**: Selects a generic node. Shows the Floating Toolbar and Node Inspector.
  - **Shift + Click**: Selects multiple nodes. Used for batch operations (Move, Delete, Copy).
  - **Click Background**: Deselects all nodes.
- **Drag & Drop**:
  - **Move**: Dragging a node moves it (and any selected peers) to a new position.
  - **Reparenting**: Dragging a single node and dropping it onto another node attaches it as a child of that node.

### 2.3 Editing & Manipulation
- **Floating Toolbar**: Appears above the selected node(s).
  - **Add Child (+)**: Adds a new sub-node. (Disabled during multi-selection).
  - **Copy**: Copies the selected branch(es) to the clipboard.
  - **Paste**: Pastes the clipboard content as children of the selected node.
  - **Delete**: Removes the selected node(s) and their descendants.
- **Node Inspector (Right Panel)**:
  - **Node Name**: Edit the title of the entity.
  - **Type Badge**: Displays the node type (e.g., CONCEPT, VALUE).
  - **Description**: Edit the description text.
  - **Memo/Notes**: Personal notes field.
  - **Source Reference**: If the node was generated from a source document, a snippet and link are displayed here.

### 2.4 Data Management
- **Manual Save**: Changes are not auto-saved to prevent accidental overwrites. The "Save Changes" button in the header commits the current state to the database.
- **Version History**: Saving creates a new version or updates the existing draft based on context (Upsert logic).
- **Project Sidebar**: Lists all mind maps within the current project, showing the last modified time and version badges.

## 3. Keyboard Shortcuts
- **Shift + Click**: Toggle selection of multiple nodes.
- **Shift + Drag**: Move all selected nodes together.

## 4. Current Status & Notes
- **Double-Click**: Disabled on nodes to prevent conflict with Zoom operations.
- **Layout Stability**: Stable IDs are generated for all nodes to ensure the view doesn't "jump" or reset unexpectedly.
