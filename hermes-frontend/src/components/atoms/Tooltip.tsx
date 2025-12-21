import type { TraceEntryCallStack } from "../../types";

interface TooltipProps {
    inspectedFunction: TraceEntryCallStack;
}

export default function Tooltip({ inspectedFunction }: TooltipProps) {
    return (
        <div
            className="absolute left-0.5 bottom-8 z-50 p-3 rounded-md border border-gray-700 bg-gray-900/60 backdrop-blur-lg shadow-xl text-xs font-mono text-gray-200 pointer-events-none"
            style={{
                // Position this based on your mouse coordinates
                // You might need to add a small offset (e.g., +15px) so it doesn't block the cursor
                minWidth: "200px",
            }}
        >
            {/* Header: Function Name */}
            <div className="mb-2 pb-2 border-b border-gray-700 flex items-center justify-between">
                <span className="font-bold text-white text-sm">
                    {inspectedFunction.funcName.replace(/\u0000/g, "")}
                </span>
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                    Depth: {inspectedFunction.depth}
                </span>
            </div>

            {/* Body: Metrics */}
            <div className="space-y-1">
                <div className="flex justify-between">
                    <span className="text-gray-500">Duration:</span>
                    <span className="text-emerald-400 font-semibold">
                        {/* Convert nanoseconds to milliseconds */}
                        {(
                            (Number(inspectedFunction.endTime) -
                                Number(inspectedFunction.startTime)) /
                            1_000
                        ).toFixed(3)}{" "}
                        ms
                    </span>
                </div>
            </div>

            {(inspectedFunction.argCount ||
                inspectedFunction.returnVal !== undefined) && (
                <div className="mt-2 pt-2 border-t border-gray-700/50 space-y-2">
                    {/* Arguments Section */}
                    {inspectedFunction.argCount && (
                        <div className="flex flex-row justify-between items-center">
                            <span className="text-gray-500 mb-0.5">
                                Arguments:
                            </span>
                            <code className="text-gray-300 bg-gray-800/50 p-1.5 rounded border border-gray-700/30">
                                [
                                {inspectedFunction.funcArgs
                                    .slice(0, inspectedFunction.argCount)
                                    .map((arg, idx) => {
                                        if (
                                            idx <
                                            inspectedFunction.argCount - 1
                                        ) {
                                            return `${arg}, `;
                                        }

                                        return `${arg}`;
                                    })}
                                ]
                            </code>
                        </div>
                    )}

                    {/* Return Value Section */}
                    {inspectedFunction.returnVal !== undefined && (
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500">Return Value:</span>
                            <code className="text-purple-300 font-semibold bg-purple-900/20 px-1.5 py-0.5 rounded border border-purple-500/30">
                                {inspectedFunction.returnVal}
                            </code>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
