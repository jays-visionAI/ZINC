---
description: Verify Studio v2 Right Panel Implementation
---
1. Open the Studio page (`studio/index.html`).
2. Verify that the **Center Panel** now shows the Chat Interface (Input + Stream).
   - Type a message and hit send. It should appear in the stream.
   - Verify the "Mode Switcher" buttons (Agent Engine / Social Media) log to the console/stream.
3. Verify the **Right Panel** now shows the new Editor Layout.
   - Check for the Toolbar (Preview, Code, Edit icons).
   - Check for the Channel Tabs (Twitter, Instagram, etc.).
   - Click the "Code View" button (</>) and verify the preview area toggles to a code block.
   - Click the "Edit" button and verify it logs a warning/action.
4. Test **Regeneration**:
   - Type "Make it more professional" in the main chat input.
   - Click the "Regenerate" button (floating action or existing UI).
   - Verify the input is captured as feedback.
