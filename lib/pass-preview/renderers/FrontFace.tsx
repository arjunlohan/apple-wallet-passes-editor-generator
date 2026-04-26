import type { LayoutSection, LayoutTree } from "@/lib/pass-layout";
import type { PassAssets, TransitType } from "@/lib/pass-spec";
import styles from "../css/preview.module.css";
import { getSlotDataUrl } from "../assets";
import { BarcodeBlock } from "./BarcodeBlock";
import { FieldRow } from "./FieldRow";
import { TransitIcon } from "./TransitIcon";

export interface FrontFaceProps {
  tree: LayoutTree;
  assets: PassAssets;
}

export function FrontFace({ tree, assets }: FrontFaceProps) {
  const { colors, style } = tree;

  const logo = getSlotDataUrl(assets, "logo");
  const strip = getSlotDataUrl(assets, "strip");
  const background = getSlotDataUrl(assets, "background");
  const thumbnail = getSlotDataUrl(assets, "thumbnail");
  const footer = getSlotDataUrl(assets, "footer");

  const header = sectionFields(tree.front.sections, "headerFields");
  const primary = sectionFields(tree.front.sections, "primaryFields");
  const secondary = sectionFields(tree.front.sections, "secondaryFields");
  const auxiliary = sectionFields(tree.front.sections, "auxiliaryFields");

  const hasStrip = strip != null && (style === "coupon" || style === "storeCard" || style === "eventTicket");
  const hasBackground = background != null && style === "eventTicket" && !hasStrip;

  return (
    <div
      className={styles.root}
      style={{ background: colors.background, color: colors.foreground }}
      data-style={style}
    >
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          {logo ? (
            <img className={styles.logoImg} src={logo} alt="logo" />
          ) : null}
          {tree.logoText ? (
            <span className={styles.logoText}>{tree.logoText}</span>
          ) : null}
        </div>
        {header.length ? (
          <div className={styles.headerFields}>
            {header.map((f) => (
              <FieldRow
                key={f.key}
                field={f}
                labelColor={colors.label}
                foregroundColor={colors.foreground}
              />
            ))}
          </div>
        ) : null}
      </div>

      {hasStrip ? (
        <div
          className={styles.strip}
          role="img"
          aria-label="strip image"
          style={{ backgroundImage: `url(${strip})` }}
        />
      ) : null}

      {hasBackground || thumbnail ? (
        <div className={styles.hero}>
          {hasBackground ? (
            <div
              className={styles.background}
              role="img"
              aria-label="background image"
              style={{ backgroundImage: `url(${background})` }}
            />
          ) : null}
          {thumbnail ? (
            <img className={styles.thumbnail} src={thumbnail} alt="thumbnail" />
          ) : null}
        </div>
      ) : null}

      {primary.length ? (
        <div className={styles.primary}>
          <div className={styles.primaryFields}>
            {primary.map((f, i) => (
              <PrimaryField
                key={f.key}
                tree={tree}
                field={f}
                index={i}
                count={primary.length}
              />
            ))}
          </div>
        </div>
      ) : null}

      {secondary.length ? (
        <div className={styles.row}>
          {secondary.map((f) => (
            <FieldRow
              key={f.key}
              field={f}
              labelColor={colors.label}
              foregroundColor={colors.foreground}
            />
          ))}
        </div>
      ) : null}

      {auxiliary.length ? (
        <div className={styles.row}>
          {auxiliary.map((f) => (
            <FieldRow
              key={f.key}
              field={f}
              labelColor={colors.label}
              foregroundColor={colors.foreground}
            />
          ))}
        </div>
      ) : null}

      {tree.barcodes.length ? <BarcodeBlock barcode={tree.barcodes[0]} /> : null}

      {footer ? (
        <div className={styles.footer}>
          <img className={styles.footerImg} src={footer} alt="footer" />
        </div>
      ) : null}
    </div>
  );
}

function sectionFields(sections: LayoutSection[], name: LayoutSection["name"]) {
  return sections.find((s) => s.name === name)?.fields ?? [];
}

/**
 * A primary field plus the transit-type glyph Wallet draws between the
 * two primary fields on a boarding pass. Rendering the glyph here (vs.
 * inline in FrontFace) keeps the JSX branchless at the call site and
 * ensures the icon lives in the same flex row as the fields so it
 * shares their vertical centering with the surrounding labels/values.
 */
function PrimaryField({
  tree,
  field,
  index,
  count,
}: {
  tree: LayoutTree;
  field: LayoutSection["fields"][number];
  index: number;
  count: number;
}) {
  const { colors, style } = tree;
  const transitType = tree.front.meta.transitType as TransitType | undefined;
  // Only boarding passes show the glyph, only between two primary fields,
  // and only after the first (so we render: [origin][icon][destination]).
  const showIcon =
    style === "boardingPass" && count >= 2 && index === 0 && transitType;

  return (
    <>
      <FieldRow
        field={field}
        variant="large"
        labelColor={colors.label}
        foregroundColor={colors.foreground}
      />
      {showIcon ? (
        <div className={styles.transitIcon} aria-hidden="true">
          <TransitIcon transitType={transitType} color={colors.foreground} />
        </div>
      ) : null}
    </>
  );
}
