import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const FAVICON = "https://res.cloudinary.com/dv0tt80vn/image/upload/v1782134894/AVRUST_LOGO_egadjg.jpg";
const SITE_URL = "https://avrusthomes.com";

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "RealEstateAgent",
  name: "AVR Homes",
  description:
    "Lagos luxury real estate marketplace connecting buyers and diaspora investors with verified realtors.",
  url: SITE_URL,
  logo: FAVICON,
  image: FAVICON,
  areaServed: [
    { "@type": "City", name: "Lekki" },
    { "@type": "City", name: "Victoria Island" },
    { "@type": "City", name: "Ikoyi" },
    { "@type": "City", name: "Eko Atlantic" },
    { "@type": "City", name: "Banana Island" },
  ],
  address: {
    "@type": "PostalAddress",
    streetAddress: "2 Lanre Olumide Street, Idado Estate, Igbo-efon",
    addressLocality: "Lekki",
    addressRegion: "Lagos",
    addressCountry: "NG",
  },
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+234-907-145-9878",
    contactType: "customer service",
    email: "info@avrusthomes.com",
  },
  sameAs: [
    "https://instagram.com/avrhomes.ng",
    "https://tiktok.com/@avrhomes",
    "https://linkedin.com/company/avr-homes",
  ],
};

export const metadata: Metadata = {
  title: "AVR Homes — Lagos Verified Luxury Property",
  description:
    "Buy, rent or invest in verified luxury properties across Lagos. AVR Homes connects serious buyers with professional realtors across Lekki, Ikoyi, Victoria Island and Eko Atlantic.",
  applicationName: "AVR Homes",
  icons: {
    icon: FAVICON,
    apple: FAVICON,
  },
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: "AVR Homes — Lagos Verified Luxury Property",
    description:
      "Buy, rent or invest in verified luxury properties across Lagos. AVR Homes connects serious buyers with professional realtors across Lekki, Ikoyi, Victoria Island and Eko Atlantic.",
    type: "website",
    url: SITE_URL,
    siteName: "AVR Homes",
    locale: "en_NG",
    images: [FAVICON],
  },
  twitter: {
    card: "summary_large_image",
    title: "AVR Homes — Lagos Verified Luxury Property",
    description: "Buy, rent or invest in verified luxury properties across Lagos.",
    images: [FAVICON],
    site: "@avrhomes",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body>
        <Providers>
          {children}
          <Toaster />
        </Providers>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
        />
      </body>
    </html>
  );
}
