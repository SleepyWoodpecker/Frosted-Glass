import { ArrowLeft, ArrowRight, RotateCcw, Clock3 } from "lucide-react";
import {
    TraceTypes,
    type TraceEntryEnter,
    type TraceEntryExit,
    type TraceEntryRestart,
} from "../../types";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Badge } from "../ui/badge";
import { toast } from "sonner";
import { useRef, type RefObject } from "react";

interface ExecutionLogProps {
    executionLog: Array<TraceEntryEnter | TraceEntryExit | TraceEntryRestart>;
}

export default function ExecutionLog({ executionLog }: ExecutionLogProps) {
    const seenLogsRef = useRef<Set<string>>(new Set());
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className="rounded-md bg-blue-500/10 p-1.5 text-blue-400">
                        <Clock3 className="h-4 w-4" />
                    </span>
                    <div>
                        <h2 className="text-sm font-semibold tracking-tight">
                            Trace log
                        </h2>
                        <p className="text-xs text-muted-foreground">
                            Real-time execution events and call stack.
                        </p>
                    </div>
                </div>
                {executionLog.length > 0 && (
                    <Badge className="gap-1 bg-slate-900 text-xs text-slate-200">
                        {executionLog.length} events
                    </Badge>
                )}
            </CardHeader>
            <CardContent>
                {executionLog.length === 0 ? (
                    <div className="flex h-24 items-center justify-center rounded-md border border-dashed border-border bg-slate-900/40 text-xs text-muted-foreground">
                        <span className="mr-2 text-slate-500">
                            <Clock3 className="h-4 w-4" />
                        </span>
                        Waiting for execution events...
                    </div>
                ) : (
                    <div className="max-h-[calc(100vh-260px)] space-y-2 overflow-y-auto pr-1">
                        {executionLog.map((sample) => {
                            return (
                                <ExecutionLogCard
                                    entry={sample}
                                    key={`${sample.packetId}`}
                                    seenSet={seenLogsRef}
                                />
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

interface ExecutionLogCardProps {
    entry: TraceEntryEnter | TraceEntryExit | TraceEntryRestart;
    seenSet: RefObject<Set<string>>;
}

function ExecutionLogCard({ entry, seenSet }: ExecutionLogCardProps) {
    let dispEl = <div></div>;

    if (entry.traceType === TraceTypes.ENTER) {
        const {
            coreId,
            timestamp,
            argCount,
            funcArgs,
            funcName,
            traceId,
            funcCallId,
        } = entry;

        dispEl = (
            <div className="flex items-start justify-between w-full gap-4 p-4 border rounded-lg border-border bg-card">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className="text-yellow-400 mt-0.5 shrink-0 self-center">
                        <ArrowLeft className="h-6 w-6" />
                    </span>
                    <div className="flex flex-col gap-2 items-center justify-center">
                        <Badge className="px-3 py-1 shrink-0">CALL</Badge>

                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatMicroTo24HourLocale(timestamp)}
                        </div>
                    </div>
                    <div className="flex flex-col">
                        <code className="bg-muted text-muted-foreground px-2 py-1 rounded-md text-sm">
                            {funcName}
                        </code>
                        <p className="text-xs text-muted-foreground/80 mt-1">
                            Trace #{traceId} · Call #{funcCallId}
                        </p>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="flex flex-row items-center gap-1 whitespace-nowrap">
                        <p className="text-xs text-muted-foreground/80">
                            Args:
                        </p>
                        <div className="bg-muted text-muted-foreground px-2 py-1 rounded-md text-xs">
                            [
                            {funcArgs
                                .slice(0, argCount)
                                .map((arg, idx, arr) => (
                                    <code key={idx} className="mx-0.5">
                                        {`${arg}${
                                            idx < arr.length - 1 ? "," : ""
                                        }`}
                                    </code>
                                ))}
                            ]
                        </div>
                    </div>
                    <div className="px-3 py-1 rounded-md border border-border text-xs whitespace-nowrap">
                        Core: {coreId}
                    </div>
                </div>
            </div>
        );
    } else if (entry.traceType === TraceTypes.EXIT) {
        const { coreId, timestamp, traceId, funcCallId, returnVal, funcName } =
            entry;
        dispEl = (
            <div className="flex items-start justify-between w-full gap-4 p-4 border rounded-lg border-border bg-card">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className="text-green-400 mt-0.5 shrink-0 self-center">
                        <ArrowRight className="h-6 w-6" />
                    </span>
                    <div className="flex flex-col gap-2 items-center justify-center">
                        <Badge className="px-3 py-1 shrink-0">RET</Badge>

                        <div className="text-xs text-muted-foreground whitespace-nowrap ml-1">
                            {formatMicroTo24HourLocale(timestamp)}
                        </div>
                    </div>
                    <div className="flex flex-col">
                        <code className="bg-muted text-muted-foreground px-2 py-1 rounded-md text-sm">
                            {funcName}
                        </code>
                        <p className="text-xs text-muted-foreground/80 mt-1">
                            Trace #{traceId} · Call #{funcCallId}
                        </p>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="flex flex-row items-center gap-1 whitespace-nowrap">
                        <p className="text-xs text-muted-foreground/80">
                            Return:
                        </p>
                        <div className="bg-muted text-muted-foreground px-2 py-1 rounded-md text-xs">
                            <code>{returnVal}</code>
                        </div>
                    </div>
                    <div className="px-3 py-1 rounded-md border border-border text-xs whitespace-nowrap">
                        Core: {coreId}
                    </div>
                </div>
            </div>
        );
    } else if (entry.traceType === TraceTypes.RESTART) {
        const { restartReason, timestamp, coreId } = entry;

        if (!seenSet.current.has(entry.packetId)) {
            toast("Board Restarted", {
                icon: <RotateCcw className="text-orange-500" />,
                style: {
                    background: "rgba(69, 26, 3, 0.8)", // bg-orange-950/20
                    color: "#e5e7eb",
                    border: "1px solid rgba(249, 115, 22, 0.5)", // border-orange-500/50
                    borderRadius: "12px",
                },
            });
        }

        dispEl = (
            <div className="flex items-start justify-between w-full gap-4 p-4 border rounded-lg border-orange-500/50 bg-orange-950/20 hover:bg-orange-950/30">
                <div className="flex gap-3 flex-1 min-w-0">
                    <span className="text-orange-400 mt-0.5 shrink-0 self-center">
                        <RotateCcw className="h-6 w-6" />
                    </span>
                    <div className="flex flex-col gap-2 items-center justify-center">
                        <Badge className="px-3 py-1 shrink-0">RESTART</Badge>

                        <div className="text-xs text-muted-foreground whitespace-nowrap ml-1">
                            {formatMicroTo24HourLocale(timestamp)}
                        </div>
                    </div>
                    <div className="flex flex-col">
                        <code className="bg-muted text-muted-foreground px-2 py-1 rounded-md text-sm">
                            {restartReason}
                        </code>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="px-3 py-1 rounded-md border border-border text-xs whitespace-nowrap">
                        Core: {coreId}
                    </div>
                </div>
            </div>
        );
    }

    seenSet.current.add(entry.packetId);
    return dispEl;
}

function formatMicroTo24HourLocale(nanosecondTimestamp: string) {
    const nano = BigInt(nanosecondTimestamp);
    const milliseconds = nano / BigInt(1000);
    const dateObj = new Date(Number(milliseconds));

    // Use 'en-GB' locale which defaults to 24-hour time (e.g., 14:00:00)
    // 'hour12: false' option can be specified for clarity
    const formattedTime = dateObj.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    });

    return formattedTime;
}
