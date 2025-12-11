# Implementation Plan: The Filter (Quality Verification) Integration

## Goal
Transition **"The Filter"** from a static mock-up to a fully functional module integrated with Firestore. This module serves as the quality control gate (Step 4) before content finds its way to "The Growth" (Step 5).

## Status
- **UI**: Implementation complete (`theFilter.html`, `theFilter.js` with mock data).
- **Draft Spec**: `THE_FILTER_DRAFT.md` (v1.0).
- **Backend**: Not connected.

---

## 1. Architecture & Data Flow

### Workflow
1.  **Content Import**: Load "Draft" content from `project/{id}/generated_content` (output from Studio).
2.  **Analysis**: On load, run "AI Analysis" (simulated or real) to generate:
    -   Quality Score
    -   Red Pen Suggestions
3.  **Review**: User accepts/rejects suggestions.
4.  **Approval**: User clicks "Approve & Publish" -> Update status -> Trigger "The Growth" data recording.

### Firestore Schema (New)
**Collection**: `projects/{projectId}/content_filter/{contentId}`

```typescript
interface FilterItem {
  contentId: string;
  projectId: string;
  source: 'studio' | 'manual';
  platform: 'instagram' | 'twitter' | 'linkedin';
  status: 'draft' | 'reviewed' | 'approved' | 'rejected' | 'published';
  
  // Content Data
  content: {
    caption: string;
    hashtags: string[];
    mediaUrls: string[];
  };

  // AI Evaluation (The Scorecard)
  evaluation: {
    totalScore: number;
    breakdown: {
      brandVoice: { score: number; status: 'pass'|'warning'; detail: string };
      grammar: { score: number; status: 'pass'|'warning'; detail: string };
      seo: { score: number; status: 'pass'|'warning'; detail: string };
      compliance: { score: number; status: 'pass'|'warning'; detail: string };
    };
  };

  // AI Suggestions (The Red Pen)
  suggestions: Array<{
    id: string;
    type: 'SEO' | 'Engagement' | 'Grammar';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    currentValue: string;
    suggestedValue: string;
    isApplied: boolean;
  }>;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## 2. Implementation Steps

### Phase 1: Service Layer Setup
-   [ ] Create `services/filter-service.js`.
-   [ ] Implement `FilterService.getContent(id)`: Fetch from Firestore or create/import from Studio if new.
-   [ ] Implement `FilterService.saveContent(id, data)`: Save Draft/Status.

### Phase 2: Logic Integration (`theFilter.js`)
-   [ ] **Remove Mock Data**: Delete `SCORE_BREAKDOWN` and `SUGGESTIONS` constants.
-   [ ] **Load Logic**: Fetch data via `FilterService` on init.
-   [ ] **Save Logic**: "Save Draft" button writes to Firestore.
-   [ ] **Suggestion Logic**: "Apply" button updates local state AND saves to Firestore.

### Phase 3: AI Engine Stub
-   [ ] Create `utils-ai-filter.js`.
-   [ ] Implement `analyzeContent(text, platform)`:
    -   For now, return **deterministic mock results** or simple heuristic-based results (e.g., check for hashtags, length) to simulate a "Real" analysis process.
    -   Examples:
        -   If `#tag` count < 3 -> Suggest "Add hashtags".
        -   If text length < 20 -> Suggest "Too short".
        -   Check "Dos/Donts" from Brand Brain (if connected).

### Phase 4: Approval Workflow
-   [ ] "Approve & Publish" button:
    -   Update status to `approved`.
    -   (Future) Trigger actual publishing API.
    -   (Future) Create entry in "The Growth".

---

## 3. User Review Required
-   [ ] Is the "Simulated AI" approach acceptable for this phase? (Real LLM integration is a larger task).
-   [ ] Should we "Draft" new content manually for testing, or assume Studio integration is ready? (Proposal: Add a "Demo Mode" to inject a sample draft).

---

## 4. Verification Plan
-   [ ] **Manual Import**: Open page with `?id=demo` -> verify it loads "Imported" content.
-   [ ] **Analysis**: Verify "Score" changes based on content text (using heuristics).
-   [ ] **Persistence**: Reload page -> verify suggestions remain applied/dismissed.
