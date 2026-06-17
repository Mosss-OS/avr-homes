import { createFileRoute } from "@tanstack/react-router";
import { MapPin, Phone, Mail } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact AVR Homes — Lekki, Lagos" },
      { name: "description", content: "Get in touch with AVR Homes — visit our Lekki office, message us on WhatsApp, or send a property enquiry." },
    ],
    links: [{ rel: "canonical", href: "https://avr-homes.lovable.app/contact" }],
  }),
  component: Contact,
});

function Contact() {
  const [sent, setSent] = useState(false);
  const address = "2 Lanre Olumide Street, Idado Estate, Igbo-efon, Lekki, Lagos";
  const mapsSrc = `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "#C9A84C" }}>Contact</p>
      <h1 className="mt-1 font-display text-4xl font-semibold sm:text-5xl">Talk to AVR Homes</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">Visit our Lekki office, message us on WhatsApp, or send an enquiry and we'll get back to you within one business day.</p>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-5">
          <InfoRow icon={<MapPin className="h-4 w-4" />} title="Office">
            {address}
          </InfoRow>
          <InfoRow icon={<Phone className="h-4 w-4" />} title="WhatsApp">
            <a href="https://wa.me/2348000000000" className="hover:underline">+234 800 000 0000</a>
          </InfoRow>
          <InfoRow icon={<Mail className="h-4 w-4" />} title="Email">
            <a href="mailto:hello@avrhomes.ng" className="hover:underline">hello@avrhomes.ng</a>
          </InfoRow>

          <div className="overflow-hidden rounded-2xl border border-border">
            <iframe title="AVR Homes office" src={mapsSrc} className="h-72 w-full" loading="lazy" />
          </div>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); setSent(true); }}
          className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]"
        >
          <h2 className="font-display text-2xl font-semibold">Send us a message</h2>
          {sent ? (
            <div className="mt-4 rounded-lg bg-primary/10 p-4 text-sm text-primary">
              Thanks — we've received your message and will reply shortly.
            </div>
          ) : (
            <div className="mt-4 grid gap-3">
              <Field label="Name"><input required className="field" /></Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Email"><input required type="email" className="field" /></Field>
                <Field label="Phone"><input required type="tel" className="field" /></Field>
              </div>
              <Field label="Enquiry type">
                <select required className="field">
                  <option value="">Select…</option>
                  <option>Buy</option>
                  <option>Rent</option>
                  <option>Agent Enquiry</option>
                  <option>Developer Partnership</option>
                  <option>Media</option>
                </select>
              </Field>
              <Field label="Message"><textarea required rows={4} className="field resize-none" /></Field>
              <button type="submit" className="mt-2 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
                Send enquiry
              </button>
            </div>
          )}
        </form>
      </div>

      <style>{`.field{height:auto;padding:0.625rem 0.75rem;border-radius:0.5rem;border:1px solid var(--border);background:var(--background);font-size:0.875rem;outline:none;width:100%}.field:focus{border-color:var(--ring)}`}</style>
    </div>
  );
}

function InfoRow({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">{icon}</div>
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{title}</div>
        <div className="mt-0.5 text-sm font-medium text-foreground">{children}</div>
      </div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
