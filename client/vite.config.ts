import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
    ],
    resolve: {
        alias: {
            "@": "/src",
        },
    },
    server: {
        host: '0.0.0.0', // Listen on all network interfaces
        port: 5173,
        strictPort: true
    }
});