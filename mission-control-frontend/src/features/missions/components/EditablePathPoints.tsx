import { useEffect, useState, useCallback } from "react";
import { useMissionsStore } from "@/stores/missionsStore";
import { Point2 } from "@/data/types";
import {
    distanceBetweenUTM,
    utmToLatLng,
    latLngToUtm
} from "@/util/geoUtils";
import {
    extractControlPoints,
    createCatmullRomCurve,
    getEquallySpacedPoints,
    updateControlPoint
} from "@/util/curveUtils";
import { validateAllPathPoints } from "@/util/pathEditingUtils";
import { toast } from "react-toastify";

type EditablePathPointsProps = {
    map: google.maps.Map | null;
};

// Store control points and metadata for each path
interface PathEditState {
    pathId: string;
    originalPath: Point2[];
    controlPoints: Point2[];
    boundaries: any[];
    obstacles: any[];
}

const EditablePathPoints = ({ map }: EditablePathPointsProps) => {
    const isEditingPaths = useMissionsStore((state) => state.isEditingPaths);
    const editPointCount = useMissionsStore((state) => state.editPointCount);
    const pathMap = useMissionsStore((state) => state.pathMap);
    const updatePathPoint = useMissionsStore((state) => state.updatePathPoint);
    const setDragAdjustmentState = useMissionsStore((state) => state.setDragAdjustmentState);

    const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
    const [measurementLine, setMeasurementLine] = useState<google.maps.Polyline | null>(null);
    const [measurementLabel, setMeasurementLabel] = useState<google.maps.Marker | null>(null);
    const [previewPolyline, setPreviewPolyline] = useState<google.maps.Polyline | null>(null);
    const [originalPolyline, setOriginalPolyline] = useState<google.maps.Polyline | null>(null);
    const [staticPathPolylines, setStaticPathPolylines] = useState<Map<string, google.maps.Polyline>>(new Map());
    const [pathEditStates, setPathEditStates] = useState<Map<string, PathEditState>>(new Map());
    const [isDragging, setIsDragging] = useState(false);
    const [currentPathId, setCurrentPathId] = useState<string | null>(null);

    // Cleanup markers and polylines when editing stops
    useEffect(() => {
        if (!isEditingPaths) {
            markers.forEach(marker => marker.setMap(null));
            setMarkers([]);
            if (measurementLine) {
                measurementLine.setMap(null);
                setMeasurementLine(null);
            }
            if (measurementLabel) {
                measurementLabel.setMap(null);
                setMeasurementLabel(null);
            }
            if (previewPolyline) {
                previewPolyline.setMap(null);
                setPreviewPolyline(null);
            }
            if (originalPolyline) {
                originalPolyline.setMap(null);
                setOriginalPolyline(null);
            }
            staticPathPolylines.forEach(polyline => polyline.setMap(null));
            setStaticPathPolylines(new Map());
            setPathEditStates(new Map());
            setDragAdjustmentState(undefined);
            setIsDragging(false);
            setCurrentPathId(null);
        }
    }, [isEditingPaths]);

    // Hide/show static paths based on drag state
    useEffect(() => {
        staticPathPolylines.forEach((polyline, pathId) => {
            // Hide static path of currently dragging path, show others
            if (isDragging && pathId === currentPathId) {
                polyline.setVisible(false);
            } else {
                polyline.setVisible(true);
            }
        });
    }, [isDragging, currentPathId, staticPathPolylines]);

    // Render path preview using Catmull-Rom curve
    const renderCurvePreview = useCallback((
        controlPoints: Point2[],
        isValid: boolean,
        map: google.maps.Map
    ) => {
        // Remove existing preview using state callback to get latest value
        setPreviewPolyline(prev => {
            if (prev) {
                prev.setMap(null);
            }
            return null;
        });

        // Create curve from control points
        const curve = createCatmullRomCurve(controlPoints);

        // Get equally spaced points for smooth preview
        const curvePoints = getEquallySpacedPoints(curve, 100);

        // Convert to LatLng
        const latLngPath = curvePoints.map(p => utmToLatLng(p.x, p.y));

        // Create preview polyline
        const preview = new google.maps.Polyline({
            path: latLngPath,
            strokeColor: isValid ? "#FFD700" : "#FF0000", // Yellow if valid, red if invalid
            strokeOpacity: 0.8,
            strokeWeight: 4,
            geodesic: true,
            map: map,
            zIndex: 998
        });

        setPreviewPolyline(preview);
    }, []);

    // Render original path (faded)
    const renderOriginalPath = useCallback((
        originalPath: Point2[],
        map: google.maps.Map
    ) => {
        // Remove existing original path using state callback
        setOriginalPolyline(prev => {
            if (prev) {
                prev.setMap(null);
            }
            return null;
        });

        // Convert to LatLng
        const latLngPath = originalPath.map(p => utmToLatLng(p.x, p.y));

        // Create faded original polyline
        const original = new google.maps.Polyline({
            path: latLngPath,
            strokeColor: "#FFFFFF",
            strokeOpacity: 0.3, // Faded
            strokeWeight: 2,
            geodesic: true,
            map: map,
            zIndex: 997
        });

        setOriginalPolyline(original);
    }, []);

    // Create draggable markers for control points
    useEffect(() => {
        if (!map || !isEditingPaths || !pathMap) return;

        // Clear existing markers and static paths
        markers.forEach(marker => marker.setMap(null));
        staticPathPolylines.forEach(polyline => polyline.setMap(null));
        const newMarkers: google.maps.Marker[] = [];
        const newStaticPolylines = new Map<string, google.maps.Polyline>();
        const newPathEditStates = new Map<string, PathEditState>();

        // Snapshot boundaries and obstacles for validation
        const boundaries = pathMap.boundaries;
        const obstacles = pathMap.obstacles;

        // Determine control point count (5-10 based on editPointCount)
        // Less edit points = fewer control points for smoother curves
        const controlPointCount = Math.max(5, Math.min(10, Math.floor(editPointCount / 3)));

        // Iterate through all paths
        Object.values(pathMap.paths).forEach((pathArray) => {
            pathArray.forEach((path) => {
                // Extract control points from path
                const controlPoints = extractControlPoints(path.utm, controlPointCount);

                // Store path edit state
                const editState: PathEditState = {
                    pathId: path.id,
                    originalPath: [...path.utm],
                    controlPoints: controlPoints,
                    boundaries: boundaries,
                    obstacles: obstacles
                };
                newPathEditStates.set(path.id, editState);

                // Create smooth curve from control points
                const curve = createCatmullRomCurve(controlPoints);
                const smoothPath = getEquallySpacedPoints(curve, 100);

                // Render static path as Google Maps polyline
                const latLngPath = smoothPath.map(p => utmToLatLng(p.x, p.y));
                const staticPolyline = new google.maps.Polyline({
                    path: latLngPath,
                    strokeColor: "#FFFFFF",
                    strokeOpacity: 0.6,
                    strokeWeight: 3,
                    geodesic: true,
                    map: map,
                    zIndex: 500
                });
                newStaticPolylines.set(path.id, staticPolyline);

                // Create markers for CONTROL POINTS (not all points!)
                controlPoints.forEach((controlPoint, controlIndex) => {
                    const latLng = utmToLatLng(controlPoint.x, controlPoint.y);

                    // Create marker with larger size for control points
                    const marker = new google.maps.Marker({
                        position: latLng,
                        map: map,
                        draggable: true,
                        icon: {
                            path: google.maps.SymbolPath.CIRCLE,
                            scale: 8, // Larger for control points
                            fillColor: "#FFD700", // Gold color
                            fillOpacity: 1,
                            strokeColor: "#333333",
                            strokeWeight: 2,
                        },
                        zIndex: 1000,
                        title: `Control Point ${controlIndex + 1}/${controlPoints.length}`
                    });

                    // Store path info in marker
                    (marker as any).pathId = path.id;
                    (marker as any).controlIndex = controlIndex;

                    // Drag start
                    marker.addListener("dragstart", () => {
                        const editState = newPathEditStates.get(path.id);
                        if (!editState) return;

                        // Set dragging state
                        setIsDragging(true);
                        setCurrentPathId(path.id);

                        // Show faded original path (current control points before this drag)
                        const currentCurve = createCatmullRomCurve(editState.controlPoints);
                        const currentPath = getEquallySpacedPoints(currentCurve, 100);
                        renderOriginalPath(currentPath, map);
                    });

                    // During drag
                    marker.addListener("drag", (e: google.maps.MapMouseEvent) => {
                        if (!e.latLng) return;

                        const editState = newPathEditStates.get(path.id);
                        if (!editState) return;

                        const newLatLng = { lat: e.latLng.lat(), lng: e.latLng.lng() };
                        const utm = latLngToUtm(newLatLng.lat, newLatLng.lng);
                        const newUtmPoint: Point2 = { x: utm.easting, y: utm.northing };

                        // Update control point
                        const updatedControlPoints = updateControlPoint(
                            editState.controlPoints,
                            controlIndex,
                            newUtmPoint
                        );

                        // Create new curve with updated control points
                        const newCurve = createCatmullRomCurve(updatedControlPoints);
                        const newPath = getEquallySpacedPoints(newCurve, 100);

                        // Validate ALL points in new path
                        const validation = validateAllPathPoints(
                            newPath,
                            editState.boundaries,
                            editState.obstacles
                        );

                        // Update drag adjustment state
                        setDragAdjustmentState({
                            pathId: path.id,
                            draggedPointIndex: controlIndex,
                            originalPositions: editState.originalPath,
                            adjustedPositions: newPath,
                            influenceRadius: controlPoints.length,
                            isValid: validation.valid,
                            invalidPointIndices: validation.invalidPointIndices
                        });

                        // Show measurement line from original to current position
                        const originalControlPoint = editState.controlPoints[controlIndex];
                        const originalLatLng = utmToLatLng(originalControlPoint.x, originalControlPoint.y);
                        showMeasurementLine(
                            map,
                            originalControlPoint,
                            newUtmPoint,
                            originalLatLng,
                            newLatLng
                        );

                        // Render curve preview (yellow or red)
                        renderCurvePreview(updatedControlPoints, validation.valid, map);
                    });

                    // Drag end
                    marker.addListener("dragend", (e: google.maps.MapMouseEvent) => {
                        if (!e.latLng) return;

                        const editState = newPathEditStates.get(path.id);
                        if (!editState) return;

                        const newLatLng = { lat: e.latLng.lat(), lng: e.latLng.lng() };
                        const utm = latLngToUtm(newLatLng.lat, newLatLng.lng);
                        const newUtmPoint: Point2 = { x: utm.easting, y: utm.northing };

                        // Update control point
                        const updatedControlPoints = updateControlPoint(
                            editState.controlPoints,
                            controlIndex,
                            newUtmPoint
                        );

                        // Create new curve and get equally spaced points
                        const newCurve = createCatmullRomCurve(updatedControlPoints);
                        const newPath = getEquallySpacedPoints(newCurve, editState.originalPath.length);

                        // Validate ALL points
                        const validation = validateAllPathPoints(
                            newPath,
                            editState.boundaries,
                            editState.obstacles
                        );

                        if (!validation.valid) {
                            toast.error(validation.reason || "Path adjustment violates constraints");
                            // Snap back to original position
                            const originalLatLng = utmToLatLng(controlPoint.x, controlPoint.y);
                            marker.setPosition(originalLatLng);
                        } else {
                            // Update ALL points in the path
                            newPath.forEach((point, idx) => {
                                updatePathPoint(path.id, idx, point);
                            });

                            // Update stored control points for next drag
                            // Use the updatedControlPoints that were dragged, not re-extracted ones
                            editState.controlPoints = updatedControlPoints;
                            newPathEditStates.set(path.id, editState);

                            // CRITICAL: Update React state so next drag has access to new control points
                            setPathEditStates(new Map(newPathEditStates));

                            // Update the static polyline to show new path
                            const staticPolyline = newStaticPolylines.get(path.id);
                            if (staticPolyline) {
                                // Use the SAME curve we just created with updatedControlPoints
                                const updatedSmoothPath = getEquallySpacedPoints(newCurve, 100);
                                const updatedLatLngPath = updatedSmoothPath.map(p => utmToLatLng(p.x, p.y));
                                staticPolyline.setPath(updatedLatLngPath);
                            }

                            // Update ALL marker positions for this path based on updatedControlPoints
                            newMarkers.forEach(m => {
                                if ((m as any).pathId === path.id) {
                                    const markerControlIndex = (m as any).controlIndex;
                                    const newControlPoint = updatedControlPoints[markerControlIndex];
                                    if (newControlPoint) {
                                        const newMarkerLatLng = utmToLatLng(newControlPoint.x, newControlPoint.y);
                                        m.setPosition(newMarkerLatLng);
                                    }
                                }
                            });

                            toast.success("Path adjusted with smooth curve");
                        }

                        // Clear all preview elements
                        if (measurementLine) measurementLine.setMap(null);
                        if (measurementLabel) measurementLabel.setMap(null);
                        if (previewPolyline) previewPolyline.setMap(null);
                        if (originalPolyline) originalPolyline.setMap(null);
                        setDragAdjustmentState(undefined);

                        // Reset dragging state
                        setIsDragging(false);
                        setCurrentPathId(null);
                    });

                    newMarkers.push(marker);
                });
            });
        });

        setMarkers(newMarkers);
        setStaticPathPolylines(newStaticPolylines);
        setPathEditStates(newPathEditStates);

        // Cleanup
        return () => {
            newMarkers.forEach(marker => marker.setMap(null));
            newStaticPolylines.forEach(polyline => polyline.setMap(null));
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [map, isEditingPaths, editPointCount]);

    const showMeasurementLine = useCallback((
        map: google.maps.Map,
        originalUTM: Point2,
        currentUTM: Point2,
        originalLatLng: google.maps.LatLngLiteral,
        currentLatLng: google.maps.LatLngLiteral
    ) => {
        // Remove existing line and label using state callback
        setMeasurementLine(prev => {
            if (prev) prev.setMap(null);
            return null;
        });
        setMeasurementLabel(prev => {
            if (prev) prev.setMap(null);
            return null;
        });

        // Calculate distance in meters using UTM (real-world scale)
        const distance = distanceBetweenUTM(originalUTM, currentUTM);

        // Create yellow dashed line
        const line = new google.maps.Polyline({
            path: [originalLatLng, currentLatLng],
            strokeColor: "#FFD700",
            strokeOpacity: 1,
            strokeWeight: 2,
            geodesic: true,
            map: map,
            zIndex: 999,
            icons: [{
                icon: {
                    path: 'M 0,-1 0,1',
                    strokeOpacity: 1,
                    scale: 2
                },
                offset: '0',
                repeat: '10px'
            }]
        });

        // Create label at midpoint
        const midLat = (originalLatLng.lat + currentLatLng.lat) / 2;
        const midLng = (originalLatLng.lng + currentLatLng.lng) / 2;

        const label = new google.maps.Marker({
            position: { lat: midLat, lng: midLng },
            map: map,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 0,
            },
            label: {
                text: `${distance.toFixed(1)}m`,
                color: "#FFFFFF",
                fontSize: "14px",
                fontWeight: "bold",
                className: "measurement-label"
            },
            zIndex: 1001,
        });

        setMeasurementLine(line);
        setMeasurementLabel(label);
    }, []);

    // This component doesn't render anything - it manages map markers
    return null;
};

export default EditablePathPoints;
