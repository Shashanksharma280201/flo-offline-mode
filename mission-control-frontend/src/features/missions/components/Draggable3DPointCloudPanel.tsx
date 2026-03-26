import { memo, useRef, useState, useEffect, Suspense } from "react";
import Draggable from "react-draggable";
import { MdClose, MdDragIndicator, MdFullscreen, MdFullscreenExit } from "react-icons/md";
import { Canvas, useLoader } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { PCDLoader } from "three-stdlib";
import * as THREE from "three";
import { Points, Color } from "three";
import { useMissionsStore } from "../../../stores/missionsStore";
import { getAllPresignedUrls, getLidarMapByName } from "../services/lidarMapsService";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";

type Draggable3DPointCloudPanelProps = {
    onClose: () => void;
};

// Component to load and render PCD point cloud
const PointCloudRenderer = ({
    pcdUrl,
    pointSize,
    colorMode
}: {
    pcdUrl: string;
    pointSize: number;
    colorMode: 'green' | 'red' | 'blue' | 'white' | 'rainbow';
}) => {
    try {
        const points = useLoader(PCDLoader, pcdUrl) as Points;

        if (!points || !points.geometry) {
            console.warn('PCD loaded but no geometry found');
            return null;
        }

        const geometry = points.geometry;
        const positionAttribute = geometry.attributes.position;
        const pointCount = positionAttribute.count;

        // Find min and max for all axes to calculate bounding box
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;

        for (let i = 0; i < pointCount; i++) {
            const x = positionAttribute.getX(i);
            const y = positionAttribute.getY(i);
            const z = positionAttribute.getZ(i);

            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
            if (z < minZ) minZ = z;
            if (z > maxZ) maxZ = z;
        }

        // Calculate center and size of point cloud
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const centerZ = (minZ + maxZ) / 2;
        const sizeX = maxX - minX;
        const sizeY = maxY - minY;
        const sizeZ = maxZ - minZ;
        const maxSize = Math.max(sizeX, sizeY, sizeZ);

        console.log(`Point cloud bounds: X[${minX.toFixed(2)}, ${maxX.toFixed(2)}], Y[${minY.toFixed(2)}, ${maxY.toFixed(2)}], Z[${minZ.toFixed(2)}, ${maxZ.toFixed(2)}]`);
        console.log(`Center: (${centerX.toFixed(2)}, ${centerY.toFixed(2)}, ${centerZ.toFixed(2)}), Max size: ${maxSize.toFixed(2)}`);

        // Create color array based on selected color mode
        const colors = new Float32Array(pointCount * 3);

        // Define color options
        const colorMap = {
            green: new Color(0x00ff00),
            red: new Color(0xff0000),
            blue: new Color(0x0099ff),
            white: new Color(0xffffff),
            rainbow: null // Special case: height-based gradient
        };

        if (colorMode === 'rainbow') {
            // Rainbow gradient based on height (Y-axis after rotation, which is original Z)
            for (let i = 0; i < pointCount; i++) {
                const z = positionAttribute.getZ(i);
                const t = (z - minZ) / (maxZ - minZ); // Normalize 0-1

                // Create rainbow: Red -> Yellow -> Green -> Cyan -> Blue -> Magenta
                const hue = t * 0.8; // 0.8 = full rainbow spectrum (avoid wrapping to red)
                const color = new Color().setHSL(hue, 1.0, 0.5);

                colors[i * 3] = color.r;
                colors[i * 3 + 1] = color.g;
                colors[i * 3 + 2] = color.b;
            }
        } else {
            // Solid color
            const solidColor = colorMap[colorMode];
            for (let i = 0; i < pointCount; i++) {
                colors[i * 3] = solidColor.r;
                colors[i * 3 + 1] = solidColor.g;
                colors[i * 3 + 2] = solidColor.b;
            }
        }

        // Add color attribute to geometry
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        // Apply point size from user control
        if (points.material) {
            // @ts-ignore - PointsMaterial has size property
            points.material.size = pointSize;
            // @ts-ignore
            points.material.sizeAttenuation = false; // Keep points same size regardless of distance
            // @ts-ignore
            points.material.vertexColors = true; // Use our colors
            // @ts-ignore
            points.material.opacity = 1.0;
            // @ts-ignore
            points.material.transparent = false;
        }

        // Calculate optimal camera distance based on point cloud size
        const cameraDist = maxSize * 2; // 2x the max dimension

        console.log(`Point cloud loaded with ${pointCount} points`);
        console.log(`Bounds BEFORE rotation: X[${minX.toFixed(2)}, ${maxX.toFixed(2)}], Y[${minY.toFixed(2)}, ${maxY.toFixed(2)}], Z[${minZ.toFixed(2)}, ${maxZ.toFixed(2)}]`);
        console.log(`Center BEFORE rotation: (${centerX.toFixed(2)}, ${centerY.toFixed(2)}, ${centerZ.toFixed(2)})`);
        console.log(`Max dimension: ${maxSize.toFixed(2)}, Suggested camera distance: ${cameraDist.toFixed(2)}`);

        // After 90° rotation around X-axis:
        // - Original Y → New Z (depth/back-forward)
        // - Original Z → New Y (height/up-down)
        // - Original X → stays X (left-right)

        // To keep the point cloud above the grid (Y >= 0 after rotation):
        // We need to offset by -minZ in the Y direction (which was the original Z minimum)
        // This ensures the lowest point sits at Y=0 (on the grid)

        const offsetY = -minZ; // Shift up so minimum original Z becomes Y=0

        console.log(`Vertical offset to place on grid: ${offsetY.toFixed(2)}`);

        // Center the point cloud at origin and rotate around X-axis (red axis)
        // -90 degrees = -Math.PI / 2 (rotates counterclockwise to flip right-side up)
        return (
            <group>
                <primitive
                    object={points}
                    position={[-centerX, offsetY, -centerY]} // Note: Z offset becomes Y position after rotation
                    rotation={[-Math.PI / 2, 0, 0]} // -90 degrees around X-axis (flips map right-side up)
                    scale={[1, 1, 1]}
                />
            </group>
        );
    } catch (error) {
        console.error('Error loading PCD:', error);
        return null;
    }
};

const Draggable3DPointCloudPanel = memo(({ onClose }: Draggable3DPointCloudPanelProps) => {
    const panelRef = useRef(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [panelSize, setPanelSize] = useState(() => ({
        width: Math.min(800, window.innerWidth * 0.9),
        height: Math.min(600, window.innerHeight * 0.7)
    }));
    const [pcdUrl, setPcdUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Point cloud visualization controls
    const [pointSize, setPointSize] = useState(1.0);
    const [colorMode, setColorMode] = useState<'green' | 'red' | 'blue' | 'white' | 'rainbow'>('green');
    const [showControls, setShowControls] = useState(false);

    const selectedLidarMap = useMissionsStore((state) => state.selectedLidarMap);

    // Fetch PCD URL when component mounts
    useEffect(() => {
        const fetchPcdUrl = async () => {
            if (!selectedLidarMap) {
                setError("No LIDAR map selected");
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                // First, get the map ID from the map name
                const mapResponse = await getLidarMapByName(selectedLidarMap);
                if (!mapResponse.success || !mapResponse.data) {
                    setError('LIDAR map not found');
                    setIsLoading(false);
                    return;
                }

                const mapId = mapResponse.data.id;

                // Now fetch pre-signed URLs using the map ID
                const urlsResponse = await getAllPresignedUrls(mapId);
                if (urlsResponse.data?.urls?.map3d) {
                    setPcdUrl(urlsResponse.data.urls.map3d);
                    console.log('Loaded PCD URL for 3D view:', selectedLidarMap);
                } else {
                    setError('No 3D map file available for this LIDAR map');
                }
            } catch (err) {
                console.error('Failed to fetch PCD URL:', err);
                setError('Failed to load 3D map');
            } finally {
                setIsLoading(false);
            }
        };

        fetchPcdUrl();
    }, [selectedLidarMap]);

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
        if (!isFullscreen) {
            setPanelSize({ width: window.innerWidth * 0.95, height: window.innerHeight * 0.9 });
        } else {
            setPanelSize({ width: 800, height: 600 });
        }
    };

    const handleResize = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = panelSize.width;
        const startHeight = panelSize.height;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const newWidth = startWidth + (moveEvent.clientX - startX);
            const newHeight = startHeight + (moveEvent.clientY - startY);

            setPanelSize({
                width: Math.max(400, Math.min(newWidth, window.innerWidth * 0.95)),
                height: Math.max(300, Math.min(newHeight, window.innerHeight * 0.9))
            });
        };

        const handleMouseUp = () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
    };

    return (
        <Draggable
            nodeRef={panelRef}
            handle=".pcdHandle"
            bounds="parent"
            disabled={isFullscreen}
        >
            <div
                ref={panelRef}
                className={`pointer-events-auto absolute z-40 overflow-hidden rounded-2xl border border-white/10 bg-gray-900/90 backdrop-blur-xl shadow-2xl shadow-black/50 ${
                    isFullscreen ? "left-[2%] top-[2%] sm:left-[2.5%] sm:top-[2.5%]" : "left-[10%] top-[10%] sm:left-[15%] sm:top-[15%]"
                }`}
                style={{
                    width: `${panelSize.width}px`,
                    height: `${panelSize.height}px`
                }}
            >
                {/* Header with drag handle */}
                <div className="pcdHandle border-b border-white/10 bg-gray-900/90 backdrop-blur-sm">
                    <div className="flex cursor-move items-center justify-between px-3 py-2 sm:px-4 sm:py-3">
                        <div className="flex items-center gap-2">
                            <MdDragIndicator className="h-4 w-4 text-white/60 sm:h-5 sm:w-5" />
                            <span className="text-xs font-medium text-white sm:text-sm">3D Point Cloud</span>
                            {pcdUrl && !error && (
                                <span className="text-[10px] text-green-400 sm:text-xs">● Loaded</span>
                            )}
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2">
                            {pcdUrl && !error && (
                                <button
                                    onClick={() => setShowControls(!showControls)}
                                    className={`rounded-lg p-1 transition-all sm:p-1.5 ${
                                        showControls
                                            ? 'bg-blue-600 text-white'
                                            : 'text-white/60 hover:bg-white/10 hover:text-white'
                                    }`}
                                    title="Display Controls"
                                >
                                    <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                    </svg>
                                </button>
                            )}
                            <button
                                onClick={toggleFullscreen}
                                className="rounded-lg p-1 text-white/60 transition-all hover:bg-white/10 hover:text-white sm:p-1.5"
                                title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                            >
                                {isFullscreen ? (
                                    <MdFullscreenExit className="h-4 w-4 sm:h-5 sm:w-5" />
                                ) : (
                                    <MdFullscreen className="h-4 w-4 sm:h-5 sm:w-5" />
                                )}
                            </button>
                            <button
                                onClick={onClose}
                                className="rounded-lg p-1 text-white/60 transition-all hover:bg-white/10 hover:text-white sm:p-1.5"
                                title="Close"
                            >
                                <MdClose className="h-4 w-4 sm:h-5 sm:w-5" />
                            </button>
                        </div>
                    </div>

                    {/* Controls Panel - Shadcn-Inspired Design */}
                    {showControls && pcdUrl && !error && (
                        <div className="border-t border-white/10 bg-zinc-900/50 px-5 py-4 sm:px-6 sm:py-5">
                            <div className="flex flex-col gap-6 sm:flex-row sm:gap-8">
                                {/* Point Size Control - Shadcn Slider Style */}
                                <div className="flex-1 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-zinc-200">Point Size</label>
                                        <span className="rounded-md bg-zinc-800 px-2 py-1 text-xs font-mono font-semibold text-zinc-100">
                                            {pointSize.toFixed(1)}
                                        </span>
                                    </div>
                                    <div className="relative pt-1">
                                        <style dangerouslySetInnerHTML={{
                                            __html: `
                                                .slider-shadcn {
                                                    height: 20px;
                                                }
                                                .slider-shadcn::-webkit-slider-track {
                                                    width: 100%;
                                                    height: 8px;
                                                    background: linear-gradient(to right,
                                                        hsl(217, 91%, 60%) 0%,
                                                        hsl(217, 91%, 60%) ${((pointSize - 0.1) / 2.9) * 100}%,
                                                        hsl(240, 5%, 26%) ${((pointSize - 0.1) / 2.9) * 100}%,
                                                        hsl(240, 5%, 26%) 100%);
                                                    border-radius: 9999px;
                                                    border: none;
                                                }
                                                .slider-shadcn::-moz-range-track {
                                                    width: 100%;
                                                    height: 8px;
                                                    background: hsl(240, 5%, 26%);
                                                    border-radius: 9999px;
                                                    border: none;
                                                }
                                                .slider-shadcn::-moz-range-progress {
                                                    height: 8px;
                                                    background: hsl(217, 91%, 60%);
                                                    border-radius: 9999px;
                                                }
                                                .slider-shadcn::-webkit-slider-thumb {
                                                    appearance: none;
                                                    width: 18px;
                                                    height: 18px;
                                                    border-radius: 50%;
                                                    background: white;
                                                    border: 2px solid hsl(217, 91%, 60%);
                                                    cursor: pointer;
                                                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                                                    transition: all 0.15s ease;
                                                }
                                                .slider-shadcn::-moz-range-thumb {
                                                    appearance: none;
                                                    width: 18px;
                                                    height: 18px;
                                                    border-radius: 50%;
                                                    background: white;
                                                    border: 2px solid hsl(217, 91%, 60%);
                                                    cursor: pointer;
                                                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                                                    transition: all 0.15s ease;
                                                }
                                                .slider-shadcn::-webkit-slider-thumb:hover {
                                                    transform: scale(1.1);
                                                    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
                                                }
                                                .slider-shadcn::-moz-range-thumb:hover {
                                                    transform: scale(1.1);
                                                    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
                                                }
                                                .slider-shadcn:focus::-webkit-slider-thumb {
                                                    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
                                                }
                                                .slider-shadcn:focus::-moz-range-thumb {
                                                    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
                                                }
                                            `
                                        }} />
                                        <input
                                            type="range"
                                            min="0.1"
                                            max="3.0"
                                            step="0.1"
                                            value={pointSize}
                                            onChange={(e) => setPointSize(parseFloat(e.target.value))}
                                            className="slider-shadcn w-full cursor-pointer appearance-none bg-transparent outline-none"
                                        />
                                        <div className="mt-2 flex justify-between text-xs text-zinc-500">
                                            <span>0.1</span>
                                            <span>3.0</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Color Mode Selector */}
                                <div className="flex-1 space-y-3">
                                    <label className="text-sm font-medium text-zinc-200">Color Scheme</label>
                                    <div className="grid grid-cols-5 gap-2">
                                        {[
                                            { value: 'green', color: '#10b981', label: 'Green' },
                                            { value: 'red', color: '#ef4444', label: 'Red' },
                                            { value: 'blue', color: '#3b82f6', label: 'Blue' },
                                            { value: 'white', color: '#f4f4f5', label: 'White' },
                                            { value: 'rainbow', gradient: 'linear-gradient(135deg, #ef4444 0%, #f59e0b 25%, #10b981 50%, #3b82f6 75%, #8b5cf6 100%)', label: 'Height' }
                                        ].map((option) => (
                                            <button
                                                key={option.value}
                                                onClick={() => setColorMode(option.value as any)}
                                                className={`relative flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all ${
                                                    colorMode === option.value
                                                        ? 'border-blue-500 bg-blue-500/10'
                                                        : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600 hover:bg-zinc-800'
                                                }`}
                                                title={option.label}
                                            >
                                                <div
                                                    className="h-6 w-6 rounded-full ring-2 ring-zinc-900"
                                                    style={{
                                                        background: (option as any).gradient || option.color
                                                    }}
                                                />
                                                <span className="text-[10px] font-medium text-zinc-400">
                                                    {option.label}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 3D Canvas content */}
                <div className={`pcd-canvas-container relative w-full overflow-auto bg-black/90 ${showControls ? 'h-[calc(100%-180px)] sm:h-[calc(100%-160px)]' : 'h-[calc(100%-40px)] sm:h-[calc(100%-48px)]'}`}>
                    <style dangerouslySetInnerHTML={{
                        __html: `
                            .pcd-canvas-container::-webkit-scrollbar {
                                width: 12px;
                                height: 12px;
                            }
                            .pcd-canvas-container::-webkit-scrollbar-track {
                                background: rgba(0, 0, 0, 0.3);
                                border-radius: 0;
                            }
                            .pcd-canvas-container::-webkit-scrollbar-thumb {
                                background: rgba(255, 255, 255, 0.2);
                                border-radius: 6px;
                                border: 2px solid rgba(0, 0, 0, 0.3);
                            }
                            .pcd-canvas-container::-webkit-scrollbar-thumb:hover {
                                background: rgba(255, 255, 255, 0.3);
                            }
                            .pcd-canvas-container::-webkit-scrollbar-corner {
                                background: rgba(0, 0, 0, 0.3);
                            }
                        `
                    }} />
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm">
                            <div className="text-center">
                                <LoadingSpinner className="mb-4 h-8 w-8 animate-spin fill-white text-background" />
                                <p className="text-xs text-white/60 sm:text-sm">Loading 3D point cloud...</p>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm">
                            <div className="text-center">
                                <div className="mb-4 text-3xl text-white/40 sm:text-4xl">⚠️</div>
                                <p className="text-xs text-white/60 sm:text-sm">{error}</p>
                            </div>
                        </div>
                    )}

                    {pcdUrl && !error && (
                        <Canvas style={{ background: '#1a1a1a' }}>
                            <Suspense fallback={null}>
                                {/*
                                    Axis Orientation AFTER rotation:
                                    - X-axis: Red, points RIGHT (horizontal)
                                    - Y-axis: Green, points UP (vertical - was Z before rotation)
                                    - Z-axis: Blue, points BACK (horizontal - was Y before rotation)

                                    Point cloud is rotated 90° around X-axis so Y points up
                                    Camera positioned to view from above and at angle
                                */}
                                <PerspectiveCamera makeDefault position={[100, 150, 100]} fov={75} />
                                <OrbitControls
                                    enableDamping
                                    dampingFactor={0.05}
                                    target={[0, 0, 0]}
                                    minDistance={5}
                                    maxDistance={1000}
                                    enablePan={true}
                                />
                                {/* Very bright lighting */}
                                <ambientLight intensity={3} />
                                <directionalLight position={[100, 200, 100]} intensity={3} />
                                <directionalLight position={[-100, 100, -100]} intensity={2} />
                                <pointLight position={[0, 100, 0]} intensity={2} />

                                <PointCloudRenderer
                                    pcdUrl={pcdUrl}
                                    pointSize={pointSize}
                                    colorMode={colorMode}
                                />

                                {/* Grid on X-Z plane (Y=0) - represents ground after rotation */}
                                <gridHelper
                                    args={[500, 100, 0x888888, 0x444444]}
                                    rotation={[0, 0, 0]}
                                    position={[0, 0, 0]}
                                />

                                {/*
                                    Axes Helper AFTER rotation:
                                    - Red = X-axis (horizontal, right)
                                    - Green = Y-axis (VERTICAL, UP - this is height)
                                    - Blue = Z-axis (horizontal, back/forward)

                                    Ground plane is now X-Z (Y=0)
                                */}
                                <axesHelper args={[100]} />
                            </Suspense>
                        </Canvas>
                    )}

                    {/* Resize handle */}
                    {!isFullscreen && (
                        <div
                            onMouseDown={handleResize}
                            className="absolute bottom-0 right-0 h-4 w-4 cursor-se-resize sm:h-5 sm:w-5"
                            style={{
                                background: "linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.2) 50%)"
                            }}
                        />
                    )}
                </div>
            </div>
        </Draggable>
    );
});

Draggable3DPointCloudPanel.displayName = "Draggable3DPointCloudPanel";

export default Draggable3DPointCloudPanel;
