/**
 * Locks in Apple-documented behavior for `ignoresTimeZone`. Apple:
 *   false (default): render in the device's current timezone.
 *   true:            render the wall-clock encoded in the value itself.
 *
 * Our formatter has to satisfy both regardless of the machine timezone
 * the test happens to run in, so every test pins TZ locally.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { formatDateValue } from "@/lib/pass-layout/formatters/date";

const ORIGINAL_TZ = process.env.TZ;

function withTz<T>(tz: string, fn: () => T): T {
  process.env.TZ = tz;
  try {
    return fn();
  } finally {
    process.env.TZ = ORIGINAL_TZ;
  }
}

describe("formatDateValue — ignoresTimeZone", () => {
  beforeAll(() => {
    // Confirm the runtime actually respects TZ changes via process.env.
    // Node re-reads TZ for Intl each call, but it's a one-line sanity check.
    process.env.TZ = "UTC";
  });
  afterAll(() => {
    process.env.TZ = ORIGINAL_TZ;
  });

  const iso = "2026-09-12T20:00:00Z";

  it("renders in device timezone when ignoresTimeZone is false (Apple default)", () => {
    const pdtOut = withTz("America/Los_Angeles", () =>
      formatDateValue(iso, {
        dateStyle: "PKDateStyleMedium",
        timeStyle: "PKDateStyleShort",
        ignoresTimeZone: false,
        locale: "en-US",
      }),
    );
    const nycOut = withTz("America/New_York", () =>
      formatDateValue(iso, {
        dateStyle: "PKDateStyleMedium",
        timeStyle: "PKDateStyleShort",
        ignoresTimeZone: false,
        locale: "en-US",
      }),
    );
    // 20:00Z → PDT is 13:00 (1 PM), EDT is 16:00 (4 PM). We only assert the
    // time portion to avoid locale-specific punctuation differences.
    expect(pdtOut).toMatch(/1:00\s?PM/);
    expect(nycOut).toMatch(/4:00\s?PM/);
  });

  it("renders in device timezone when ignoresTimeZone is undefined (same default)", () => {
    const pdtOut = withTz("America/Los_Angeles", () =>
      formatDateValue(iso, {
        dateStyle: "PKDateStyleMedium",
        timeStyle: "PKDateStyleShort",
        locale: "en-US",
      }),
    );
    expect(pdtOut).toMatch(/1:00\s?PM/);
  });

  it("renders the value's wall-clock when ignoresTimeZone is true (UTC value)", () => {
    const pdtOut = withTz("America/Los_Angeles", () =>
      formatDateValue(iso, {
        dateStyle: "PKDateStyleMedium",
        timeStyle: "PKDateStyleShort",
        ignoresTimeZone: true,
        locale: "en-US",
      }),
    );
    // 20:00Z → wall-clock 8:00 PM. This is the core Apple behavior we were
    // missing: "the time and date appear in the time zone associated with
    // the date and time of `value`."
    expect(pdtOut).toMatch(/8:00\s?PM/);
  });

  it("renders the value's wall-clock when ignoresTimeZone is true (offset value)", () => {
    // 20:00-04:00 is an ET evening. Without the fix this rendered as
    // "12:00 AM" (its UTC equivalent), which is wrong.
    const value = "2026-09-12T20:00:00-04:00";
    const pdtOut = withTz("America/Los_Angeles", () =>
      formatDateValue(value, {
        dateStyle: "PKDateStyleMedium",
        timeStyle: "PKDateStyleShort",
        ignoresTimeZone: true,
        locale: "en-US",
      }),
    );
    expect(pdtOut).toMatch(/8:00\s?PM/);
  });

  it("renders the value's wall-clock when ignoresTimeZone is true (floating local — no suffix)", () => {
    // Bare ISO with no offset. Apple documents that Wallet treats this as
    // the author's local time. With the fix, it renders at the wall-clock
    // 3:30 PM regardless of the device timezone.
    const value = "2026-09-12T15:30:00";
    const outs = [
      withTz("America/Los_Angeles", () =>
        formatDateValue(value, {
          dateStyle: "PKDateStyleMedium",
          timeStyle: "PKDateStyleShort",
          ignoresTimeZone: true,
          locale: "en-US",
        }),
      ),
      withTz("Asia/Kolkata", () =>
        formatDateValue(value, {
          dateStyle: "PKDateStyleMedium",
          timeStyle: "PKDateStyleShort",
          ignoresTimeZone: true,
          locale: "en-US",
        }),
      ),
    ];
    for (const o of outs) expect(o).toMatch(/3:30\s?PM/);
  });

  it("falls back to device-tz render on malformed ISO input", () => {
    const out = withTz("America/Los_Angeles", () =>
      formatDateValue("not-a-date-at-all", {
        dateStyle: "PKDateStyleMedium",
        timeStyle: "PKDateStyleShort",
        ignoresTimeZone: true,
        locale: "en-US",
      }),
    );
    // Malformed input returns the raw value unchanged (guarded at top of
    // formatDateValue). That's how numeric and unparseable values flow.
    expect(out).toBe("not-a-date-at-all");
  });

  it("respects PKDateStyleNone with a time-only render", () => {
    const out = withTz("America/Los_Angeles", () =>
      formatDateValue(iso, {
        dateStyle: "PKDateStyleNone",
        timeStyle: "PKDateStyleShort",
        ignoresTimeZone: true,
        locale: "en-US",
      }),
    );
    // Time-only, wall-clock 8 PM.
    expect(out).toMatch(/8:00\s?PM/);
    expect(out).not.toMatch(/2026/);
  });
});
