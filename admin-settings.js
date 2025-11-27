// admin-settings.js

window.initSettings = function (currentUser) {
    console.log("⚙️ Initializing Settings Page...");

    const openaiInput = document.getElementById('openai-api-key');
    const anthropicInput = document.getElementById('anthropic-api-key');
    const saveBtn = document.getElementById('save-settings-btn');

    const toggleOpenaiBtn = document.getElementById('toggle-openai-key');
    const toggleAnthropicBtn = document.getElementById('toggle-anthropic-key');

    // 1. Load existing keys
    const savedOpenaiKey = localStorage.getItem('openai_api_key');
    const savedAnthropicKey = localStorage.getItem('anthropic_api_key');

    if (savedOpenaiKey) openaiInput.value = savedOpenaiKey;
    if (savedAnthropicKey) anthropicInput.value = savedAnthropicKey;

    // 2. Save Handler
    saveBtn.addEventListener('click', () => {
        const newOpenaiKey = openaiInput.value.trim();
        const newAnthropicKey = anthropicInput.value.trim();

        if (newOpenaiKey) {
            localStorage.setItem('openai_api_key', newOpenaiKey);
        } else {
            localStorage.removeItem('openai_api_key');
        }

        if (newAnthropicKey) {
            localStorage.setItem('anthropic_api_key', newAnthropicKey);
        } else {
            localStorage.removeItem('anthropic_api_key');
        }

        alert('✅ Settings saved successfully!');
        console.log("Keys updated in localStorage");
    });

    // 3. Toggle Visibility Handlers
    toggleOpenaiBtn.addEventListener('click', () => {
        const type = openaiInput.getAttribute('type') === 'password' ? 'text' : 'password';
        openaiInput.setAttribute('type', type);
    });

    toggleAnthropicBtn.addEventListener('click', () => {
        const type = anthropicInput.getAttribute('type') === 'password' ? 'text' : 'password';
        anthropicInput.setAttribute('type', type);
    });

    // 4. Update Prompts Handler
    const updatePromptsBtn = document.getElementById('update-prompts-btn');
    if (updatePromptsBtn) {
        updatePromptsBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to update the system prompts for Planner, Creator, and Manager?')) {
                const script = document.createElement('script');
                script.src = 'scripts/update-subagent-prompts.js?v=' + Date.now();
                document.body.appendChild(script);
            }
        });
    }
};
