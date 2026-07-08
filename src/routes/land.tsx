/**
 * Browse route for land for sale (/land).
 * Wraps BrowseSection with category="land" and sets purpose-specific SEO meta.
 */
import { createFileRoute } from "@tanstack/react-router";
import { BrowseSection } from "@/components/browse-section";

export const Route = createFileRoute("/land")({
  head: () => ({
    meta: [
      { title: "Land for Sale in Nigeria — AVR Homes" },
      { name: "description", content: "Buy verified land plots across Lagos, Abuja, Port Harcourt, Delta, Imo and Anambra with proper title documents — C of O, R of O and Governor's Consent." },
      { property: "og:title", content: "Land for Sale in Nigeria — AVR Homes" },
      { property: "og:description", content: "Verified land plots for sale across Nigeria." },
      { property: "og:url", content: "https://avrusthomes.com/land" },
    ],
    links: [{ rel: "canonical", href: "https://avrusthomes.com/land" }],
  }),
  component: () => (
    <div className="pt-6">
      <BrowseSection category="land" />
    </div>
  ),
});
