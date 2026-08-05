/**
 * Public site shell: header, footer, floating WhatsApp button, AI search widget.
 * Applied to every page under the (site) route group (public + auth + account pages).
 */
"use client";

import { SiteHeader, SiteFooter } from "@/components/site-header";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { AiSearchWidget } from "@/components/ai-search-widget";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <WhatsAppButton />
      <AiSearchWidget />
    </div>
  );
}
