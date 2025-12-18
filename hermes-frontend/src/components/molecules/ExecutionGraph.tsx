import { useEffect, useMemo, useState } from "react";
import type { TrackedTraceEntry } from "../../types";
import { TraceTypes } from "../../types";
import { Card, CardContent, CardHeader } from "../ui/card";

interface ExecutionGraphProps {
    executionLog: TrackedTraceEntry[];
}

const WINDOW_MS = 2_000; // 2 seconds
const REFRESH_INTERVAL_MS = 400;
const MIN_SEGMENT_MS = 30; // minimum visual duration so very short calls are still visible

type Segment = {
    coreId: number;
    funcName: string;
    start: number;
    end: number;
    traceType: TraceTypes | "PANIC" | "RESTART";
    colorClass: string;
};

const FUNCTION_PALETTE = [
    "bg-cyan-400",
    "bg-emerald-400",
    "bg-violet-400",
    "bg-amber-400",
    "bg-pink-400",
    "bg-sky-400",
    "bg-lime-400",
    "bg-rose-400",
    "bg-fuchsia-400",
] as const;

export default function ExecutionGraph({ executionLog }: ExecutionGraphProps) {
    const [now, setNow] = useState<number>(() => Date.now());

    // Keep a ticking clock so the 2s window slides even when
    // no new traces arrive.
    useEffect(() => {
        const id = window.setInterval(() => {
            setNow(Date.now());
        }, REFRESH_INTERVAL_MS);

        return () => window.clearInterval(id);
    }, []);

    // Heavy transformation: compute call segments + legend from raw traces.
    // Runs only when executionLog changes (i.e., when new data arrives),
    // not on every timer tick.
    const segmentsResult = useMemo(() => {
        if (executionLog.length === 0) {
            return {
                segments: [] as Segment[],
                functionColorMap: new Map<string, string>(),
            };
        }

        // Oldest -> newest so we can pair ENTER/EXIT in order.
        const sorted = [...executionLog].sort(
            (a, b) => a.receivedAt - b.receivedAt
        );

        const openCalls = new Map<string, TrackedTraceEntry>();
        const segments: Segment[] = [];
        const functionColorMap = new Map<string, string>();

        const getColorForFunction = (name: string): string => {
            if (!functionColorMap.has(name)) {
                const index = functionColorMap.size % FUNCTION_PALETTE.length;
                functionColorMap.set(name, FUNCTION_PALETTE[index]);
            }
            return functionColorMap.get(name)!;
        };

        const makeKey = (
            coreId: number | undefined,
            traceId: number | undefined,
            funcCallId: number | undefined
        ) => `${coreId ?? "x"}-${traceId ?? "x"}-${funcCallId ?? "x"}`;

        for (const entry of sorted) {
            const hasCore = "coreId" in entry;
            const coreId = hasCore
                ? (entry as TrackedTraceEntry & { coreId?: number }).coreId ??
                  -1
                : -1;

            if (entry.traceType === TraceTypes.ENTER && hasCore) {
                const key = makeKey(
                    coreId,
                    (
                        entry as TrackedTraceEntry & {
                            traceId?: number;
                        }
                    ).traceId,
                    (
                        entry as TrackedTraceEntry & {
                            funcCallId?: number;
                        }
                    ).funcCallId
                );
                openCalls.set(key, entry);
            } else if (entry.traceType === TraceTypes.EXIT && hasCore) {
                const key = makeKey(
                    coreId,
                    (
                        entry as TrackedTraceEntry & {
                            traceId?: number;
                        }
                    ).traceId,
                    (
                        entry as TrackedTraceEntry & {
                            funcCallId?: number;
                        }
                    ).funcCallId
                );
                const startEntry = openCalls.get(key);
                const startTime = startEntry?.receivedAt ?? entry.receivedAt;

                const funcName =
                    (entry as TrackedTraceEntry & { funcName?: string })
                        .funcName ?? "unknown";
                const colorClass = getColorForFunction(funcName);

                segments.push({
                    coreId,
                    funcName,
                    start: startTime,
                    end: entry.receivedAt,
                    traceType: TraceTypes.EXIT,
                    colorClass,
                });

                openCalls.delete(key);
            } else if (entry.traceType === TraceTypes.PANIC && hasCore) {
                const funcName = "PANIC";
                const colorClass = "bg-red-500";
                segments.push({
                    coreId,
                    funcName,
                    start: entry.receivedAt,
                    end: entry.receivedAt + MIN_SEGMENT_MS,
                    traceType: "PANIC",
                    colorClass,
                });
            } else if (entry.traceType === TraceTypes.RESTART) {
                const funcName = "RESTART";
                const colorClass = "bg-orange-400";
                segments.push({
                    coreId: -1,
                    funcName,
                    start: entry.receivedAt,
                    end: entry.receivedAt + MIN_SEGMENT_MS,
                    traceType: "RESTART",
                    colorClass,
                });
            }
        }

        return { segments, functionColorMap };
    }, [executionLog]);

    const { cores, windowStart, windowEnd, legendItems } = useMemo(() => {
        const end = now;
        const start = end - WINDOW_MS;

        if (segmentsResult.segments.length === 0) {
            return {
                cores: [] as Array<[number, Segment[]]>,
                windowStart: start,
                windowEnd: end,
                legendItems: [] as Array<{ name: string; colorClass: string }>,
            };
        }

        const { segments, functionColorMap } = segmentsResult;

        // Filter to window and group per core.
        const byCore = new Map<number, Segment[]>();
        for (const seg of segments) {
            const segEnd = seg.end;
            const segStart = seg.start;

            if (segEnd < start || segStart > end) continue;

            const clippedStart = Math.max(segStart, start);
            const clippedEnd = Math.max(
                clippedStart + MIN_SEGMENT_MS,
                Math.min(segEnd, end)
            );

            if (!byCore.has(seg.coreId)) byCore.set(seg.coreId, []);
            byCore
                .get(seg.coreId)!
                .push({ ...seg, start: clippedStart, end: clippedEnd });
        }

        for (const traces of byCore.values()) {
            traces.sort((a, b) => a.start - b.start);
        }

        const coreEntries = Array.from(byCore.entries()).sort(
            ([a], [b]) => a - b
        );

        const legendItems = Array.from(functionColorMap.entries()).map(
            ([name, colorClass]) => ({ name, colorClass })
        );

        return {
            cores: coreEntries,
            windowStart: start,
            windowEnd: end,
            legendItems,
        };
    }, [now, segmentsResult]);

    const windowDuration = windowEnd - windowStart || WINDOW_MS;

    return (
        <Card className="h-full rounded-none border-0 bg-transparent">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                    <p className="text-sm font-medium text-slate-300">
                        Execution Graph
                    </p>
                    <p className="text-xs text-slate-500">
                        Real-time function call visualization (last 2s)
                    </p>
                </div>
                <div className="flex items-center gap-6 text-[10px] text-slate-400">
                    <span className="text-slate-500">Now - 20s</span>
                    <span className="text-slate-500">Now</span>
                </div>
            </CardHeader>
            <CardContent className="flex h-full flex-col gap-4 pb-3">
                <div className="flex-1 overflow-hidden rounded-md border border-slate-800 bg-slate-950/70 will-change-transform">
                    {cores.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-xs text-slate-500">
                            Waiting for traces...
                        </div>
                    ) : (
                        <div className="grid h-full grid-cols-[auto,1fr] gap-2">
                            <div className="flex flex-col gap-3 border-r border-slate-800 bg-slate-950/90 px-4 py-4 text-[11px] text-slate-300">
                                {cores.map(([coreId]) => (
                                    <div
                                        key={coreId}
                                        className="flex h-12 items-center font-medium"
                                    >
                                        Core {coreId}
                                    </div>
                                ))}
                            </div>
                            <div className="relative flex flex-col gap-3 px-4 py-4">
                                <div className="pointer-events-none absolute inset-0">
                                    <div className="h-full bg-linear-to-b from-slate-900/70 via-slate-950/90 to-slate-950" />
                                </div>
                                {cores.map(([coreId, traces]) => (
                                    <div
                                        key={coreId}
                                        className="relative flex h-16 items-center overflow-hidden rounded-xl bg-slate-900/60"
                                    >
                                        {traces.map((seg) => {
                                            const leftPct =
                                                ((seg.start - windowStart) /
                                                    windowDuration) *
                                                100;
                                            const widthPct =
                                                ((seg.end - seg.start) /
                                                    windowDuration) *
                                                100;

                                            const durationMs =
                                                seg.end - seg.start;
                                            const durationLabel =
                                                durationMs >= 1000
                                                    ? `${(
                                                          durationMs / 1000
                                                      ).toFixed(2)} s`
                                                    : `${durationMs.toFixed(
                                                          0
                                                      )} ms`;

                                            const startLabel = new Date(
                                                seg.start
                                            ).toLocaleTimeString(undefined, {
                                                hour12: false,
                                                hour: "2-digit",
                                                minute: "2-digit",
                                                second: "2-digit",
                                                fractionalSecondDigits: 2,
                                            });
                                            const endLabel = new Date(
                                                seg.end
                                            ).toLocaleTimeString(undefined, {
                                                hour12: false,
                                                hour: "2-digit",
                                                minute: "2-digit",
                                                second: "2-digit",
                                                fractionalSecondDigits: 2,
                                            });

                                            const tooltip = [
                                                `Function: ${seg.funcName}`,
                                                `Core: ${coreId}`,
                                                `Start: ${startLabel}`,
                                                `End: ${endLabel}`,
                                                `Duration: ${durationLabel}`,
                                            ].join("\n");

                                            return (
                                                <div
                                                    key={`${seg.funcName}-${seg.start}`}
                                                    className={`absolute flex h-12 items-center rounded-xl px-4 text-[12px] font-medium text-slate-900 shadow-lg shadow-slate-900/80 ${seg.colorClass}`}
                                                    style={{
                                                        left: `${leftPct}%`,
                                                        width: `${widthPct}%`,
                                                        minWidth: "4%",
                                                    }}
                                                    title={tooltip}
                                                >
                                                    <span className="truncate">
                                                        {seg.funcName}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}

                                {/* Scrolling time axis */}
                                <div className="mt-4 h-6 relative text-[10px] text-slate-500">
                                    <div className="absolute inset-x-0 top-1 h-px bg-slate-800" />
                                    {Array.from({ length: 5 }).map((_, i) => {
                                        const ratio = i / 4;
                                        const t =
                                            windowStart +
                                            windowDuration * ratio;
                                        const left = ratio * 100;
                                        const label = new Date(
                                            t
                                        ).toLocaleTimeString(undefined, {
                                            hour12: false,
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            second: "2-digit",
                                            fractionalSecondDigits: 1,
                                        });
                                        return (
                                            <div
                                                key={i}
                                                className="absolute flex flex-col items-center"
                                                style={{ left: `${left}%` }}
                                            >
                                                <div className="h-2 w-px bg-slate-700" />
                                                <span className="mt-1 whitespace-nowrap">
                                                    {label}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {legendItems.length > 0 && (
                    <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400">
                        <span className="mr-1 text-[11px] font-medium text-slate-300">
                            Function Legend
                        </span>
                        {legendItems.map((item) => (
                            <div
                                key={item.name}
                                className="flex items-center gap-1"
                            >
                                <span
                                    className={`h-2.5 w-4 rounded-sm border border-slate-900/60 ${item.colorClass}`}
                                />
                                <span>{item.name}</span>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
