import { ChevronLeft, ChevronRight } from "lucide-react"
import { useCallback, useRef, useState } from "react"

interface ScrollableSectionProps {
  children: React.ReactNode
  className?: string
  scrollAmount?: number
}

export function ScrollableSection({ children, className = "", scrollAmount = 300 }: ScrollableSectionProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const checkScroll = useCallback(() => {
    const el = ref.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  const scroll = useCallback((dir: "left" | "right") => {
    const el = ref.current
    if (!el) return
    el.scrollBy({ left: dir === "left" ? -scrollAmount : scrollAmount, behavior: "smooth" })
    setTimeout(checkScroll, 350)
  }, [scrollAmount, checkScroll])

  return (
    <div className="group relative">
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scroll("left")}
          aria-label="Scroll left"
          className="absolute -left-3 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-border bg-background p-2 shadow-[var(--shadow-elevated)] opacity-0 transition hover:bg-secondary group-hover:opacity-100 lg:grid place-items-center"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      <div
        ref={ref}
        onScroll={checkScroll}
        className={`overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
      >
        {children}
      </div>
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scroll("right")}
          aria-label="Scroll right"
          className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-border bg-background p-2 shadow-[var(--shadow-elevated)] opacity-0 transition hover:bg-secondary group-hover:opacity-100 lg:grid place-items-center"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
