import type { LayoutTree } from "@/lib/pass-layout";
import styles from "../css/preview.module.css";
import { BarcodeBlock } from "./BarcodeBlock";

export interface PosterBackFaceProps {
  tree: LayoutTree;
}

/**
 * Back face for poster event tickets. Apple moves the barcode here — the
 * front face is ticket art, the back face carries scannable details.
 * Classic back fields and additionalInfoFields both render here.
 */
export function PosterBackFace({ tree }: PosterBackFaceProps) {
  const { colors } = tree;

  return (
    <div
      className={styles.backRoot}
      style={{ background: colors.background, color: colors.foreground }}
      aria-label="Pass back fields"
      data-scheme="posterEventTicket"
    >
      {tree.barcodes.length ? (
        <div className={styles.posterBackBarcode}>
          <BarcodeBlock barcode={tree.barcodes[0]} />
        </div>
      ) : null}

      {tree.back.sections.flatMap((section) =>
        section.fields.map((field) => (
          <div
            className={styles.backField}
            key={`${section.name}.${field.key}`}
            style={{ borderBottomColor: colors.label }}
            data-field-key={field.key}
            data-section={section.name}
          >
            {field.label ? (
              <div className={styles.backFieldLabel} style={{ color: colors.label }}>
                {field.label}
              </div>
            ) : null}
            <div
              className={styles.backFieldValue}
              style={{ color: colors.foreground, textAlign: field.cssTextAlign }}
              {...(field.sanitizedHtml
                ? { dangerouslySetInnerHTML: { __html: field.sanitizedHtml } }
                : { children: field.formattedValue })}
            />
          </div>
        )),
      )}
    </div>
  );
}
