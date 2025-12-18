export enum TraceTypes {
    ENTER = 0,
    EXIT = 1,
    PANIC = 2,
    RESTART = 3,
}

export type TraceEntryEnter = {
    traceType: TraceTypes.ENTER;
    coreId: number;
    timestamp: number;
    traceId: number;
    funcCallId: number;
    argCount: number;
    funcArgs: number[];
    funcName: string;
    packetId: string;
};

export type TraceEntryExit = {
    traceType: TraceTypes.EXIT;
    coreId: number;
    timestamp: number;
    traceId: number;
    funcCallId: number;
    returnVal: number;
    funcName: string;
    packetId: string;
};

export type TraceEntryPanic = {
    traceType: TraceTypes.PANIC;
    coreId: number;
    timestamp: number;
    traceId: number;
    funcCallId: number;
    faultingPC: number;
    exceptionReason: string;
    packetId: string;
};

export type TraceEntryRestart = {
    traceType: TraceTypes.RESTART;
    coreId: number;
    timestamp: number;
    restartReason: string;
    packetId: string;
};

export type TraceEntry =
    | TraceEntryEnter
    | TraceEntryExit
    | TraceEntryPanic
    | TraceEntryRestart;

export type TrackedTraceEntry = TraceEntry & {
    /**
     * Wall-clock time (in ms since epoch) when this trace
     * was received by the frontend. Used for time-windowed
     * visualizations like the execution graph.
     */
    receivedAt: number;
};
