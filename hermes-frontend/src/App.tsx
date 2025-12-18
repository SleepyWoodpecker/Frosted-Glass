import { useEffect, useRef, useState } from "react";
import ExecutionLog from "./components/molecules/ExecutionLog";
import type { TrackedTraceEntry } from "./types";
import { Toaster } from "sonner";

const webSocketUrl = "ws://localhost:8080/data";

// NOTE: this should have a global state that it passes to all its children
function App() {
    const webSocketRef = useRef<WebSocket | null>(null);
    const [connected, setConnected] = useState(false);
    const [executionLogs, setExecutionLogs] = useState<TrackedTraceEntry[]>([]);

    useEffect(() => {
        document.documentElement.classList.add("dark");
        return () => {
            document.documentElement.classList.remove("dark");
        };
    });

    useEffect(() => {
        if (connected) {
            webSocketRef.current = new WebSocket(webSocketUrl);

            webSocketRef.current.onopen = (e) => {
                console.log("Connection with backend established");
            };

            webSocketRef.current.onmessage = (e) => {
                setExecutionLogs((executionLogs) => [
                    ...executionLogs,
                    { seen: false, ...JSON.parse(e.data) },
                ]);
            };
        } else {
            if (webSocketRef.current) {
                webSocketRef.current.close();
                webSocketRef.current = null;
            }
        }

        return () => {
            if (webSocketRef.current) {
                webSocketRef.current.close();
                webSocketRef.current = null;
            }
        };
    }, [connected]);
    return (
        <div className="p-8 min-h-screen">
            <div>
                Hello world
                <button
                    onClick={() => {
                        setConnected(true);
                    }}
                    className="bg-blue-400"
                >
                    Connect
                </button>
                <ExecutionLog executionLog={executionLogs} />
            </div>
            <Toaster position="top-center" />
        </div>
    );
}

export default App;
