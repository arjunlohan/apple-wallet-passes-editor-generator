import Link from "next/link";

export default function Home() {
  return (
    <main
      style={{
        display: "flex",
        flex: 1,
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        padding: 48,
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: 36, fontWeight: 700, maxWidth: 640, lineHeight: 1.1 }}>
        Open-source Apple Wallet Pass editor &amp; generator
      </h1>
      <p style={{ maxWidth: 560, opacity: 0.75, lineHeight: 1.5 }}>
        Design, preview, and download signed .pkpass files. What you see in the editor is
        what appears in Apple Wallet — no surprises.
      </p>
      <Link
        href="/editor"
        style={{
          display: "inline-flex",
          padding: "12px 24px",
          borderRadius: 999,
          background: "#2563eb",
          color: "white",
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        Open editor →
      </Link>
    </main>
  );
}
