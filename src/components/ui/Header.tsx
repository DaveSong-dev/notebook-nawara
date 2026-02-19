'use client'

import Link from 'next/link'
import { useState } from 'react'
import { MagnifyingGlassIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/products?q=${encodeURIComponent(searchQuery.trim())}`)
      setMobileOpen(false)
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* 로고 */}
          <Link href="/" className="flex items-center gap-2 font-bold text-blue-600 text-lg shrink-0">
            <span className="text-2xl">💻</span>
            <span className="hidden sm:block">노트북 나와라</span>
          </Link>

          {/* 검색바 (데스크톱) */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl mx-6">
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="노트북 이름, 브랜드로 검색..."
                className="w-full pl-4 pr-10 py-2 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="submit"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500"
              >
                <MagnifyingGlassIcon className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* 네비게이션 (데스크톱) */}
          <nav className="hidden md:flex items-center gap-1">
            <Link href="/products" className="px-3 py-1.5 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
              전체 노트북
            </Link>
            <Link href="/recommend" className="px-3 py-1.5 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
              AI 추천
            </Link>
            <Link href="/compare" className="px-3 py-1.5 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
              비교하기
            </Link>
          </nav>

          {/* 모바일 메뉴 버튼 */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-gray-500 hover:text-gray-700"
          >
            {mobileOpen ? <XMarkIcon className="w-5 h-5" /> : <Bars3Icon className="w-5 h-5" />}
          </button>
        </div>

        {/* 모바일 메뉴 */}
        {mobileOpen && (
          <div className="md:hidden pb-4 space-y-3">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="노트북 검색..."
                className="w-full pl-4 pr-10 py-2 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <MagnifyingGlassIcon className="w-4 h-4" />
              </button>
            </form>
            <nav className="flex flex-col gap-1">
              <Link href="/products" onClick={() => setMobileOpen(false)} className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
                전체 노트북
              </Link>
              <Link href="/recommend" onClick={() => setMobileOpen(false)} className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
                AI 추천
              </Link>
              <Link href="/compare" onClick={() => setMobileOpen(false)} className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
                비교하기
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
