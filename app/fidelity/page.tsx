import { notFound } from "next/navigation";
import { PassPreview } from "@/lib/pass-preview";
import boardingPass from "@/tests/fixtures/passes/boardingPass.json";
import coupon from "@/tests/fixtures/passes/coupon.json";
import eventTicket from "@/tests/fixtures/passes/eventTicket.json";
import generic from "@/tests/fixtures/passes/generic.json";
import posterEventTicket from "@/tests/fixtures/passes/posterEventTicket.json";
import storeCard from "@/tests/fixtures/passes/storeCard.json";

/**
 * Dev-only fidelity harness page. Renders a single `<PassPreview/>`
 * against a known fixture at a fixed viewport so Playwright can
 * screenshot it deterministically. NOT a production feature — the page
 * is production-inert without the query param, but the whole route is
 * meant to be called by `scripts/fidelity/run.ts`.
 *
 * URL: /fidelity?style=eventTicket&face=front
 */

export const dynamic = "force-dynamic";

const FIXTURES = {
  boardingPass,
  coupon,
  eventTicket,
  generic,
  posterEventTicket,
  storeCard,
} as const;

type FixtureKey = keyof typeof FIXTURES;
const VALID_STYLES = new Set<FixtureKey>(Object.keys(FIXTURES) as FixtureKey[]);

export default async function FidelityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const style = Array.isArray(params.style) ? params.style[0] : params.style;
  const face = (Array.isArray(params.face) ? params.face[0] : params.face) === "back" ? "back" : "front";
  if (!style || !VALID_STYLES.has(style as FixtureKey)) return notFound();

  const fixture = FIXTURES[style as FixtureKey];

  return (
    <div
      data-fidelity-root
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "flex-start",
        background: "#0b0b0b",
        padding: 20,
        minHeight: "100vh",
      }}
    >
      <div data-fidelity-target>
        <PassPreview definition={fixture} face={face} />
      </div>
    </div>
  );
}
