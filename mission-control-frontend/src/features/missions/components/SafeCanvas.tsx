import { Component, ReactNode } from "react";
import { Canvas } from "@react-three/fiber";

interface SafeCanvasProps {
    children: ReactNode;
    fallback?: ReactNode;
    [key: string]: any;
}

interface SafeCanvasState {
    hasError: boolean;
    errorMessage?: string;
}

/**
 * Error boundary for Three.js Canvas
 * Catches WebGL errors and falls back gracefully
 * Allows Google Maps to still function without 3D overlay
 */
class SafeCanvas extends Component<SafeCanvasProps, SafeCanvasState> {
    constructor(props: SafeCanvasProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error) {
        return {
            hasError: true,
            errorMessage: error.message
        };
    }

    componentDidCatch(error: Error, errorInfo: any) {
        console.warn("Three.js Canvas error (non-critical):", error);
        console.warn("Google Maps will still work without 3D overlay");
    }

    render() {
        if (this.state.hasError) {
            // Return fallback or nothing (Google Maps will still work)
            return this.props.fallback || null;
        }

        try {
            const { children, fallback, ...canvasProps } = this.props;
            return <Canvas {...canvasProps}>{children}</Canvas>;
        } catch (error) {
            console.warn("Canvas initialization error:", error);
            return this.props.fallback || null;
        }
    }
}

export default SafeCanvas;
