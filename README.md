# 노트북 나와라 💻

> 노트북을 처음 사는 분도 이해하고 결정할 수 있는 가격비교 + AI 추천 플랫폼

## 기술 스택

- **Framework**: Next.js 15 (App Router, Server Components)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Database ORM**: Prisma 6
- **Database**: Vercel Postgres (Neon 기반, 무료 256MB)
- **Charts**: Recharts (dynamic import, lazy load)
- **AI/LLM**: Gemini Flash → Gemini Lite → Groq Llama 3.3 → 템플릿 폴백
- **Deployment**: Vercel Free Tier
- **Data Collection**: Naver Shopping API + GitHub Actions

---

## 빠른 시작

### 1. 저장소 클론 및 의존성 설치

```bash
cd notebook-nawara
npm install
```

### 2. 환경변수 설정

```bash
cp .env.example .env
```

`.env` 파일을 열어 아래 값을 채워주세요:

| 변수 | 설명 | 발급처 |
|------|------|--------|
| `DATABASE_URL` | PostgreSQL 연결 문자열 | Vercel Postgres / Supabase / Neon |
| `NAVER_CLIENT_ID` | 네이버 쇼핑 API 클라이언트 ID | [developers.naver.com](https://developers.naver.com) |
| `NAVER_CLIENT_SECRET` | 네이버 쇼핑 API 시크릿 | 위와 동일 |
| `GEMINI_API_KEY` | Google Gemini API 키 (무료) | [aistudio.google.com](https://aistudio.google.com/app/apikey) |
| `GROQ_API_KEY` | Groq API 키 (무료) | [console.groq.com](https://console.groq.com) |
| `CRON_SECRET` | 데이터 수집 API 보안 키 (임의 문자열) | 직접 생성 |

### 3. 데이터베이스 마이그레이션

```bash
npx prisma db push
```

### 4. 개발 서버 시작

```bash
npm run dev
```

`http://localhost:3000` 에서 확인할 수 있습니다.

---

## Vercel 배포

1. GitHub에 코드를 push합니다
2. Vercel에서 "Add New Project" → 저장소 연결
3. **Vercel Storage** 탭에서 Postgres 데이터베이스 생성 → 자동으로 `DATABASE_URL` 설정됨
4. Environment Variables에 나머지 키 추가
5. Deploy!

### GitHub Actions 설정

저장소 Settings → Secrets에 추가:
- `APP_URL`: Vercel 배포 URL (예: `https://notebook-nawara.vercel.app`)
- `CRON_SECRET`: `.env`의 `CRON_SECRET`과 동일한 값

---

## 주요 기능

### 가격 분석
- 실시간 최저가, 7/30/90일 평균가
- 가격 급락 감지 🔥
- 가격 추이 그래프 (Recharts, lazy load)
- 가성비 점수 (0-100)

### 성능 분석
- 용도별 적합도 점수: 게임, 작업, 학생, 영상편집, 휴대성
- 작업별 상세: 코딩, 영상편집, 포토샵, 3D
- 디스플레이/포트/최신기술 분석

### 게임 FPS 예측
- 11개 게임 (롤, 발로란트, 배그 등)
- 낮음/보통/높음 옵션별 예상 FPS
- GPU 티어 기반 룩업 테이블

### AI 추천 (LLM 멀티 폴백)
1. Gemini 2.5 Flash (1차)
2. Gemini 2.0 Flash-Lite (2차)
3. Groq Llama 3.3 70B (3차)
4. 내부 템플릿 (최후)
- DB 캐시 (7일/14일/1일)

### UI/UX
- 모바일 퍼스트 카드형 UI
- 초보자/전문가 모드 토글
- 추천 위저드 (예산→용도→우선순위→결과)
- 제품 비교 (2~3개)

---

## 프로젝트 구조

```
src/
├── app/                      # Next.js App Router
│   ├── page.tsx              # 홈페이지
│   ├── products/             # 상품 목록/상세
│   ├── recommend/            # AI 추천 위저드
│   ├── compare/              # 제품 비교
│   └── api/                  # API 라우트
│       ├── products/         # 상품 CRUD
│       ├── analysis/[id]/    # 전체 분석
│       ├── price-trend/[id]/ # 가격 추이
│       ├── game-estimate/[id]/ # 게임 FPS
│       ├── should-buy/[id]/  # 구매 판단
│       ├── recommend/        # AI 추천
│       ├── compare/          # 제품 비교
│       └── collect/          # 데이터 수집
├── components/
│   ├── ui/                   # 공용 컴포넌트
│   ├── product/              # 상품 컴포넌트
│   ├── charts/               # 차트 (lazy load)
│   └── recommend/            # 추천/비교 컴포넌트
├── lib/
│   ├── db.ts                 # Prisma 클라이언트
│   ├── naver-api.ts          # 네이버 쇼핑 API
│   ├── spec-parser.ts        # 스펙 파싱 (상품명 → 스펙)
│   ├── analysis/             # 분석 엔진
│   │   ├── price.ts          # 가격 분석
│   │   ├── performance.ts    # 성능 분석
│   │   └── game-fps.ts       # 게임 FPS 추정
│   ├── llm/                  # LLM 멀티 폴백
│   │   ├── client.ts         # 폴백 클라이언트
│   │   ├── gemini.ts         # Gemini 어댑터
│   │   ├── groq.ts           # Groq 어댑터
│   │   └── prompts.ts        # 프롬프트 템플릿
│   └── recommend/            # 추천 엔진
│       └── engine.ts
└── types/                    # TypeScript 타입
    ├── product.ts
    └── analysis.ts
```
