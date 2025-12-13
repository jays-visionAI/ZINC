# Knowledge Hub 2.0: Category-Specific UX Specification

## 1. Overview
The goal is to transition from a generic "Markdown Renderer" to specialized UI experiences for each of the four content plan categories. This improves usability, visual appeal, and functional value.

---

## 2. Category Breakdown & UX Strategy

### A. Strategic Plans (The "War Room" Dashboard)
*   **Target Plans**: Campaign Brief, Content Calendar, Channel Strategy.
*   **Core Need**: Structure, Phases, and Timeline visibility.
*   **Current State**: Long scrolling text.
*   **New UX Concept**: **"Tabbed Strategy Board"**
    *   **Layout**: A layout with top-level tabs for different sections (e.g., "Objective", "Timeline", "Channels", "Budget").
    *   **Visuals**:
        *   **Timeline View**: A horizontal Gantt-style charts for `Content Calendar`.
        *   **KPI Cards**: Big number cards for goals/metrics.
    *   **Interactions**:
        *   Click milestones to expand details.
        *   Export Strategy as PDF.

### B. Quick Actions (The "Social Feed" Preview)
*   **Target Plans**: Social Post Ideas, Trend Response, Email Draft.
*   **Core Need**: Rapid consumption, Copy-paste, Platform context.
*   **Current State**: Bulleted list of posts.
*   **New UX Concept**: **"Platform Simulation Cards"**
    *   **Layout**: A grid or feed layout mimicking the target platform (e.g., a Tweet container, an Instagram mock container).
    *   **Visuals**:
        *   Profile pic placeholder, Handle, Time stamp logic.
        *   Hashtags highlighted in blue.
    *   **Interactions**:
        *   **One-Click Copy**: Specific button to copy just the caption.
        *   **Image Placeholder**: A generic image placeholder that can be swapped with generated images later.
        *   **"Remix" Button**: Regenerate just this single post variant.

### C. Knowledge (The "Insight Graph")
*   **Target Plans**: Brand Mind Map, Audience Persona, Competitor Analysis.
*   **Core Need**: Relationships, Profiles, Comparison.
*   **Current State**: Headers and paragraphs.
*   **New UX Concept**: **"Visual Data Cards"**
    *   **Audience Persona**:
        *   **Layout**: A "ID Card" or "Profile" styling. Photo placeholder on left, demographics tags, "Frustrations vs Goals" progress bars.
    *   **Competitor Analysis**:
        *   **Layout**: Comparison Table (Side-by-side columns) rather than sequential text.
    *   **Brand Mind Map**:
        *   **Layout**: Interactive Node Graph (using simplified CSS tree or D3.js) or labeled clusters.

### D. Create Now (The "Studio Editor")
*   **Target Plans**: Product Brochure, Promo Images, One-Pager.
*   **Core Need**: Layout, Design, Final Output simulation.
*   **Current State**: Text description of a brochure.
*   **New UX Concept**: **"Live Document Preview"**
    *   **Layout**: A centered "Canvas" area (A4 ratio or Slide ratio) with a dark gray background.
    *   **Visuals**:
        *   **Brochure**: 2-column layout, large formatted Headings, image blocks.
        *   **One-Pager**: Executive summary style with iconography.
    *   **Interactions**:
        *   **Inline Editing**: Click text to edit directly on the canvas.
        *   **Print/Save**: Strict CSS for printing to PDF perfectly.

---

## 3. Technical Implementation Plan

### Step 1: LLM Output Structuring (Backend)
To support these UIs, the LLM cannot just return Markdown. It must return **Structured JSON**.
*   *Action*: Update `generatePlan` prompts to request JSON schema based on the category.
    *   `Strategic` -> JSON with sections array, timeline events array.
    *   `Quick` -> JSON array of `{ platform, content, hashtags }`.
    *   `Knowledge` -> JSON objects for Personas/Comparisons.

### Step 2: Dynamic Renderer (Frontend)
Create a `PlanRenderer` factory function in `knowledgeHub.js`.
```javascript
function renderPlanContent(planType, jsonData) {
    switch(getCategory(planType)) {
        case 'strategic': return renderStrategyDashboard(jsonData);
        case 'quick': return renderSocialFeed(jsonData);
        case 'knowledge': return renderKnowledgeVisuals(jsonData);
        case 'create': return renderDocumentCanvas(jsonData);
        default: return renderMarkdown(jsonData); // Fallback
    }
}
```

### Step 3: Component Development
*   **`renderStrategyDashboard()`**: HTML/CSS Grid based layout.
*   **`renderSocialFeed()`**: Styled components using Tailwind for X/IG/LinkedIn styles.
*   **`renderKnowledgeVisuals()`**: Flexbox cards for Personas, CSS Grid for Tables.
*   **`renderDocumentCanvas()`**: A fixed-width container with print-media styles.

---

## 4. Recommended Priority
1.  **Quick Actions (Social Feed)**: Highest impact visual change. Easy to implement JSON structure.
2.  **Knowledge (Personas/Analysis)**: Strong visual upgrade from text.
3.  **Strategic**: Complex but valuable for high-tier users.
4.  **Create Now**: Requires robust CSS print styling.
