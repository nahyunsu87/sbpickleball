# SB Pickleball (Next.js + Supabase)

초보자도 바로 따라할 수 있게, **코드 수정 → GitHub 반영 → 배포 링크 확인** 흐름으로 정리했습니다.

## 1) 로컬 실행

```bash
npm install
npm run dev
```

- 브라우저에서 `http://localhost:3000` 접속
- 프로덕션 빌드 확인:

```bash
npm run build
npm run start
```

---

## 2) GitHub에 올리기 (처음 1회)

### 2-1. GitHub에서 빈 저장소 생성
예: `sbpickleball`

### 2-2. 이 프로젝트와 GitHub 연결

```bash
git remote add origin https://github.com/<YOUR_ID>/<YOUR_REPO>.git
git push -u origin work
```

> 이미 remote가 있으면 `git remote set-url origin ...` 사용

---

## 3) 실무처럼 작업하는 방법 (권장)

### 3-1. 새 기능 브랜치 만들기

```bash
git checkout -b feat/review-flow
```

### 3-2. 코드 수정 후 커밋

```bash
git add .
git commit -m "feat: 리뷰 작성 UI 개선"
```

### 3-3. 원격에 푸시

```bash
git push -u origin feat/review-flow
```

### 3-4. GitHub에서 PR 생성
- Compare & pull request 클릭
- 리뷰/테스트 통과 후 merge

---

## 4) 배포 링크를 즉시 확인하려면 (Vercel)

Next.js는 Vercel이 가장 간단합니다.

1. [https://vercel.com](https://vercel.com) 로그인
2. **New Project** → GitHub 저장소 선택
3. 환경변수 추가 후 Deploy

필수 환경변수 예시:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 동작 방식
- `main` 머지 시: 프로덕션 URL 자동 갱신
- PR 생성 시: **Preview URL** 자동 생성

즉, 모바일에서도 PR 링크만 열면 바로 변경 화면을 확인할 수 있습니다.

---

## 5) 모바일에서도 바로 수정/확인하고 싶을 때

### 방법 A (가장 쉬움)
- GitHub 모바일/웹에서 파일 편집
- Commit → PR 생성
- Vercel Preview 링크 확인

### 방법 B (고급)
- GitHub Codespaces에서 브라우저 개발
- Push 후 Preview 링크 확인

---

## 6) 자주 막히는 문제

### Q1. Push 버튼이 안 보여요
- 보통 `origin` remote 미연결 문제입니다.

```bash
git remote -v
```

출력이 비어 있으면 remote를 먼저 연결하세요.

### Q2. 브랜치 버튼이 안 보여요
- GitHub UI에서 저장소 권한/뷰 차이로 위치가 달라질 수 있습니다.
- 명령어로는 항상 생성 가능합니다:

```bash
git checkout -b <new-branch>
```

### Q3. 배포는 됐는데 데이터가 안 나와요
- Supabase 환경변수 누락 가능성이 큽니다.
- Vercel Project Settings → Environment Variables 확인

---

## 7) 이 프로젝트 주요 스크립트

- `npm run dev`: 개발 서버
- `npm run build`: 타입체크 포함 빌드
- `npm run start`: 빌드 결과 실행
