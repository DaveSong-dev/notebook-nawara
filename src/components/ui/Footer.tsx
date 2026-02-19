import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 text-white font-bold text-lg mb-3">
              <span>💻</span>
              <span>노트북 나와라</span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              노트북을 처음 사는 분도<br />
              쉽게 이해하고 결정할 수 있는<br />
              의사결정 플랫폼
            </p>
          </div>

          <div>
            <h4 className="text-white text-sm font-semibold mb-3">서비스</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/products" className="hover:text-white transition-colors">전체 노트북</Link></li>
              <li><Link href="/recommend" className="hover:text-white transition-colors">AI 추천</Link></li>
              <li><Link href="/compare" className="hover:text-white transition-colors">제품 비교</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white text-sm font-semibold mb-3">용도별</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/products?usage=gaming" className="hover:text-white transition-colors">게임용 노트북</Link></li>
              <li><Link href="/products?usage=work" className="hover:text-white transition-colors">작업용 노트북</Link></li>
              <li><Link href="/products?usage=student" className="hover:text-white transition-colors">학생용 노트북</Link></li>
              <li><Link href="/products?usage=portable" className="hover:text-white transition-colors">휴대용 노트북</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white text-sm font-semibold mb-3">가격대별</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/products?maxPrice=700000" className="hover:text-white transition-colors">70만원 이하</Link></li>
              <li><Link href="/products?minPrice=700000&maxPrice=1000000" className="hover:text-white transition-colors">70~100만원</Link></li>
              <li><Link href="/products?minPrice=1000000&maxPrice=1500000" className="hover:text-white transition-colors">100~150만원</Link></li>
              <li><Link href="/products?minPrice=1500000" className="hover:text-white transition-colors">150만원 이상</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-6 space-y-2 text-xs text-gray-600">
          <p>© 2026 노트북 나와라. 가격 정보는 네이버쇼핑 API 기준입니다.</p>
          <p>스펙 정보는 AI가 모델명 기반으로 추정한 값이며, 실제 제품과 다를 수 있습니다. 정확한 사양은 제조사 공식 사이트를 확인하세요.</p>
          <p>가격은 실시간으로 변동될 수 있으며, 가격 급락 시 잘못된 상품이 연동되었을 가능성이 있으니 주의하세요.</p>
        </div>
      </div>
    </footer>
  )
}
