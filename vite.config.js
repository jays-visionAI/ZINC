import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    // Build configuration
    build: {
        outDir: 'dist',
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                brandBrain: resolve(__dirname, 'brand-brain.html'),
                knowledgeHub: resolve(__dirname, 'knowledgeHub.html'),
                commandCenter: resolve(__dirname, 'command-center.html'),
                missionControl: resolve(__dirname, 'mission-control.html'),
                userSettings: resolve(__dirname, 'user-settings.html'),
                // Add other HTML pages as needed
            }
        }
    },
    // Development server
    server: {
        port: 8080
    },
    // Define environment variables to be replaced
    define: {
        // Expose VITE_ prefixed env vars to client
    }
});
