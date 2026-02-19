'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function HeroSearch() {
  const [query, setQuery] = useState('')
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/products?q=${encodeURIComponent(query.trim())}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto">
      <div className="flex gap-2 bg-white rounded-2xl p-1.5 shadow-xl">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='예: "갤럭시북 i7", "RTX 4060", "LG 그램"'
          className="flex-1 pl-4 py-2.5 text-gray-900 text-sm bg-transparent focus:outline-none"
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shrink-0"
        >
          검색
        </button>
      </div>
    </form>
  )
}
