# AVR Homes

> **Lagos Luxury, Verified.** — A premium real estate marketplace for luxury properties in Lagos, Nigeria.

AVR Homes connects serious buyers and diaspora investors with verified, professional realtors across Lagos's most prestigious neighborhoods. Built as a modern, full-stack web application, it offers a polished browsing experience with multi-currency pricing, an interactive map, and agent discovery—all tailored to the Nigerian luxury market.

---

## Features

### For Buyers & Renters
- **Property Listings** — Browse luxury properties for sale and rent in Lekki, Victoria Island, Ikoyi, Eko Atlantic, and Banana Island.
- **Interactive Map** — Explore listings on a custom SVG-based map of Lagos with hover previews.
- **Multi-Currency Pricing** — Toggle prices between NGN, USD, and GBP on every property card and detail page.
- **Mortgage Calculator** — Estimate monthly payments with adjustable deposit, interest rate, and loan term.
- **Save & Compare** — Bookmark properties and saved searches (powered by localStorage).
- **Agent Contact** — Reach agents directly via phone, email, or WhatsApp.
- **Diaspora Guide** — Dedicated resources for overseas Nigerians, covering virtual tours, verified titles, escrow protection, and multi-currency options.

### For Agents & Realtors
- **Agent Directory** — Professional profiles with listing counts, languages, and contact details.
- **Verified Badge** — Trust signals for verified agent profiles.
- **Recruitment Funnel** — Founding member early-access program for Lagos-based realtors.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [TanStack Start](https://tanstack.com/start/latest) (SSR, file-based routing) |
| **Routing** | [TanStack Router](https://tanstack.com/router/latest) |
| **UI** | React 19 + [shadcn/ui](https://ui.shadcn.com/) (Radix primitives, New York style) |
| **Styling** | Tailwind CSS v4 + OKLCH design tokens + `tw-animate-css` |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Charts** | [Recharts](https://recharts.org/) |
| **Forms** | react-hook-form + Zod + @hookform/resolvers |
| **State** | @tanstack/react-query |
| **Build** | Vite v7 |
| **Language** | TypeScript (strict mode) |
| **Package Manager** | [Bun](https://bun.sh/) |

---

## Project Structure

```
src/
├── assets/          # Static images
├── components/
│   ├── ui/          # shadcn/ui primitives (60+ components)
│   ├── property-card.tsx
│   ├── search-bar.tsx
│   ├── site-header.tsx    # Header & footer
│   └── whatsapp-button.tsx
├── hooks/           # Custom React hooks
├── lib/
│   ├── api/         # Server functions
│   ├── properties.ts       # Property & agent types + static data
│   ├── saved.ts            # localStorage helpers
│   └── utils.ts            # Tailwind class merging
├── routes/          # File-based TanStack Router routes
│   ├── index.tsx           # Homepage
│   ├── properties.tsx      # Listing grid
│   ├── properties.$id.tsx  # Property detail
│   ├── map.tsx             # Interactive map
│   ├── agents.tsx          # Agent directory
│   ├── about.tsx           # About page
│   ├── contact.tsx         # Contact page
│   ├── diaspora.tsx        # Diaspora investor guide
│   ├── insights.tsx        # Market insights (coming soon)
│   └── saved.tsx           # Saved properties
├── router.tsx
├── server.ts         # SSR server entry
├── start.ts          # TanStack Start instance
└── styles.css        # Tailwind + custom theme
```

---

## Getting Started

### Prerequisites
- [Bun](https://bun.sh/) v1.x or later
- Node.js v20+ (for VS Code tooling)

### Install & Run
```bash
bun install
bun run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production
```bash
bun run build
bun run preview
```

### Lint & Format
```bash
bun run lint
bun run format
```

---

## Status

This is a **frontend MVP / prototype**. All property and agent data is currently static (TypeScript arrays). Forms capture state locally but do not fire network requests. Authentication and a backend API are not yet implemented.

---

## License

All rights reserved.
