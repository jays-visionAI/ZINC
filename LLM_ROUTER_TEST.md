# LLM Router Test Guide

## 🎯 목표
`llm-router.js`가 정상적으로 작동하는지 확인합니다.
Mock Provider와 실제 API Provider (OpenAI/Anthropic) 모두 테스트합니다.

---

## 🧪 Test 1: Mock Provider 테스트

### 1. RuntimeProfile 생성 (Mock)
1. Admin Console > **Runtime Profiles** 메뉴로 이동
2. **"+ Create Profile"** 클릭
3. 다음 정보 입력:
   - **Profile ID**: `rtp_mock_test`
   - **Name**: Mock Test Profile
   - **Provider**: `custom` (Mock으로 사용)
   - **Model ID**: `mock-v1`
   - **Capabilities**: Chat 체크
   - **Cost Tier**: Cheap
4. **Save Profile** 클릭

### 2. 브라우저 콘솔에서 테스트
```javascript
// F12 -> Console 열기

// Test Mock Provider
const result = await callLLM('rtp_mock_test', {
    systemPrompt: 'You are a helpful assistant.',
    userPrompt: 'Create a cafe post for Instagram',
    jsonMode: true
});

console.log('Result:', result);
// Expected: Mock response with cafe content
```

**기대 결과**:
- `result.text`: JSON 형식의 Mock 응답
- `result.parsedJson`: 파싱된 객체
- `result.latencyMs`: 800~1200ms
- `result.provider`: "custom" (Mock)

---

## 🧪 Test 2: OpenAI Provider 테스트 (API Key 필요)

### 1. API Key 설정
```javascript
// 브라우저 콘솔에서
setAPIKey('openai', 'sk-proj-YOUR_API_KEY_HERE');
```

### 2. RuntimeProfile 생성 (OpenAI)
- **Profile ID**: `rtp_openai_test`
- **Provider**: `openai`
- **Model ID**: `gpt-4o-mini`

### 3. 테스트 실행
```javascript
const result = await callLLM('rtp_openai_test', {
    systemPrompt: 'You are a creative content writer.',
    userPrompt: 'Write a short Instagram caption about a weekend cafe visit.',
    temperature: 0.7,
    maxTokens: 100
});

console.log('OpenAI Result:', result);
```

**기대 결과**:
- 실제 GPT-4o-mini 응답
- `result.usage.totalTokens` > 0
- `result.provider`: "openai"

---

## 🧪 Test 3: Anthropic Provider 테스트 (API Key 필요)

### 1. API Key 설정
```javascript
setAPIKey('anthropic', 'sk-ant-YOUR_API_KEY_HERE');
```

### 2. RuntimeProfile 생성 (Anthropic)
- **Profile ID**: `rtp_claude_test`
- **Provider**: `anthropic`
- **Model ID**: `claude-3-5-sonnet-20241022`

### 3. 테스트 실행
```javascript
const result = await callLLM('rtp_claude_test', {
    systemPrompt: 'You are a professional content creator.',
    userPrompt: 'Generate a cafe review for social media.',
    temperature: 0.8,
    maxTokens: 150
});

console.log('Claude Result:', result);
```

---

## 🐛 트러블슈팅

**Q: "RuntimeProfile not found" 에러**
A: Admin > Runtime Profiles에서 해당 Profile ID가 존재하는지 확인하세요.

**Q: "API key not configured" 에러**
A: `setAPIKey('openai', 'YOUR_KEY')` 명령어로 키를 설정하세요.

**Q: CORS 에러 발생**
A: 브라우저에서 직접 API 호출 시 CORS 문제가 발생할 수 있습니다. 
   실제 운영 환경에서는 백엔드(Cloud Functions)를 통해 호출해야 합니다.

---

## ✅ 성공 기준
- Mock Provider로 응답 생성 성공
- (선택) OpenAI/Anthropic API 호출 성공
- Token 사용량 및 Latency 정상 기록
