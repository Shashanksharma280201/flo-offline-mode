import { useEffect, useRef, useState, memo, useCallback } from "react";
import { useMissionsStore } from "../../../stores/missionsStore";
import { useLidarOverlayStore } from "../../../stores/lidarOverlayStore";
import { FaRobot, FaCrosshairs } from "react-icons/fa";
import { MdMap } from "react-icons/md";
import { toast } from "react-toastify";
import { LatLng } from "@/data/types";
import { VectorMapOptions } from "../../../constants/map";
import { latLngToPixel, MapConfig } from "../../../util/mapGeoref";
import { getLidarMapByName, getAllPresignedUrls, loadMapMetadata } from "../services/lidarMapsService";
import { createImageFromPGM } from "../../../util/pgmParser";
import { useRosFns } from "../../../lib/ros/useRosFns";

const LidarMap2D = memo(() => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [mapImage, setMapImage] = useState<HTMLImageElement | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Map transform state
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [scale, setScale] = useState(1);
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });

    // Initial pose setting mode
    const [isSettingPose, setIsSettingPose] = useState(false);

    const { rosServiceCaller } = useRosFns();

    // Get pathmap data, robot position, and selected LIDAR map from store
    const [pathMap, stations, mapXY, selectedLidarMap] = useMissionsStore((state) => [
        state.pathMap,
        state.pathMap?.stations,
        state.mapXY,
        state.selectedLidarMap
    ]);

    // Default test position at LIDAR map origin (0, 0)
    const testMapPosition = { x: 0, y: 0 };
    const displayMapPosition = mapXY || testMapPosition;

    // Sync transform state to LIDAR overlay store
    const setLidarOffset = useLidarOverlayStore((state) => state.setOffset);
    const setLidarScale = useLidarOverlayStore((state) => state.setScale);
    const setLidarCanvasSize = useLidarOverlayStore((state) => state.setCanvasSize);

    // Dynamic map configuration loaded from YAML
    const [mapConfig, setMapConfig] = useState<MapConfig>({
        resolution: 0.05, // Default fallback
        origin: { x: 0, y: 0 }, // Default fallback
        imageWidth: 0,
        imageHeight: 0
    });

    // Load map image from S3 via LIDAR maps service
    useEffect(() => {
        const loadMapImage = async () => {
            setIsLoading(true);
            try {
                // Use selected LIDAR map from store, fallback to sriram_2d_map_1 if none selected
                const mapNameToLoad = selectedLidarMap || "sriram_2d_map_1";
                console.log("[LidarMap2D] Starting to load map:", mapNameToLoad);

                // Fetch the LIDAR map metadata from MongoDB
                console.log("[LidarMap2D] Fetching map metadata from MongoDB...");
                const lidarMapResponse = await getLidarMapByName(mapNameToLoad);
                console.log("[LidarMap2D] MongoDB response:", lidarMapResponse);

                if (!lidarMapResponse.success || !lidarMapResponse.data) {
                    throw new Error(`LIDAR map '${mapNameToLoad}' not found in database`);
                }

                const lidarMap = lidarMapResponse.data;
                console.log("[LidarMap2D] Found map in database:", {
                    id: lidarMap.id,
                    name: lidarMap.name,
                    s3FolderPath: lidarMap.s3FolderPath
                });

                // Get pre-signed URLs for S3 files
                console.log("[LidarMap2D] Fetching pre-signed URLs for map ID:", lidarMap.id);
                const urlsResponse = await getAllPresignedUrls(lidarMap.id);
                console.log("[LidarMap2D] Pre-signed URLs response:", urlsResponse);

                if (!urlsResponse.success || !urlsResponse.data) {
                    throw new Error("Failed to get S3 pre-signed URLs");
                }

                const { urls } = urlsResponse.data;
                console.log("[LidarMap2D] S3 Pre-signed URL for 2D map:", urls.map2dPgm.substring(0, 100) + "...");

                // Fetch the 2D map image from S3
                console.log("[LidarMap2D] Fetching image from S3...");
                const response = await fetch(urls.map2dPgm);
                console.log("[LidarMap2D] S3 fetch response status:", response.status, response.statusText);

                if (!response.ok) {
                    throw new Error(`Failed to load map from S3: ${response.status} ${response.statusText}`);
                }

                // Get the PGM file as array buffer
                const arrayBuffer = await response.arrayBuffer();
                console.log("[LidarMap2D] Received PGM file size:", (arrayBuffer.byteLength / 1024 / 1024).toFixed(2), "MB");

                // Parse PGM and convert to Image element
                console.log("[LidarMap2D] Parsing PGM file...");
                const img = await createImageFromPGM(arrayBuffer);
                console.log("[LidarMap2D] Image created successfully:", img.width, "x", img.height);

                // Load map metadata from YAML
                console.log("[LidarMap2D] Loading map metadata from YAML...");
                const metadata = await loadMapMetadata(lidarMap.id);
                console.log("[LidarMap2D] Metadata loaded:", metadata);

                // Update map config with loaded metadata
                const newMapConfig: MapConfig = {
                    resolution: metadata.resolution,
                    origin: {
                        x: metadata.origin[0],
                        y: metadata.origin[1]
                    },
                    imageWidth: img.width,
                    imageHeight: img.height
                };
                setMapConfig(newMapConfig);
                console.log("[LidarMap2D] Map config updated:", newMapConfig);

                setMapImage(img);
                setIsLoading(false);

                // Fit map to canvas initially
                if (canvasRef.current) {
                    const canvas = canvasRef.current;

                    // Calculate scale to fit entire map in canvas
                    const scaleX = canvas.width / img.width;
                    const scaleY = canvas.height / img.height;
                    const fitScale = Math.min(scaleX, scaleY) * 0.9; // 90% to add padding

                    setScale(fitScale);

                    // Center the map
                    setOffset({
                        x: (canvas.width - img.width * fitScale) / 2,
                        y: (canvas.height - img.height * fitScale) / 2
                    });
                }
            } catch (error) {
                setIsLoading(false);
                console.error("[LidarMap2D] Error loading map:", error);
                console.error("[LidarMap2D] Error details:", {
                    name: error instanceof Error ? error.name : "Unknown",
                    message: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined
                });
                toast.error(`Failed to load LIDAR map: ${error instanceof Error ? error.message : "Unknown error"}`);
            }
        };

        loadMapImage();
    }, [selectedLidarMap]); // Reload when selected LIDAR map changes

    // Convert lat/lng to map pixel coordinates using geo-referencing
    const convertLatLngToPixel = useCallback((lat: number, lng: number) => {
        return latLngToPixel(lat, lng, mapConfig);
    }, [mapConfig]);

    // Draw the map
    useEffect(() => {
        if (!canvasRef.current || !mapImage) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Save context state
        ctx.save();

        // Apply transformations
        ctx.translate(offset.x, offset.y);
        ctx.scale(scale, scale);

        // Draw map image
        ctx.drawImage(mapImage, 0, 0);

        // Draw paths
        if (pathMap?.paths) {
            ctx.strokeStyle = "rgba(0, 255, 0, 0.6)";
            ctx.lineWidth = 3 / scale;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";

            // Iterate through all paths
            Object.values(pathMap.paths).forEach((pathArray) => {
                pathArray.forEach((path) => {
                    // Use UTM coordinates for LIDAR map (already in map coordinate system)
                    if (path.utm && path.utm.length > 1) {
                        ctx.beginPath();

                        // Convert first UTM point to pixels
                        const firstPixelX = (path.utm[0].x - mapConfig.origin.x) / mapConfig.resolution;
                        const firstPixelY = (path.utm[0].y - mapConfig.origin.y) / mapConfig.resolution;
                        ctx.moveTo(firstPixelX, firstPixelY);

                        // Draw lines to subsequent points
                        for (let i = 1; i < path.utm.length; i++) {
                            const pixelX = (path.utm[i].x - mapConfig.origin.x) / mapConfig.resolution;
                            const pixelY = (path.utm[i].y - mapConfig.origin.y) / mapConfig.resolution;
                            ctx.lineTo(pixelX, pixelY);
                        }

                        ctx.stroke();
                    }
                });
            });
        }

        // Draw stations
        if (stations && stations.length > 0) {
            stations.forEach((station) => {
                // Use x/y coordinates for LIDAR map (already in map coordinate system)
                const pixelX = (station.x - mapConfig.origin.x) / mapConfig.resolution;
                const pixelY = (station.y - mapConfig.origin.y) / mapConfig.resolution;

                ctx.fillStyle = "rgba(0, 123, 255, 0.8)";
                ctx.beginPath();
                ctx.arc(pixelX, pixelY, 8 / scale, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
                ctx.lineWidth = 2 / scale;
                ctx.stroke();
            });
        }

        // Draw robot position (for debugging)
        if (displayMapPosition) {
            // Convert LIDAR map coordinates to pixel coordinates
            const pixelX = (displayMapPosition.x - mapConfig.origin.x) / mapConfig.resolution;
            const pixelY = (displayMapPosition.y - mapConfig.origin.y) / mapConfig.resolution;

            // Draw outer red circle
            ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
            ctx.beginPath();
            ctx.arc(pixelX, pixelY, 15 / scale, 0, Math.PI * 2);
            ctx.fill();

            // Draw inner white circle
            ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
            ctx.beginPath();
            ctx.arc(pixelX, pixelY, 5 / scale, 0, Math.PI * 2);
            ctx.fill();
        }

        // Restore context state
        ctx.restore();
    }, [mapImage, offset, scale, pathMap, stations, displayMapPosition, mapConfig]);

    // Handle canvas resize
    useEffect(() => {
        const resizeCanvas = () => {
            if (canvasRef.current && containerRef.current) {
                const width = containerRef.current.clientWidth;
                const height = containerRef.current.clientHeight;
                canvasRef.current.width = width;
                canvasRef.current.height = height;

                // Sync canvas size to overlay store
                setLidarCanvasSize({ width, height });
            }
        };

        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);
        return () => window.removeEventListener("resize", resizeCanvas);
    }, [setLidarCanvasSize]);

    // Sync offset changes to overlay store
    useEffect(() => {
        setLidarOffset(offset);
    }, [offset, setLidarOffset]);

    // Sync scale changes to overlay store
    useEffect(() => {
        setLidarScale(scale);
    }, [scale, setLidarScale]);

    // Pan handlers
    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (isSettingPose) {
            // In pose-setting mode, don't pan
            return;
        }
        setIsPanning(true);
        setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isPanning) return;
        setOffset({
            x: e.clientX - panStart.x,
            y: e.clientY - panStart.y
        });
    };

    const handleMouseUp = () => {
        setIsPanning(false);
    };

    // Handle canvas click for setting initial pose
    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isSettingPose || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();

        // Get click position relative to canvas
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;

        // Convert canvas coordinates to map pixel coordinates
        const mapPixelX = (canvasX - offset.x) / scale;
        const mapPixelY = (canvasY - offset.y) / scale;

        // Convert pixel coordinates to map coordinates (meters)
        const mapX = mapPixelX * mapConfig.resolution + mapConfig.origin.x;
        const mapY = mapPixelY * mapConfig.resolution + mapConfig.origin.y;

        // Call ROS service to set initial pose
        rosServiceCaller(
            "/set_pose",
            "flo_msgs/srv/SetPose",
            (result: { success: boolean; message: string }) => {
                if (result.success) {
                    toast.success(`Initial pose set at (${mapX.toFixed(2)}m, ${mapY.toFixed(2)}m)`, {
                        position: "bottom-right",
                        autoClose: 3000
                    });
                    setIsSettingPose(false);
                } else {
                    toast.error(`Failed to set pose: ${result.message}`);
                }
            },
            (error) => {
                toast.error(`Failed to set pose: ${error.message}`);
                setIsSettingPose(false);
            },
            {
                x: mapX,
                y: mapY,
                theta: 0.0 // Default orientation, user can adjust if needed
            }
        );
    };

    const handleWheel = useCallback((e: WheelEvent) => {
        e.preventDefault();

        if (!canvasRef.current || !mapImage) return;

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();

        // Get mouse position relative to canvas
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const delta = e.deltaY > 0 ? 0.9 : 1.1;

        // Calculate min scale to fit entire map with padding
        const scaleX = canvas.width / mapImage.width;
        const scaleY = canvas.height / mapImage.height;
        const minScale = Math.min(scaleX, scaleY) * 0.9; // 90% to add padding

        // Max scale for detailed view
        const maxScale = 5;

        setScale((prevScale) => {
            const newScale = Math.max(minScale, Math.min(maxScale, prevScale * delta));

            // If zooming out to min scale, auto-center the map
            if (newScale === minScale) {
                setOffset({
                    x: (canvas.width - mapImage.width * minScale) / 2,
                    y: (canvas.height - mapImage.height * minScale) / 2
                });
            } else {
                // Zoom towards cursor position
                // Calculate the point in map space that the cursor is pointing at
                setOffset((prevOffset) => {
                    const worldX = (mouseX - prevOffset.x) / prevScale;
                    const worldY = (mouseY - prevOffset.y) / prevScale;

                    // Calculate new offset to keep the same world point under the cursor
                    return {
                        x: mouseX - worldX * newScale,
                        y: mouseY - worldY * newScale
                    };
                });
            }

            return newScale;
        });
    }, [mapImage]);

    // Add wheel event listener with passive: false
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            canvas.removeEventListener('wheel', handleWheel);
        };
    }, [handleWheel]);

    // Pan to robot
    const panToRobot = useCallback(() => {
        if (!canvasRef.current || !displayMapPosition) {
            toast.error("No robot position available");
            return;
        }
        // Convert map coordinates to pixel coordinates
        const pixelX = (displayMapPosition.x - mapConfig.origin.x) / mapConfig.resolution;
        const pixelY = (displayMapPosition.y - mapConfig.origin.y) / mapConfig.resolution;

        const canvas = canvasRef.current;
        setOffset({
            x: canvas.width / 2 - pixelX * scale,
            y: canvas.height / 2 - pixelY * scale
        });
        toast.info(mapXY ? "Centered on robot" : "Centered on test position (origin)");
    }, [displayMapPosition, mapXY, scale, mapConfig]);

    // Pan to pathmap
    const panToPathmap = useCallback(() => {
        if (!canvasRef.current || !stations || stations.length === 0) {
            toast.error("No pathmap selected");
            return;
        }

        const firstStation = stations[0];
        // Use x/y coordinates for LIDAR map
        const pixelX = (firstStation.x - mapConfig.origin.x) / mapConfig.resolution;
        const pixelY = (firstStation.y - mapConfig.origin.y) / mapConfig.resolution;
        const canvas = canvasRef.current;

        setOffset({
            x: canvas.width / 2 - pixelX * scale,
            y: canvas.height / 2 - pixelY * scale
        });

        toast.info("Centered on pathmap");
    }, [stations, scale, mapConfig]);

    return (
        <div
            ref={containerRef}
            className="relative h-full w-full bg-gray-900"
        >
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                    <div className="text-white">Loading LIDAR map...</div>
                </div>
            )}

            {/* Debug info */}
            <div className="absolute left-4 top-4 rounded bg-black/70 p-2 text-xs text-white">
                <div>LIDAR Map: {selectedLidarMap || "sriram_2d_map_1 (default)"}</div>
                <div>Robot Position (map): {displayMapPosition ? `x:${displayMapPosition.x.toFixed(2)}m, y:${displayMapPosition.y.toFixed(2)}m` : 'Not available'} {!mapXY && '(TEST)'}</div>
                <div>Canvas: {canvasRef.current?.width ?? 0} x {canvasRef.current?.height ?? 0}</div>
                <div>Scale: {scale.toFixed(2)}, Offset: ({offset.x.toFixed(0)}, {offset.y.toFixed(0)})</div>
            </div>

            <canvas
                ref={canvasRef}
                className={`h-full w-full ${isSettingPose ? 'cursor-crosshair' : 'cursor-move'}`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onClick={handleCanvasClick}
            />

            {/* Pan to buttons */}
            <div className="absolute bottom-5 right-5 flex flex-col gap-4 md:bottom-10 md:right-10">
                {/* Set Initial Pose button */}
                <button
                    onClick={() => {
                        setIsSettingPose(!isSettingPose);
                        if (!isSettingPose) {
                            toast.info("Click on map to set robot's initial pose", {
                                position: "bottom-right",
                                autoClose: 4000
                            });
                        }
                    }}
                    title={isSettingPose ? "Cancel setting pose" : "Set initial pose"}
                    className={`rounded-lg p-2 text-white shadow-lg transition-all duration-200 ${
                        isSettingPose
                            ? 'bg-blue-600 hover:bg-blue-700 animate-pulse'
                            : 'bg-black hover:bg-gray-800'
                    }`}
                >
                    <div className={`rounded-lg border-2 p-1 ${isSettingPose ? 'border-blue-300' : 'border-white'}`}>
                        <FaCrosshairs />
                    </div>
                </button>

                {/* Pan to robot button - show for both real and test position */}
                {displayMapPosition && (
                    <button
                        onClick={panToRobot}
                        title={mapXY ? "Pan to robot" : "Pan to origin (0,0)"}
                        className="rounded-lg bg-black p-2 text-white shadow-lg transition-all duration-200 hover:bg-gray-800"
                    >
                        <div className="rounded-lg border-2 border-white p-1">
                            <FaRobot />
                        </div>
                    </button>
                )}
                {stations && stations.length > 0 && (
                    <button
                        onClick={panToPathmap}
                        title="Pan to pathmap"
                        className="rounded-lg bg-black p-2 text-white shadow-lg transition-all duration-200 hover:bg-gray-800"
                    >
                        <div className="rounded-lg border-2 border-white p-1">
                            <MdMap />
                        </div>
                    </button>
                )}
            </div>
        </div>
    );
});

LidarMap2D.displayName = "LidarMap2D";

export default LidarMap2D;
