import type { LayoutField } from "@/lib/pass-layout";
import styles from "../css/preview.module.css";

export interface FieldRowProps {
  field: LayoutField;
  /** Controls the value font size. `large` for primary fields. */
  variant?: "default" | "large";
  labelColor: string;
  foregroundColor: string;
}

export function FieldRow({
  field,
  variant = "default",
  labelColor,
  foregroundColor,
}: FieldRowProps) {
  return (
    <div
      className={styles.fieldGroup}
      data-field-key={field.key}
      style={{ textAlign: field.cssTextAlign }}
    >
      {field.label ? (
        <div className={styles.fieldLabel} style={{ color: labelColor }}>
          {field.label}
        </div>
      ) : null}
      <div
        className={variant === "large" ? styles.fieldValueLarge : styles.fieldValue}
        style={{ color: foregroundColor }}
      >
        {field.formattedValue}
      </div>
    </div>
  );
}
