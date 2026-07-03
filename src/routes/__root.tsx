import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { AiSearchWidget } from "@/components/ai-search-widget";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "@/components/ui/sonner";

const FAVICON = "https://res.cloudinary.com/dv0tt80vn/image/upload/v1782134894/AVRUST_LOGO_egadjg.jpg";

const SITE_URL = "https://avrusthomes.com";

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "RealEstateAgent",
  name: "AVR Homes",
  description: "Lagos luxury real estate marketplace connecting buyers and diaspora investors with verified realtors.",
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
    telephone: "+234-XXX-XXX-XXXX",
    contactType: "customer service",
    email: "hello@avrhomes.ng",
  },
  sameAs: [
    "https://instagram.com/avrhomes.ng",
    "https://tiktok.com/@avrhomes",
    "https://linkedin.com/company/avr-homes",
  ],
};

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">The page you're looking for doesn't exist or has been moved.</p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">Go home</Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => { reportLovableError(error, { boundary: "tanstack_root_error_component" }); }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-xl font-semibold">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">Something went wrong. You can try refreshing or head back home.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset(); }}
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">Try again</button>
          <a href="/" className="inline-flex items-center justify-center rounded-full border border-input bg-background px-5 py-2.5 text-sm font-medium hover:bg-accent">Go home</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "AVR Homes — Lagos Verified Luxury Property" },
      { name: "description", content: "Buy, rent or invest in verified luxury properties across Lagos. AVR Homes connects serious buyers with professional realtors across Lekki, Ikoyi, Victoria Island and Eko Atlantic." },
      { property: "og:title", content: "AVR Homes — Lagos Verified Luxury Property" },
      { property: "og:description", content: "Buy, rent or invest in verified luxury properties across Lagos. AVR Homes connects serious buyers with professional realtors across Lekki, Ikoyi, Victoria Island and Eko Atlantic." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: FAVICON },
      { property: "og:url", content: SITE_URL },
      { property: "og:site_name", content: "AVR Homes" },
      { property: "og:locale", content: "en_NG" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "AVR Homes — Lagos Verified Luxury Property" },
      { name: "twitter:description", content: "Buy, rent or invest in verified luxury properties across Lagos." },
      { name: "twitter:image", content: FAVICON },
      { name: "twitter:site", content: "@avrhomes" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/jpeg", href: FAVICON },
      { rel: "apple-touch-icon", href: FAVICON },
      { rel: "canonical", href: SITE_URL },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        innerHTML: JSON.stringify(STRUCTURED_DATA),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div className="flex min-h-screen flex-col">
          <SiteHeader />
          <main className="flex-1"><Outlet /></main>
          <Toaster />
          <SiteFooter />
          <WhatsAppButton />
          <AiSearchWidget />
        </div>
      </AuthProvider>
    </QueryClientProvider>
  );
}
