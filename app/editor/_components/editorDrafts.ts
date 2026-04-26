import { PASS_STYLES, type PassStyle } from "@/lib/pass-spec";
import { defaultValues, type EditorDefaultsOverride, type EditorFormValues } from "./defaults";

export type DraftStore = Record<PassStyle, EditorFormValues>;

export function seedDrafts(
  initialStyle: PassStyle,
  overrides: EditorDefaultsOverride,
): DraftStore {
  const out = {} as DraftStore;
  for (const style of PASS_STYLES) {
    out[style] = defaultValues(style, overrides);
  }
  out[initialStyle] = defaultValues(initialStyle, overrides);
  return out;
}

export function snapshotCurrent(
  drafts: DraftStore,
  currentStyle: PassStyle,
  snapshot: EditorFormValues,
): DraftStore {
  return { ...drafts, [currentStyle]: snapshot };
}

export function switchDraft(
  drafts: DraftStore,
  outgoing: EditorFormValues,
  nextStyle: PassStyle,
): { drafts: DraftStore; next: EditorFormValues } {
  const saved = { ...drafts, [outgoing.style]: outgoing };
  const base = saved[nextStyle];
  const next: EditorFormValues = {
    ...base,
    passTypeIdentifier: outgoing.passTypeIdentifier,
    teamIdentifier: outgoing.teamIdentifier,
    assets: outgoing.assets,
  };
  return { drafts: { ...saved, [nextStyle]: next }, next };
}
