import type { LayoutTree } from "@/lib/pass-layout";
import styles from "../css/preview.module.css";

export interface BackFaceProps {
  tree: LayoutTree;
}

export function BackFace({ tree }: BackFaceProps) {
  const { colors } = tree;
  return (
    <div
      className={styles.backRoot}
      style={{ background: colors.background, color: colors.foreground }}
      aria-label="Pass back fields"
    >
      {tree.back.sections.flatMap((section) =>
        section.fields.map((field) => (
          <div
            className={styles.backField}
            key={`${section.name}.${field.key}`}
            style={{ borderBottomColor: colors.label }}
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
