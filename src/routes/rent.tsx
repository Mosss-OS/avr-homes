/**
 * Browse route for homes for rent (/rent).
 * Wraps BrowseSection with category="rent" and sets purpose-specific SEO meta.
 */
import { createFileRoute } from "@tanstack/react-router";
import { BrowseSection } from "@/components/browse-section";

export const Route = createFileRoute("/rent")({
  head: () => ({
    meta: [
      { title: "Homes for Rent in Nigeria — AVR Homes" },
      { name: "description", content: "Rent apartments, serviced homes and family residences across Lagos, Abuja, Port Harcourt, Delta, Imo and Anambra." },
      { property: "og:title", content: "Homes for Rent in Nigeria — AVR Homes" },
      { property: "og:description", content: "Verified homes for rent across Nigeria." },
      { property: "og:url", content: "https://avrusthomes.com/rent" },
    ],
    links: [{ rel: "canonical", href: "https://avrusthomes.com/rent" }],
  }),
  component: () => (
    <div className="pt-6">
      <BrowseSection category="rent" />
    </div>
  ),
});
