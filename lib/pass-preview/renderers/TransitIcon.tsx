import type { TransitType } from "@/lib/pass-spec";

/**
 * The small divider glyph Wallet renders between the origin and
 * destination primary fields on a boarding pass. Apple uses filled
 * SF-symbol–style marks scaled to the primary-field row height. We
 * approximate with hand-rolled SVGs so there's no font dependency.
 *
 * Rendered inline by FrontFace — NOT emitted into pass.json. This is a
 * preview-only adornment; Wallet draws the real icon from its own
 * system assets.
 */
export interface TransitIconProps {
  transitType: TransitType;
  color: string;
  size?: number;
}

export function TransitIcon({ transitType, color, size = 22 }: TransitIconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    "aria-hidden": true,
    style: { display: "block", flexShrink: 0 },
  } as const;
  switch (transitType) {
    case "PKTransitTypeAir":
      return (
        <svg {...common}>
          <path
            d="M22 15.5 14 11V6.5a2 2 0 1 0-4 0V11L2 15.5v1.6l8-2V19l-2.4 1.6V22L12 21l4.4 1V20.6L14 19v-3.9l8 2Z"
            fill={color}
          />
        </svg>
      );
    case "PKTransitTypeTrain":
      return (
        <svg {...common}>
          <path
            d="M12 2c-4 0-8 .5-8 4v9.5A3.5 3.5 0 0 0 7.5 19L6 20.5v.5h12v-.5L16.5 19a3.5 3.5 0 0 0 3.5-3.5V6c0-3.5-4-4-8-4Zm-4.5 14.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm3.5-5H6V7h5v4.5Zm2 0V7h5v4.5h-5Zm3.5 5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z"
            fill={color}
          />
        </svg>
      );
    case "PKTransitTypeBus":
      return (
        <svg {...common}>
          <path
            d="M4 16.5C4 17.9 4.6 19.1 5.5 20V22a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1h7v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-2c.9-.9 1.5-2.1 1.5-3.5V6c0-3.5-3.6-4-8-4s-8 .5-8 4v10.5ZM7.5 17a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm9 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3ZM18 11H6V6h12v5Z"
            fill={color}
          />
        </svg>
      );
    case "PKTransitTypeBoat":
      return (
        <svg {...common}>
          <path
            d="M20 21c-1.4 0-2.8-.5-4-1.2-2.4 1.6-5.6 1.6-8 0C6.8 20.5 5.4 21 4 21v2c1.4 0 2.8-.4 4-1.2 2.4 1.6 5.6 1.6 8 0 1.2.8 2.6 1.2 4 1.2v-2Zm-1.5-5L20 10.5 12.5 8v-.5a1.5 1.5 0 0 0-3 0V8L2 10.5 3.5 16H2l.5 2c2 0 3.9-.7 5.5-1.9 1.6 1.2 3.5 1.9 5.5 1.9s3.9-.7 5.5-1.9c1.6 1.2 3.5 1.9 5.5 1.9l.5-2h-1.5Z"
            fill={color}
          />
        </svg>
      );
    case "PKTransitTypeGeneric":
    default:
      return (
        <svg {...common}>
          <path
            d="M6 12h12M14 6l6 6-6 6"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      );
  }
}
