# Club Project - AI 기반 인터랙티브 애플리케이션 모음

이 저장소는 AI 기술을 활용한 두 가지 흥미로운 웹 애플리케이션을 포함하고 있습니다.

## 📁 프로젝트 구조

```
club-project/
├── 무궁화꽃/          # AI 술래와 함께하는 무궁화꽃이 피었습니다 게임
└── faceanalyze/       # AI 관상 분석 챗봇 애플리케이션
```

---

## 🎮 프로젝트 1: 무궁화꽃이 피었습니다 게임

AI 술래와 함께하는 실시간 웹캠 기반 무궁화꽃이 피었습니다 게임입니다.

### 🛠️ 사용 기술

- **Frontend**: HTML5, CSS3, JavaScript (ES6 모듈)
- **AI/ML**: 
  - TensorFlow.js
  - PoseNet (자세 감지)
  - Face-API.js (얼굴 인식)
- **WebAPI**: 
  - WebRTC (웹캠 액세스)
  - Canvas API (비디오 처리)

### ✨ 주요 기능

- 실시간 웹캠을 통한 플레이어 동작 감지
- AI 기반 자세 인식으로 움직임 판단
- 멀티플레이어 상태 관리
- 게임 결과 모달 및 재시작 기능

### 🚀 실행 방법

1. 프로젝트 디렉토리로 이동:
   ```bash
   cd 무궁화꽃
   ```

2. 로컬 서버 실행 (Python 사용):
   ```bash
   # Python 3
   python -m http.server 8000
   
   # 또는 Python 2
   python -m SimpleHTTPServer 8000
   ```

3. 브라우저에서 접속:
   ```
   http://localhost:8000
   ```

4. 웹캠 권한을 허용하고 "게임 시작" 버튼을 클릭하여 게임을 시작합니다.

---

## 🔮 프로젝트 2: AI 관상 분석 챗봇

Google Gemini AI를 활용한 실시간 관상 분석 및 음성 대화 애플리케이션입니다.

### 🛠️ 사용 기술

- **Frontend**: React 19, TypeScript, Vite
- **UI**: Tailwind CSS (인라인 스타일)
- **AI**: Google Gemini 2.5 Flash Preview API
- **음성**: 
  - Web Speech API (음성 인식)
  - Google Cloud Text-to-Speech API
- **WebAPI**: 
  - MediaDevices API (카메라 액세스)
  - Web Audio API (오디오 처리)

### ✨ 주요 기능

- 실시간 카메라를 통한 얼굴 캡처
- AI 기반 관상 분석 (성격, 연애운, 결혼 동반자, 예상 수명)
- 음성 인식을 통한 자연스러운 대화
- 텍스트 음성 변환으로 AI 응답을 음성으로 출력
- 반응형 모바일 친화적 UI

### 🚀 실행 방법

1. 프로젝트 디렉토리로 이동:
   ```bash
   cd faceanalyze
   ```

2. 의존성 설치:
   ```bash
   npm install
   ```

3. 환경 변수 설정:
   `.env` 파일을 생성하고 다음 API 키들을 설정하세요:
   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   VITE_TTS_API_KEY=your_google_cloud_tts_api_key_here
   ```

4. 개발 서버 실행:
   ```bash
   npm run dev
   ```

5. 브라우저에서 접속:
   ```
   http://localhost:5173
   ```

6. 카메라 및 마이크 권한을 허용하고 통화 버튼을 눌러 시작합니다.

### 📦 빌드 및 배포

프로덕션 빌드:
```bash
npm run build
```

빌드 미리보기:
```bash
npm run preview
```

---

## 🔧 개발 환경 요구사항

### 공통
- 최신 웹 브라우저 (Chrome, Firefox, Safari, Edge)
- HTTPS 환경 (WebRTC, MediaDevices API 사용을 위해)

### 무궁화꽃 게임
- 웹캠이 연결된 환경
- 로컬 HTTP 서버

### AI 관상 분석 챗봇
- Node.js 16+
- npm 또는 yarn
- Google Cloud Platform 계정 (TTS API 사용)
- Google AI Studio 계정 (Gemini API 사용)
- 카메라 및 마이크가 연결된 환경

---

## 📝 라이선스

이 프로젝트는 개인 학습 및 연구 목적으로 제작되었습니다.

## 🤝 기여하기

프로젝트 개선을 위한 이슈 제보나 풀 리퀘스트를 환영합니다!
