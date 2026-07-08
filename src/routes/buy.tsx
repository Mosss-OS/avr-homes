/**
 * Browse route for homes for sale (/buy).
 * Wraps BrowseSection with category="buy" and sets purpose-specific SEO meta.
 */
import { createFileRoute } from "@tanstack/react-router";
import { BrowseSection } from "@/components/browse-section";

export const Route = createFileRoute("/buy")({
  head: () => ({
    meta: [
      { title: "Homes for Sale in Nigeria — AVR Homes" },
      { name: "description", content: "Buy verified homes across Lagos, Abuja, Port Harcourt, Delta, Imo and Anambra. Duplexes, apartments, villas and townhouses from trusted Nigerian realtors." },
      { property: "og:title", content: "Homes for Sale in Nigeria — AVR Homes" },
      { property: "og:description", content: "Verified homes for sale across Nigeria." },
      { property: "og:url", content: "https://avrusthomes.com/buy" },
    ],
    links: [{ rel: "canonical", href: "https://avrusthomes.com/buy" }],
  }),
  component: () => (
    <div className="pt-6">
      <BrowseSection category="buy" />
    </div>
  ),
});
