"use client";
import { useMemo, useRef, useState } from "react";
import { FormProvider, useForm, useFormContext, useWatch } from "react-hook-form";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { PassStyle } from "@/lib/pass-spec";
import { DownloadButton } from "./DownloadButton";
import { IssueTray } from "./IssueTray";
import { ImageSlotUploader } from "./ImageSlotUploader";
import { PreviewPanel } from "./PreviewPanel";
import { seedDrafts, switchDraft, type DraftStore } from "./editorDrafts";
import { defaultValues, type EditorDefaultsOverride, type EditorFormValues } from "./defaults";
import { AdvancedSection } from "./sections/AdvancedSection";
import { BarcodeEditor } from "./BarcodeEditor";
import { ContentSection } from "./sections/ContentSection";
import { IdentitySection } from "./sections/IdentitySection";
import { TemplateGallery } from "./sections/TemplateGallery";
import { validateEditor } from "./validate";

export interface EditorShellProps {
  defaults?: EditorDefaultsOverride;
}

const DEFAULT_OPEN = ["identity", "content", "media"];

export function EditorShell({ defaults }: EditorShellProps = {}) {
  const [drafts, setDrafts] = useState<DraftStore>(() => seedDrafts("generic", defaults ?? {}));
  const methods = useForm<EditorFormValues>({
    defaultValues: defaultValues("generic", defaults),
    mode: "onChange",
  });
  const formRef = useRef<HTMLFormElement>(null);

  function switchStyle(next: PassStyle): void {
    const current = methods.getValues();
    if (current.style === next) return;
    const result = switchDraft(drafts, current, next);
    setDrafts(result.drafts);
    methods.reset(result.next, { keepDefaultValues: false });
  }

  function focusField(formPath: string): void {
    if (!formRef.current) return;
    // Prefer an exact element whose name matches (most inputs via RHF register).
    const byName = formRef.current.querySelector<HTMLElement>(
      `[name="${CSS.escape(formPath)}"]`,
    );
    if (byName) {
      byName.scrollIntoView({ behavior: "smooth", block: "center" });
      byName.focus();
      return;
    }
    // Otherwise walk up the path looking for a data-field-path marker.
    let path = formPath;
    while (path) {
      const el = formRef.current.querySelector<HTMLElement>(
        `[data-field-path="${CSS.escape(path)}"]`,
      );
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        const firstInput = el.querySelector<HTMLElement>(
          "input, textarea, select, button",
        );
        firstInput?.focus();
        return;
      }
      const trimmed = path.replace(/\.[^.]+$/, "");
      if (trimmed === path) break;
      path = trimmed;
    }
  }

  return (
    <FormProvider {...methods}>
      <IssuesAndForm formRef={formRef} onSwitchStyle={switchStyle} onFocus={focusField} />
    </FormProvider>
  );
}

interface InnerProps {
  formRef: React.RefObject<HTMLFormElement | null>;
  onSwitchStyle: (next: PassStyle) => void;
  onFocus: (formPath: string) => void;
}

function IssuesAndForm({ formRef, onSwitchStyle, onFocus }: InnerProps) {
  const { control, getValues } = useFormContextSafe();
  // `useWatch` may return `undefined` on the first render (before RHF seeds
  // from defaults); fall back to `getValues()` so downstream components
  // never see undefined.
  const watched = useWatch({ control }) as EditorFormValues | undefined;
  const values: EditorFormValues = watched ?? getValues();
  const style: PassStyle = values.style;
  const issues = useMemo(() => validateEditor(values), [values]);

  return (
    <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-8 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(380px,auto)]">
      <form
        ref={formRef}
        onSubmit={(e) => e.preventDefault()}
        className="flex min-w-0 flex-col gap-6"
      >
        <section className="flex flex-col gap-3">
          <header className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Start here
            </span>
            <h2 className="font-heading text-2xl font-medium leading-tight">
              Pick a template
            </h2>
            <p className="max-w-prose text-sm text-muted-foreground">
              Each template is a complete pre-filled sample — edit what you want, everything else
              just works. Your edits are remembered per-style when you switch.
            </p>
          </header>
          <TemplateGallery style={style} onSelect={onSwitchStyle} />
        </section>

        <Accordion type="multiple" defaultValue={DEFAULT_OPEN} className="bg-card">
          <AccordionItem value="identity">
            <AccordionTrigger>Identity &amp; colors</AccordionTrigger>
            <AccordionContent>
              <IdentitySection style={style} />
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="content">
            <AccordionTrigger>Content fields</AccordionTrigger>
            <AccordionContent>
              <ContentSection style={style} />
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="media">
            <AccordionTrigger>Media (icon, logo, images)</AccordionTrigger>
            <AccordionContent>
              <ImageSlotUploader style={style} />
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="barcode">
            <AccordionTrigger>Barcode</AccordionTrigger>
            <AccordionContent>
              <BarcodeEditor />
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="advanced">
            <AccordionTrigger>
              Advanced
              {style === "eventTicket" ? " · Relevance · Poster layout" : " · Relevance"}
            </AccordionTrigger>
            <AccordionContent>
              <AdvancedSection style={style} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <IssueTray issues={issues} onFocus={onFocus} />
      </form>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
        <PreviewPanel />
        <p className="text-center text-xs text-muted-foreground">
          Tap the preview to flip front and back.
        </p>
        <DownloadButton issues={issues} />
      </aside>
    </div>
  );
}

function useFormContextSafe() {
  return useFormContext<EditorFormValues>();
}
