import type { LayoutTree } from "@/lib/pass-layout";
import type { PassAssets } from "@/lib/pass-spec";
import styles from "../css/preview.module.css";
import { getSlotDataUrl } from "../assets";

export interface PosterFrontFaceProps {
  tree: LayoutTree;
  assets: PassAssets;
}

/**
 * iOS 26+ poster event ticket layout. The front face is a full-bleed
 * background (derived from the `background` slot) with a title block
 * stacked at the bottom — logo, event name, venue, date. The barcode
 * moves to the back face; this front NEVER renders it.
 *
 * `suppressHeaderDarkening: true` disables the top gradient overlay.
 */
export function PosterFrontFace({ tree, assets }: PosterFrontFaceProps) {
  const { colors, poster } = tree;
  // poster is always present at this call site (PassPreview gates it),
  // but we guard for type-narrowing.
  if (!poster) return null;

  const background = getSlotDataUrl(assets, "background");
  const strip = getSlotDataUrl(assets, "strip");
  const logo = getSlotDataUrl(assets, "logo");
  // Apple falls through: background → strip → flat color when neither is set.
  const heroUrl = background ?? strip;

  return (
    <div
      className={styles.posterRoot}
      style={{ background: colors.background, color: colors.foreground }}
      data-style="eventTicket"
      data-scheme="posterEventTicket"
    >
      {heroUrl ? (
        <div
          className={styles.posterHero}
          role="img"
          aria-label="poster background"
          style={{ backgroundImage: `url(${heroUrl})` }}
        />
      ) : null}

      {!poster.suppressHeaderDarkening ? (
        <div className={styles.posterGradient} aria-hidden="true" />
      ) : null}

      <div className={styles.posterContent}>
        <div className={styles.posterTopRow}>
          {logo ? (
            <img className={styles.posterLogo} src={logo} alt="logo" />
          ) : tree.logoText ? (
            <span className={styles.posterLogoText}>{tree.logoText}</span>
          ) : null}
          {poster.eventType === "PKEventTypeSports" &&
          poster.awayTeamAbbreviation &&
          poster.homeTeamAbbreviation ? (
            <span className={styles.posterMatchup}>
              {poster.awayTeamAbbreviation} @ {poster.homeTeamAbbreviation}
            </span>
          ) : null}
        </div>

        <div className={styles.posterTitleBlock}>
          <div className={styles.posterEventName}>{poster.eventName}</div>
          {poster.performerNames?.length ? (
            <div className={styles.posterPerformers}>
              {poster.performerNames.join(" · ")}
            </div>
          ) : null}
          <div className={styles.posterVenue}>
            <span>{poster.venueName}</span>
            {poster.venueRoom ? (
              <span className={styles.posterVenueRoom}>{poster.venueRoom}</span>
            ) : null}
          </div>
          <div className={styles.posterVenueRegion}>{poster.venueRegionName}</div>
          {poster.eventDateText ? (
            <div className={styles.posterDate}>
              <span>{poster.eventDateText}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
