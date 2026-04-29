"use client";
import { AlertTriangleIcon, ChevronUpIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { EditorIssue } from "./validate";

interface Props {
  issues: EditorIssue[];
  onFocus?: (formPath: string) => void;
}

export function IssueTray({ issues, onFocus }: Props) {
  const [expanded, setExpanded] = useState(true);
  if (issues.length === 0) return null;

  return (
    <div className="rounded-3xl bg-destructive/5 ring-1 ring-destructive/30">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 rounded-3xl px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangleIcon className="size-4" />
          <span className="text-sm font-medium">
            {issues.length} issue{issues.length === 1 ? "" : "s"} to fix before download
          </span>
        </div>
        <ChevronUpIcon
          className={cn(
            "size-4 text-muted-foreground transition-transform",
            !expanded && "rotate-180",
          )}
        />
      </button>
      {expanded ? (
        <ScrollArea className="max-h-60 px-2 pb-3">
          <ul className="flex flex-col gap-1 px-2">
            {issues.map((issue, i) => (
              <li key={i}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto w-full justify-start whitespace-normal rounded-2xl px-2 py-1.5 text-left"
                  onClick={() => onFocus?.(issue.formPath || issue.rawPath)}
                >
                  <span className="flex flex-col items-start gap-0.5">
                    <span className="text-xs font-mono text-muted-foreground">
                      {issue.formPath || issue.rawPath || "(root)"}
                    </span>
                    <span className="text-xs text-foreground">{issue.message}</span>
                  </span>
                </Button>
              </li>
            ))}
          </ul>
        </ScrollArea>
      ) : null}
    </div>
  );
}
