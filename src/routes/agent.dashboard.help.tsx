import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Mail, Phone, MessageCircle, HelpCircle, FileText, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/agent/dashboard/help")({
  head: () => ({ meta: [{ title: "Help & Support — AVR Homes" }] }),
  component: HelpSupport,
});

const faqs = [
  { q: "How do I create a listing?", a: "Go to Listings → Create Listing and fill out the property details form." },
  { q: "How do I manage my subscription?", a: "Visit Subscriptions to view your current plan and upgrade options." },
  { q: "How do I track my referrals?", a: "The Referrals page shows your referral code, earnings, and leaderboard." },
  { q: "How do I contact buyers?", a: "Leads are sent to your dashboard when buyers inquire about your listings." },
  { q: "How do I update my profile?", a: "Go to Profile to edit your bio, photo, contact info, and social links." },
  { q: "Why is my listing not showing?", a: "Listings must be published. Check your subscription tier limits." },
];

function HelpSupport() {
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-semibold">Help & Support</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Get help with your agent account and find answers to common questions
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
            <Mail className="h-5 w-5 text-primary" />
            <h3 className="mt-3 font-medium">Email Us</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Send us an email and we&apos;ll respond within 24 hours
            </p>
            <a
              href="mailto:support@avrusthomes.com"
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              support@avrusthomes.com <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
            <Phone className="h-5 w-5 text-primary" />
            <h3 className="mt-3 font-medium">Call Us</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Speak with a support agent during business hours
            </p>
            <a
              href="tel:+2348000000000"
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              +234 800 000 0000 <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
            <MessageCircle className="h-5 w-5 text-primary" />
            <h3 className="mt-3 font-medium">Live Chat</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Chat with us in real time on our website
            </p>
            <a
              href="/contact"
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Open contact form <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <HelpCircle className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-semibold">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <details
                key={idx}
                className="group rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]"
              >
                <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-sm font-medium">
                  {faq.q}
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground transition group-open:rotate-90" />
                </summary>
                <div className="border-t border-border px-5 py-3 text-sm text-muted-foreground">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-muted/30 p-6 text-center">
          <h3 className="font-display text-base font-semibold">Still need help?</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Visit our contact page to send a detailed message and we&apos;ll get back to you.
          </p>
          <a
            href="/contact"
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition"
          >
            Contact Us <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </DashboardLayout>
  );
}
