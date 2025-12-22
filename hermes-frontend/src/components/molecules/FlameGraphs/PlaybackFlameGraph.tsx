import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type MouseEvent as ReactMouseEvent,
} from "react";
import type { TraceEntryCallStack } from "../../../types";
import { getColor } from "../../../util";
import Tooltip from "../../atoms/Tooltip";

interface PlaybackFlameGraphProps {
    traces: TraceEntryCallStack[];
}

const ROW_HEIGHT = 40;
const Y_OFFSET = 20;

const MIN_ZOOM = 0.00001;
const MAX_ZOOM = 100;
const ZOOM_FACTOR = 1.75;

export default function PlaybackFlameGraph({
    traces,
}: PlaybackFlameGraphProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const [inspectedFunction, setInspectedFunction] =
        useState<TraceEntryCallStack | null>(null);

    const viewState = useRef({
        offsetTime: 0n,
        zoom: 0.01, // Initial zoom
        isDragging: false,
        lastMouseX: 0,
    });

    const drawnShapeMap = useRef<Map<string, TraceEntryCallStack>>(new Map());

    const bounds = useMemo(() => {
        if (traces.length === 0) return { start: 0n, end: 0n, duration: 0n };

        let min = BigInt(traces[0].startTime);
        let max = BigInt(traces[0].endTime);

        traces.forEach((t) => {
            const s = BigInt(t.startTime);
            const e = BigInt(t.endTime);
            if (s < min) min = s;
            if (e > max) max = e;
        });

        return { start: min, end: max, duration: max - min };
    }, [traces]);

    useEffect(() => {
        if (bounds.duration > 0n && containerRef.current) {
            const width = containerRef.current.clientWidth;
            const initialZoom = width / Number(bounds.duration);
            viewState.current.zoom = initialZoom * 0.95;
            viewState.current.offsetTime =
                bounds.start -
                BigInt(Math.floor(Number(bounds.duration) * 0.025));
            draw();
        }
    }, [bounds]);

    const draw = () => {
        const canvas = canvasRef.current;
        if (!canvas || !containerRef.current) return;

        const ctx = canvas.getContext("2d", { alpha: false });
        if (!ctx) return;

        const { width, height } = containerRef.current.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
        }

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.scale(dpr, dpr);

        ctx.fillStyle = "#1e1e1e";
        ctx.fillRect(0, 0, width, height);

        if (traces.length === 0) {
            ctx.fillStyle = "#666";
            ctx.font = "14px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("No trace data available", width / 2, height / 2);
            return;
        }

        const { offsetTime, zoom } = viewState.current;
        const renderMap = new Map();

        const visibleStartTime = offsetTime;
        const visibleEndTime = offsetTime + BigInt(Math.floor(width / zoom));

        traces.forEach((trace) => {
            const start = BigInt(trace.startTime);
            const end = BigInt(trace.endTime);

            if (end < visibleStartTime || start > visibleEndTime) return;

            const x = Number(start - offsetTime) * zoom;
            const w = Math.max(Number(end - start) * zoom, 1);

            // CHANGED: Removed Y_OFFSET so traces start at the top
            const y = trace.depth * ROW_HEIGHT;

            if (w < 0.2) return;

            ctx.fillStyle = getColor(trace.funcName, trace.depth);
            ctx.fillRect(x, y, w, ROW_HEIGHT - 2);

            renderMap.set(`${x},${y},${x + w},${y + ROW_HEIGHT - 2}`, trace);

            if (w > 40) {
                const cleanName = trace.funcName.replace(/\u0000/g, "");
                ctx.fillStyle = "#000";
                ctx.font = "10px monospace";
                ctx.textBaseline = "middle";
                ctx.save();
                ctx.beginPath();
                ctx.rect(x, y, w, ROW_HEIGHT - 2);
                ctx.clip();
                ctx.fillText(cleanName, x + 5, y + ROW_HEIGHT / 2);
                ctx.restore();
            }
        });

        drawnShapeMap.current = renderMap;

        // We draw the axis last so it floats on top of deep traces
        drawAxis(ctx, width, height, offsetTime, zoom, bounds.start);
    };

    const drawAxis = (
        ctx: CanvasRenderingContext2D,
        width: number,
        height: number,
        offsetTime: bigint,
        zoom: number,
        globalStart: bigint // <--- New Argument
    ) => {
        const topOfAxis = height - Y_OFFSET;

        ctx.save();

        // Background
        ctx.fillStyle = "#1e1e1e";
        ctx.fillRect(0, topOfAxis, width, Y_OFFSET);

        // Top Border
        ctx.strokeStyle = "#444";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, topOfAxis);
        ctx.lineTo(width, topOfAxis);
        ctx.stroke();

        const NUM_TICKS = 10;
        ctx.font = "10px monospace";
        ctx.textBaseline = "middle";

        for (let i = 0; i <= NUM_TICKS; i++) {
            const x = (width / NUM_TICKS) * i;

            // Calculate absolute time at this X position
            const timeAtX = offsetTime + BigInt(Math.floor(x / zoom));

            // NORMALIZE: Subtract the global start time
            // If timeAtX is before the start (scrolled left), this becomes negative, which is fine.
            const relativeTime = timeAtX - globalStart;

            // Convert to seconds (assuming microseconds input)
            const seconds = Number(relativeTime) / 1_000_000;

            // Format: "0.00s", "+1.50s", "-0.20s"
            const label = `${seconds >= 0 ? "+" : ""}${seconds.toFixed(4)}s`;

            // Draw Tick
            ctx.fillStyle = "#555";
            ctx.fillRect(x, topOfAxis, 1, 5);

            // Draw Label
            ctx.fillStyle = "#aaa";
            if (i === 0) ctx.textAlign = "left";
            else if (i === NUM_TICKS) ctx.textAlign = "right";
            else ctx.textAlign = "center";

            ctx.fillText(label, x, topOfAxis + Y_OFFSET / 2);
        }
        ctx.restore();
    };

    const handleMouseMove = (e: ReactMouseEvent) => {
        const rect = canvasRef.current!.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        let found = null;
        for (const [key, value] of drawnShapeMap.current) {
            const [x1, y1, x2, y2] = key.split(",").map(Number);
            if (mouseX >= x1 && mouseX <= x2 && mouseY >= y1 && mouseY <= y2) {
                found = value;
                break;
            }
        }
        setInspectedFunction(found);
    };

    // KEYBOARD CONTROLS (WASD)
    // KEYBOARD CONTROLS (WASD + QE)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (
                ["INPUT", "TEXTAREA"].includes(
                    (e.target as HTMLElement).tagName
                )
            )
                return;

            const { zoom, offsetTime } = viewState.current;
            if (!containerRef.current) return;

            const width = containerRef.current.clientWidth;
            const currentVisibleTime = BigInt(Math.floor(width / zoom));

            // "Current Time" is the center of the screen
            const centerTime = offsetTime + currentVisibleTime / 2n;

            const panStep = BigInt(
                Math.floor(Number(currentVisibleTime) * 0.15)
            );
            const zoomFactor = 1.2;

            switch (e.key.toLowerCase()) {
                // --- MOVEMENT ---
                case "a": // Pan Left
                    viewState.current.offsetTime -= panStep;
                    break;
                case "d": // Pan Right
                    viewState.current.offsetTime += panStep;
                    break;

                // --- ZOOM ---
                case "w": {
                    // Zoom In
                    let newZoom = zoom * zoomFactor;
                    if (newZoom > MAX_ZOOM) newZoom = MAX_ZOOM;
                    viewState.current.zoom = newZoom;
                    // Recalculate offset to keep center stable
                    viewState.current.offsetTime =
                        centerTime - BigInt(Math.floor(width / newZoom / 2));
                    break;
                }
                case "s": {
                    // Zoom Out
                    let newZoom = zoom / zoomFactor;
                    if (newZoom < MIN_ZOOM) newZoom = MIN_ZOOM;
                    viewState.current.zoom = newZoom;
                    viewState.current.offsetTime =
                        centerTime - BigInt(Math.floor(width / newZoom / 2));
                    break;
                }

                // --- JUMP NAVIGATION ---
                case "q": {
                    // Jump to Previous Trace
                    // Find the last trace that started before our current center point
                    let targetTrace = null;
                    // Iterate backwards (assuming traces is sorted by time)
                    for (let i = traces.length - 1; i >= 0; i--) {
                        if (BigInt(traces[i].startTime) < centerTime) {
                            targetTrace = traces[i];
                            break;
                        }
                    }

                    if (targetTrace) {
                        // Center the view on this trace's start time
                        const targetTime = BigInt(targetTrace.startTime);
                        viewState.current.offsetTime =
                            targetTime - currentVisibleTime / 2n;
                    }
                    break;
                }

                case "e": {
                    // Jump to Next Trace
                    // Find the first trace that starts after our current center point
                    let targetTrace = null;
                    for (let i = 0; i < traces.length; i++) {
                        if (BigInt(traces[i].startTime) > centerTime) {
                            targetTrace = traces[i];
                            break;
                        }
                    }

                    if (targetTrace) {
                        // Center the view on this trace's start time
                        const targetTime = BigInt(targetTrace.startTime);
                        viewState.current.offsetTime =
                            targetTime - currentVisibleTime / 2n;
                    }
                    break;
                }

                default:
                    return;
            }

            requestAnimationFrame(draw);
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [traces]); // Added traces to dependency so Q/E can access the data

    // Resize Observer
    useEffect(() => {
        if (!containerRef.current) return;
        const resizeObserver = new ResizeObserver(() =>
            requestAnimationFrame(draw)
        );
        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, [traces]);

    return (
        <div
            ref={containerRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                minHeight: "400px",
                backgroundColor: "#1e1e1e",
                overflow: "hidden",
                cursor: "default",
            }}
        >
            <canvas
                ref={canvasRef}
                onMouseMove={handleMouseMove}
                style={{
                    display: "block",
                    touchAction: "none",
                }}
            />
            {inspectedFunction && (
                <Tooltip inspectedFunction={inspectedFunction} />
            )}

            {traces.length > 0 ? (
                <div className="absolute top-2 left-2 rounded bg-black/50 px-2 py-1 text-xs text-white/50 pointer-events-none">
                    WASD to Move • Q/E to Jump Trace
                </div>
            ) : (
                ""
            )}
        </div>
    );
}
