'use client'

import { useState, useEffect } from 'react'

export default function ModeToggle() {
  const [mode, setMode] = useState<'beginner' | 'expert'>('beginner')

  useEffect(() => {
    const saved = localStorage.getItem('userMode') as 'beginner' | 'expert' | null
    if (saved) setMode(saved)
  }, [])

  const toggleMode = (newMode: 'beginner' | 'expert') => {
    setMode(newMode)
    localStorage.setItem('userMode', newMode)

    // expert-only 요소 토글
    document.querySelectorAll('.expert-only').forEach((el) => {
      const elem = el as HTMLElement
      elem.style.display = newMode === 'expert' ? 'block' : 'none'
    })
  }

  useEffect(() => {
    // 초기 상태 적용
    document.querySelectorAll('.expert-only').forEach((el) => {
      const elem = el as HTMLElement
      elem.style.display = mode === 'expert' ? 'block' : 'none'
    })
  }, [mode])

  return (
    <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-3 mb-6">
      <div>
        <p className="text-sm font-semibold text-gray-800">
          {mode === 'beginner' ? '👶 초보자 모드' : '🔬 전문가 모드'}
        </p>
        <p className="text-xs text-gray-500">
          {mode === 'beginner' ? '핵심 정보 위주로 간단하게 보여드립니다' : '상세 스펙과 수치까지 모두 보여드립니다'}
        </p>
      </div>
      <div className="flex bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => toggleMode('beginner')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            mode === 'beginner' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
          }`}
        >
          초보자
        </button>
        <button
          onClick={() => toggleMode('expert')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            mode === 'expert' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
          }`}
        >
          전문가
        </button>
      </div>
    </div>
  )
}
