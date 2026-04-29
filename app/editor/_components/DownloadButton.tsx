"use client";
import { DownloadIcon } from "lucide-react";
import { useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { PassValidationIssue } from "@/lib/pass-spec";
import { buildDefinitionFromForm } from "./buildDefinition";
import type { EditorFormValues } from "./defaults";
import type { EditorIssue } from "./validate";

const REQUIRED_ASSETS = ["icon.1x", "icon.2x", "icon.3x"] as const;

/** Payload the editor hands to the caller's generation backend. */
export interface GenerateRequest {
  definition: unknown;
  assets: Record<string, Record<string, string>>;
}

/**
 * Result the backend must return. `bytes` is the signed `.pkpass`;
 * `filename` is optional and only used as a UX hint for the download.
 * Return `{ error, issues? }` instead to surface a user-facing failure.
 */
export type GenerateResult =
  | { ok: true; bytes: Blob; filename?: string }
  | { ok: false; error: string; issues?: PassValidationIssue[] };

export type OnGenerate = (body: GenerateRequest) => Promise<GenerateResult>;

interface Props {
  issues: EditorIssue[];
  /**
   * Call into your backend to sign + return a `.pkpass`. If omitted, the
   * default POSTs JSON to `/api/passes/generate` and expects a blob back —
   * which is what this repo ships with. Consumer projects embedding the
   * editor should pass their own `onGenerate` instead so the editor isn't
   * coupled to that Next.js route.
   */
  onGenerate?: OnGenerate;
}

export function DownloadButton({ issues, onGenerate = defaultOnGenerate }: Props) {
  const { getValues, control } = useFormContext<EditorFormValues>();
  const assets = useWatch({ control, name: "assets" }) ?? {};
  const missingAssets = REQUIRED_ASSETS.filter((k) => !assets[k]);
  const assetsReady = missingAssets.length === 0;
  const hasIssues = issues.length > 0;

  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "error"; message: string; issues?: PassValidationIssue[] }
  >({ kind: "idle" });

  async function handleDownload(): Promise<void> {
    setState({ kind: "loading" });
    try {
      const values = getValues();
      if (!REQUIRED_ASSETS.every((k) => values.assets[k])) {
        setState({
          kind: "error",
          message: "Upload an icon in the Media section before downloading — Apple rejects passes without one.",
        });
        return;
      }
      const definition = buildDefinitionFromForm(values);
      const body: GenerateRequest = {
        definition,
        assets: groupAssets(values.assets),
      };
      const result = await onGenerate(body);
      if (!result.ok) {
        setState({ kind: "error", message: result.error, issues: result.issues });
        return;
      }
      const url = URL.createObjectURL(result.bytes);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename ?? `${values.serialNumber || "pass"}.pkpass`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setState({ kind: "idle" });
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : "download failed",
      });
    }
  }

  const loading = state.kind === "loading";
  const disabled = loading || !assetsReady || hasIssues;
  const tooltip = !assetsReady
    ? `Missing required assets: ${missingAssets.join(", ")}`
    : hasIssues
      ? `${issues.length} issue${issues.length === 1 ? "" : "s"} still open`
      : undefined;

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        size="lg"
        disabled={disabled}
        onClick={handleDownload}
        title={tooltip}
        className="rounded-full"
      >
        {loading ? <Spinner /> : <DownloadIcon data-icon="inline-start" />}
        {loading ? "Generating…" : "Download .pkpass"}
      </Button>
      {!assetsReady ? (
        <div className="text-xs text-muted-foreground">
          Upload an icon in the Media section to enable download.
        </div>
      ) : null}
      {state.kind === "error" ? (
        <Alert variant="destructive">
          <AlertTitle>Download failed</AlertTitle>
          <AlertDescription>
            <div>{state.message}</div>
            {state.issues?.length ? (
              <ul className="mt-2 flex flex-col gap-1">
                {state.issues.map((issue, i) => (
                  <li key={i} className="text-xs">
                    <code className="text-muted-foreground">
                      {issue.path || "(root)"}
                    </code>
                    : {issue.message}
                  </li>
                ))}
              </ul>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

/**
 * Default backend: POST the editor payload as JSON to `/api/passes/generate`
 * and expect either a `.pkpass` blob or a `{ error, issues? }` JSON body.
 * Consumer projects override this by passing `onGenerate` to `EditorShell`.
 */
const defaultOnGenerate: OnGenerate = async (body) => {
  const res = await fetch("/api/passes/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({ error: `HTTP ${res.status}` }))) as {
      error?: string;
      issues?: PassValidationIssue[];
    };
    return {
      ok: false,
      error: payload.error ?? `HTTP ${res.status}`,
      issues: payload.issues,
    };
  }
  const blob = await res.blob();
  return { ok: true, bytes: blob };
};

function groupAssets(flat: Record<string, string>): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  for (const [key, value] of Object.entries(flat)) {
    const [slot, variant] = key.split(".");
    if (!out[slot]) out[slot] = {};
    out[slot][variant] = value;
  }
  return out;
}
