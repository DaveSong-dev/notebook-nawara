import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import Header from '@/components/ui/Header'
import Footer from '@/components/ui/Footer'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: '노트북 나와라 - 노트북 가격비교 & AI 추천',
    template: '%s | 노트북 나와라',
  },
  description: '노트북을 처음 사는 분도 이해할 수 있는 가격비교, 성능분석, AI 추천 플랫폼. 실시간 최저가, 게임 FPS 예측, 용도별 분석까지.',
  keywords: ['노트북', '가격비교', '노트북 추천', '게임 노트북', '학생 노트북', '노트북 성능비교'],
  authors: [{ name: '노트북 나와라' }],
  creator: '노트북 나와라',
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: 'https://notebook-nawara.vercel.app',
    siteName: '노트북 나와라',
    title: '노트북 나와라 - 노트북 가격비교 & AI 추천',
    description: '노트북을 처음 사는 분도 이해할 수 있는 가격비교, 성능분석, AI 추천 플랫폼.',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '노트북 나와라',
    description: '노트북 가격비교 & AI 추천 플랫폼',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body className={`${geist.className} bg-gray-50 text-gray-900 antialiased`}>
        <Header />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
