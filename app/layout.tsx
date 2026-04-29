import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Public_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { cn } from "@/lib/utils";

const publicSans = Public_Sans({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://apple-wallet-passes-editor-generator.vercel.app";
const SITE_NAME = "Apple Wallet Pass Editor & Generator";
const SITE_DESCRIPTION =
  "Free, open-source editor and generator for Apple Wallet .pkpass files. Design boarding passes, event tickets, coupons, store cards, and generic passes with a pixel-perfect live preview — download signed .pkpass bundles ready to install on iPhone.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Free Online .pkpass Builder`,
    template: "%s · Apple Wallet Pass Editor",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: "Arjun Lohan", url: "https://github.com/arjunlohan" }],
  creator: "Arjun Lohan",
  publisher: "Arjun Lohan",
  generator: "Next.js",
  keywords: [
    "Apple Wallet",
    "pkpass",
    "pkpass editor",
    "pkpass generator",
    "Apple Wallet pass generator",
    "PassKit",
    "boarding pass generator",
    "event ticket generator",
    "coupon generator",
    "store card generator",
    "iPhone wallet pass",
    "iOS 26 poster event ticket",
    "NFC wallet pass",
    "open source wallet pass",
    "free pkpass builder",
    "pass.json editor",
    "signed pkpass",
  ],
  category: "developer tools",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Free Online .pkpass Builder`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    creator: "@arjunlohan",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0b" },
  ],
  width: "device-width",
  initialScale: 1,
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE_NAME,
  alternateName: "pkpass editor",
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Any (web-based)",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  license: "https://opensource.org/licenses/MIT",
  author: {
    "@type": "Person",
    name: "Arjun Lohan",
    url: "https://github.com/arjunlohan",
  },
  codeRepository: "https://github.com/arjunlohan/apple-wallet-passes-editor-generator",
  programmingLanguage: ["TypeScript", "React"],
  featureList: [
    "Live 1:1 preview of Apple Wallet passes",
    "Supports boardingPass, coupon, eventTicket, generic, storeCard styles",
    "QR, PDF417, Aztec, and Code128 barcodes",
    "iOS 26 poster event ticket layout",
    "NFC Value Added Services fields",
    "Signed .pkpass generation (PKCS#7 detached CMS)",
    "Inline Zod validation with sticky issue tray",
    "Auto-generated @1x/@2x/@3x image assets with dark-mode variants",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
        publicSans.variable,
      )}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Analytics />
      </body>
    </html>
  );
}
