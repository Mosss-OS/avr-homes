/**
 * Market insights placeholder page (/insights).
 * Announces the upcoming Lagos property price index, neighbourhood trends,
 * and yield data with a "Get notified" CTA.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { LineChart } from "lucide-react";

export const Route = createFileRoute("/insights")({
  head: () => ({
    meta: [
      { title: "Lagos Market Insights — AVR Homes" },
      { name: "description", content: "Lagos luxury real estate market insights, price trends, and neighborhood analysis — coming soon." },
      { property: "og:title", content: "Lagos Market Insights — AVR Homes" },
      { property: "og:description", content: "Stay informed with Lagos luxury real estate market insights, pricing trends, and neighborhood data." },
      { property: "og:url", content: "https://avrusthomes.com/insights" },
    ],
    links: [{ rel: "canonical", href: "https://avrusthomes.com/insights" }],
  }),
  component: Insights,
});

/** Placeholder insights page showing coming-soon message and a notify CTA. */
function Insights() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
        <LineChart className="h-6 w-6" />
      </div>
      <h1 className="mt-5 font-display text-4xl font-semibold">Market Insights — coming soon</h1>
      <p className="mt-3 text-muted-foreground">
        We're building Lagos's most detailed luxury property price index, neighbourhood trends, and yield data. Sign up to be notified first.
      </p>
      <Link to="/contact" className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
        Get notified
      </Link>
    </div>
  );
}
