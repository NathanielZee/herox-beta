"use client"

interface ContentToggleProps {
  activeTab: "anime" | "manga"
  onTabChange: (tab: "anime" | "manga") => void
}

export function ContentToggle({ activeTab, onTabChange }: ContentToggleProps) {
  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onTabChange("anime")}
          className={`text-sm font-medium transition-colors ${
            activeTab === "anime" ? "text-[#ff914d]" : "text-white/70"
          }`}
        >
          anime
        </button>
        <span className="text-white/50">|</span>
        <button
          onClick={() => onTabChange("manga")}
          className={`text-sm font-medium transition-colors ${
            activeTab === "manga" ? "text-[#ff914d]" : "text-white/70"
          }`}
        >
          manga
        </button>
      </div>
    </div>
  )
}
