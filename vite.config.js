import { defineConfig } from 'vite';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    // Build configuration
    build: {
        outDir: 'dist',
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                brandBrain: resolve(__dirname, 'brand-brain.html'),
                knowledgeHub: resolve(__dirname, 'knowledgeHub.html'),
                commandCenter: resolve(__dirname, 'command-center.html'),
                userSettings: resolve(__dirname, 'user-settings.html'),
                marketPulse: resolve(__dirname, 'marketPulse.html'),
                strategyWarRoom: resolve(__dirname, 'strategyWarRoom.html'),
                admin: resolve(__dirname, 'admin.html'),
                projectDetail: resolve(__dirname, 'project-detail.html'),
                theFilter: resolve(__dirname, 'theFilter.html'),
                theGrowth: resolve(__dirname, 'theGrowth.html'),
                // Studio
                studio: resolve(__dirname, 'studio/index.html'),
            }
        }
    },
    // Development server
    server: {
        port: 8080
    }
});
