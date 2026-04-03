import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    // If running in prod mode, point to Docker. Otherwise default to local backend.
    const target = mode === 'prod' ? 'http://localhost:3001' : 'http://localhost:3002';

    return {
        plugins: [react()],
        server: {
            proxy: {
                '/api': {
                    target: target,
                    changeOrigin: true,
                },
            },
        },
    };
})
