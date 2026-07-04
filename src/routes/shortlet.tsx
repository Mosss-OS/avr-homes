import { createFileRoute } from "@tanstack/react-router";
import { BrowseSection } from "@/components/browse-section";

export const Route = createFileRoute("/shortlet")({
  head: () => ({
    meta: [
      { title: "Short-Let & Furnished Stays in Nigeria — AVR Homes" },
      { name: "description", content: "Book luxury short-let apartments and villas across Lagos, Abuja, Port Harcourt and more. Nightly stays in fully furnished homes." },
      { property: "og:title", content: "Short-Let & Furnished Stays in Nigeria — AVR Homes" },
      { property: "og:description", content: "Book short-let stays in verified furnished homes across Nigeria." },
      { property: "og:url", content: "https://avrusthomes.com/shortlet" },
    ],
    links: [{ rel: "canonical", href: "https://avrusthomes.com/shortlet" }],
  }),
  component: () => (
    <div className="pt-6">
      <BrowseSection category="shortlet" />
    </div>
  ),
});
