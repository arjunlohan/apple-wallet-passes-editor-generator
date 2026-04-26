import type { ZodError } from "zod";

export interface PassValidationIssue {
  path: string;
  message: string;
}

/**
 * Convert a Zod error to a flat `[{ path, message }]` array that the editor
 * can map onto form field names and the API route can return as JSON.
 */
export function formatZodError(error: ZodError): PassValidationIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

/**
 * Thrown by library code when input is structurally unusable after validation
 * (e.g., a required asset is missing at generation time).
 */
export class PassSpecError extends Error {
  readonly issues: PassValidationIssue[];

  constructor(message: string, issues: PassValidationIssue[] = []) {
    super(message);
    this.name = "PassSpecError";
    this.issues = issues;
  }
}
