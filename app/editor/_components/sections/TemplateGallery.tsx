"use client";
import { CheckIcon } from "lucide-react";
import { PASS_STYLES, type PassStyle } from "@/lib/pass-spec";
import { cn } from "@/lib/utils";

interface Props {
  style: PassStyle;
  onSelect: (next: PassStyle) => void;
}

interface TemplateCard {
  style: PassStyle;
  title: string;
  tagline: string;
  background: string;
  foreground: string;
  label: string;
  sampleHeader: string;
  sampleTitle: string;
  sampleDetail: string;
}

const CARDS: TemplateCard[] = [
  {
    style: "boardingPass",
    title: "Boarding pass",
    tagline: "Flights, trains, transit tickets",
    background: "#0f172a",
    foreground: "#f1f5f9",
    label: "#7dd3fc",
    sampleHeader: "GATE B14",
    sampleTitle: "SFO → JFK",
    sampleDetail: "SK 204",
  },
  {
    style: "coupon",
    title: "Coupon",
    tagline: "Offers, discounts, promo codes",
    background: "#3b0764",
    foreground: "#fdf4ff",
    label: "#e9d5ff",
    sampleHeader: "OFFER",
    sampleTitle: "20% OFF",
    sampleDetail: "MOON20",
  },
  {
    style: "eventTicket",
    title: "Event ticket",
    tagline: "Concerts, games, conferences",
    background: "#581c87",
    foreground: "#fdf4ff",
    label: "#e9d5ff",
    sampleHeader: "JUN 10 · 7 PM",
    sampleTitle: "BOT-anist Disco",
    sampleDetail: "GA · Sec 115",
  },
  {
    style: "storeCard",
    title: "Store card",
    tagline: "Loyalty cards, wallets, memberships",
    background: "#7c2d12",
    foreground: "#fff7ed",
    label: "#fed7aa",
    sampleHeader: "TIER · Gold",
    sampleTitle: "$42.50",
    sampleDetail: "1,240 pts",
  },
  {
    style: "generic",
    title: "Generic",
    tagline: "Employee IDs, access passes, other",
    background: "#1e293b",
    foreground: "#f8fafc",
    label: "#94a3b8",
    sampleHeader: "BADGE A123",
    sampleTitle: "Liz Chetelat",
    sampleDetail: "Staff Engineer",
  },
];

const BY_STYLE: Record<PassStyle, TemplateCard> = Object.fromEntries(
  CARDS.map((c) => [c.style, c]),
) as Record<PassStyle, TemplateCard>;

export function TemplateGallery({ style, onSelect }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {PASS_STYLES.map((s) => {
        const card = BY_STYLE[s];
        const selected = style === s;
        return (
          <button
            key={s}
            type="button"
            onClick={() => onSelect(s)}
            aria-pressed={selected}
            className={cn(
              "group/template relative flex flex-col overflow-hidden rounded-3xl text-left shadow-md ring-1 ring-foreground/5 transition-all outline-none hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-3 focus-visible:ring-ring/30 dark:ring-foreground/10",
              selected && "ring-2 ring-primary/70",
            )}
          >
            <div
              className="flex h-28 flex-col justify-between p-3"
              style={{ background: card.background, color: card.foreground }}
            >
              <div
                className="text-[10px] font-semibold uppercase tracking-[0.08em] opacity-90"
                style={{ color: card.label }}
              >
                {card.sampleHeader}
              </div>
              <div>
                <div className="text-base font-semibold leading-tight">{card.sampleTitle}</div>
                <div className="text-xs opacity-80">{card.sampleDetail}</div>
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-1 bg-card p-3">
              <div className="flex items-center justify-between gap-1">
                <div className="text-sm font-medium">{card.title}</div>
                {selected ? (
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <CheckIcon className="size-3" />
                  </span>
                ) : null}
              </div>
              <div className="text-xs text-muted-foreground">{card.tagline}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
