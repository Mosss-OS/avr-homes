export function WhatsAppButton() {
  return (
    <a
      href="https://wa.me/2348000000000"
      target="_blank"
      rel="noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="group fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full shadow-[0_10px_30px_-6px_rgba(37,211,102,0.6)] transition hover:scale-105"
      style={{ background: "#25D366" }}
    >
      <svg viewBox="0 0 32 32" className="h-7 w-7 fill-white" aria-hidden="true">
        <path d="M19.11 17.27c-.27-.14-1.6-.79-1.85-.88-.25-.09-.43-.14-.61.14-.18.27-.7.88-.86 1.06-.16.18-.32.2-.59.07-.27-.14-1.14-.42-2.18-1.34-.81-.72-1.35-1.6-1.51-1.88-.16-.27-.02-.42.12-.55.12-.12.27-.32.41-.48.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.48-.07-.14-.61-1.47-.83-2.02-.22-.53-.45-.46-.61-.47l-.52-.01c-.18 0-.48.07-.73.34s-.96.94-.96 2.28.99 2.65 1.13 2.83c.14.18 1.95 2.97 4.72 4.16.66.28 1.17.45 1.57.58.66.21 1.26.18 1.74.11.53-.08 1.6-.65 1.83-1.28.23-.63.23-1.17.16-1.28-.07-.11-.25-.18-.52-.32zM16.02 5.33c-5.89 0-10.66 4.77-10.66 10.66 0 1.88.49 3.71 1.43 5.32L5.33 26.67l5.51-1.44a10.62 10.62 0 0 0 5.18 1.32h.01c5.88 0 10.65-4.77 10.65-10.66 0-2.85-1.11-5.52-3.12-7.53a10.58 10.58 0 0 0-7.54-3.13zm0 19.51c-1.59 0-3.14-.43-4.49-1.23l-.32-.19-3.27.86.87-3.19-.21-.33a8.83 8.83 0 0 1-1.35-4.7c0-4.89 3.98-8.86 8.87-8.86 2.37 0 4.59.92 6.26 2.6a8.78 8.78 0 0 1 2.6 6.26c0 4.89-3.98 8.87-8.87 8.87z"/>
      </svg>
      <span className="pointer-events-none absolute right-16 whitespace-nowrap rounded-md bg-foreground px-2.5 py-1.5 text-xs font-medium text-background opacity-0 shadow-lg transition group-hover:opacity-100">
        Chat with us on WhatsApp
      </span>
    </a>
  );
}
