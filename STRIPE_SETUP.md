# ZYNK Stripe 결제 시스템 설정 가이드

**버전**: 1.0  
**작성일**: 2024-12-09

---

## 1. 사전 요구사항

### 1.1 Stripe 계정
- [Stripe 회원가입](https://dashboard.stripe.com/register)
- 사업자 정보 입력 (라이브 모드 활성화 시 필요)

### 1.2 필요한 API 키
| 키 | 위치 | 용도 |
|----|------|------|
| Secret Key | API Keys | 서버측 (Cloud Functions) |
| Publishable Key | API Keys | 클라이언트측 (선택) |
| Webhook Secret | Webhooks | 웹훅 검증 |

---

## 2. Stripe 대시보드 설정

### 2.1 상품(Product) 생성

Stripe Dashboard → Products → Add product

| 상품 | 가격 | 결제 주기 |
|------|------|----------|
| ZYNK Starter | $19/월 | monthly |
| ZYNK Starter Yearly | $190/년 | yearly |
| ZYNK Pro | $49/월 | monthly |
| ZYNK Pro Yearly | $490/년 | yearly |
| ZYNK Enterprise | $199/월 | monthly |
| ZYNK Enterprise Yearly | $1990/년 | yearly |

### 2.2 Price ID 복사

상품 생성 후 각 가격의 ID를 복사합니다:
- `price_xxxxxxxxxxxxx` 형식

### 2.3 Webhook 설정

Stripe Dashboard → Developers → Webhooks → Add endpoint

**Endpoint URL**:
```
https://us-central1-zinc-c790f.cloudfunctions.net/stripeWebhook
```

**수신할 이벤트**:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

---

## 3. Firebase 환경 변수 설정

### 3.1 Firebase Functions 설정

```bash
firebase functions:config:set stripe.secret_key="sk_test_xxxxx"
firebase functions:config:set stripe.webhook_secret="whsec_xxxxx"
```

### 3.2 Price ID 설정 (선택)

```bash
firebase functions:config:set stripe.price_starter_monthly="price_xxxxx"
firebase functions:config:set stripe.price_starter_yearly="price_xxxxx"
firebase functions:config:set stripe.price_pro_monthly="price_xxxxx"
firebase functions:config:set stripe.price_pro_yearly="price_xxxxx"
firebase functions:config:set stripe.price_enterprise_monthly="price_xxxxx"
firebase functions:config:set stripe.price_enterprise_yearly="price_xxxxx"
```

### 3.3 설정 확인

```bash
firebase functions:config:get
```

---

## 4. Cloud Functions 구조

### 4.1 구현된 함수

| 함수 | 타입 | 설명 |
|------|------|------|
| `createCheckoutSession` | onCall | 결제 세션 생성 |
| `createCustomerPortal` | onCall | 구독 관리 포털 |
| `stripeWebhook` | onRequest | 웹훅 수신 |
| `getSubscriptionStatus` | onCall | 구독 상태 조회 |
| `cancelSubscription` | onCall | 구독 취소 |

### 4.2 웹훅 처리 이벤트

```javascript
// checkout.session.completed
→ 사용자 플랜 업그레이드, 크레딧 충전

// invoice.payment_succeeded
→ 월간 크레딧 리셋

// customer.subscription.deleted
→ 무료 플랜으로 다운그레이드

// invoice.payment_failed
→ 상태를 'past_due'로 변경
```

---

## 5. 테스트 모드

### 5.1 테스트 카드

| 번호 | 결과 |
|------|------|
| 4242 4242 4242 4242 | 성공 |
| 4000 0000 0000 9995 | 실패 (잔액 부족) |
| 4000 0000 0000 0341 | 카드 거부 |

**기타 정보**:
- 만료일: 미래 날짜 아무거나
- CVC: 아무 숫자 3자리
- 우편번호: 아무 숫자 5자리

### 5.2 Webhook 로컬 테스트

```bash
# Stripe CLI 설치
brew install stripe/stripe-cli/stripe

# 로그인
stripe login

# 웹훅 포워딩
stripe listen --forward-to localhost:5001/zinc-c790f/us-central1/stripeWebhook
```

---

## 6. 배포

### 6.1 Functions 배포

```bash
cd /Users/sangjaeseo/Antigravity/ZINC
firebase deploy --only functions
```

### 6.2 배포 후 확인

1. Stripe Dashboard에서 Webhook 엔드포인트 활성화 확인
2. 테스트 결제 진행
3. Firebase Console에서 로그 확인

---

## 7. Firestore 데이터 구조

### 7.1 사용자 문서 (users/{uid})

```javascript
{
  // 기본 정보
  email: "user@example.com",
  
  // 플랜 정보
  plan: "pro",  // free, starter, pro, enterprise
  credits: 2000,
  creditsUsedToday: 0,
  creditsUsedThisMonth: 0,
  
  // Stripe 정보
  stripeCustomerId: "cus_xxxxx",
  subscriptionId: "sub_xxxxx",
  subscriptionStatus: "active",  // active, past_due, canceled, trialing
  currentPeriodEnd: Timestamp,
  lastPaymentDate: Timestamp
}
```

---

## 8. 체크리스트

### 8.1 테스트 모드 완료
- [ ] 테스트 API 키 설정
- [ ] 테스트 상품/가격 생성
- [ ] 테스트 웹훅 설정
- [ ] 테스트 결제 성공 확인
- [ ] 크레딧 충전 확인
- [ ] 구독 취소 테스트

### 8.2 라이브 모드 활성화
- [ ] 사업자 정보 입력
- [ ] 라이브 API 키로 교체
- [ ] 라이브 웹훅 설정
- [ ] 라이브 상품/가격 생성
- [ ] 실제 결제 테스트 (1건)

---

## 9. 문제 해결

### 9.1 "No such customer" 에러
→ Stripe Customer가 생성되지 않음
→ 해결: 사용자가 처음 결제 시 자동 생성됨

### 9.2 웹훅이 작동하지 않음
→ 웹훅 시크릿이 올바른지 확인
→ Cloud Functions 배포 상태 확인
→ Stripe Dashboard에서 웹훅 로그 확인

### 9.3 결제 후 플랜이 변경되지 않음
→ 웹훅 이벤트가 수신되는지 확인
→ Firebase Functions 로그 확인
→ Firestore 보안 규칙 확인

---

## 10. 한국 결제 지원

### 10.1 지원 결제 수단
- 신용카드/체크카드 (Visa, Mastercard, AMEX)
- Apple Pay / Google Pay

### 10.2 원화 결제
```javascript
// createCheckoutSession에서 currency 지정 가능
line_items: [{
    price_data: {
        currency: 'krw',
        product_data: { name: 'ZYNK Pro' },
        unit_amount: 65000,  // 원화 금액
        recurring: { interval: 'month' }
    },
    quantity: 1
}]
```

---

**문서 작성자**: AI Assistant  
**마지막 업데이트**: 2024-12-09
