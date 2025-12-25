import type { Dispatch } from "react";
import { Zap } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../ui/select";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Badge } from "../ui/badge";

interface FlameGraphCoreOptionsProps {
    selectedOption: "Core 0" | "Core 1" | "Both";
    availableOptions: Array<"Core 0" | "Core 1" | "Both">;
    setOption: Dispatch<React.SetStateAction<"Core 0" | "Core 1" | "Both">>;
    className?: string;
}

export default function FlameGraphCoreOptions({
    selectedOption,
    availableOptions,
    setOption,
    className,
}: FlameGraphCoreOptionsProps) {
    return (
        <Card className={className}>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className="rounded-md bg-blue-500/10 p-1.5 text-blue-400">
                        <Zap className="h-4 w-4" />
                    </span>
                    <div>
                        <h2 className="text-sm font-semibold tracking-tight">
                            Trace Display
                        </h2>
                        <p className="text-xs text-muted-foreground">
                            Select which core(s) to visualize.
                        </p>
                    </div>
                </div>
                <Badge className="gap-1 bg-slate-900 text-xs text-slate-200">
                    {selectedOption}
                </Badge>
            </CardHeader>
            <CardContent>
                <Select
                    onValueChange={(val: "Core 0" | "Core 1" | "Both") =>
                        setOption(val)
                    }
                    value={selectedOption}
                >
                    <SelectTrigger className="w-48">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {availableOptions.map(
                            (option: "Core 0" | "Core 1" | "Both") => {
                                return (
                                    <SelectItem key={option} value={option}>
                                        {option}
                                    </SelectItem>
                                );
                            }
                        )}
                    </SelectContent>
                </Select>
            </CardContent>
        </Card>
    );
}
