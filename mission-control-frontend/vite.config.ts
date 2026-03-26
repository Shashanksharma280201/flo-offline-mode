import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import inject from "@rollup/plugin-inject";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
    build: {
        target: "esnext",
        sourcemap: false,
        minify: 'esbuild',
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
            maxParallelFileOps: 2,
            output: {
                manualChunks: (id) => {
                    if (id.includes('node_modules')) {
                        if (id.includes('three')) {
                            return 'vendor-three';
                        }
                        if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
                            return 'vendor-react';
                        }
                        if (id.includes('@radix-ui')) {
                            return 'vendor-ui';
                        }
                        if (id.includes('lottie')) {
                            return 'vendor-lottie';
                        }
                        return 'vendor-other';
                    }
                },
                inlineDynamicImports: false,
                compact: true
            }
        }
    },
    assetsInclude: ["**/*.gltf", "**/*.glb"],
    server: {
        port: 3000,
        watch: {
            ignored: ["**/aws/**", "**/node_modules/**", "**/dist/**"]
        },
        proxy: {
            "/api": {
                target: "http://localhost:5000",
                changeOrigin: true,
                secure: false
                // rewrite: (path) => path.replace(/^\/api/, "")
            },
            "/algorithm": {
                target: "http://localhost:8000",
                changeOrigin: true,
                secure: false
            },
            "/socket.io": {
                target: "ws://localhost:5000",
                ws: true
            },
            "/horus": {
                target: "http://localhost:9000",
                changeOrigin: true,
                secure: false
            },
            "/ntrip": {
                target: "ws://localhost:5000",
                ws: true
            }
        }
    },
    plugins: [
        react(),
        inject({
            adapter: "webrtc-adapter"
        })
    ],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src")
        }
    },
    optimizeDeps: {
        include: ["webrtc-adapter"]
    }
});
