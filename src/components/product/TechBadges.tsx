interface TechFeaturesProps {
  features: {
    wifi7: boolean
    wifi6e: boolean
    wifi6: boolean
    ddr5: boolean
    pcieGen5: boolean
    pcieGen4: boolean
    npu: boolean
    oled: boolean
    thunderbolt4: boolean
    highlights: string[]
  }
}

export default function TechBadges({ features }: TechFeaturesProps) {
  if (!features.highlights.length) return null

  return (
    <div>
      <p className="text-xs text-gray-500 mb-2">✨ 최신 기술</p>
      <div className="flex flex-wrap gap-1.5">
        {features.highlights.map((h) => (
          <span
            key={h}
            className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-full font-medium"
          >
            {h}
          </span>
        ))}
      </div>
    </div>
  )
}
