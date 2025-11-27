# Agent Team Creation Wizard - Test Guide

## 🎯 목표
새로 구현된 **Agent Team Creation Wizard**가 정상적으로 작동하는지 확인합니다.
3단계 (Team Info → Sub-Agent Selection → Review) 프로세스를 통해 팀이 생성되고, 데이터가 올바르게 저장되는지 검증합니다.

---

## 🚀 테스트 시나리오

### Test 1: Wizard 열기 및 Step 1 (Team Info)
1. **Admin Panel** > **Agent Teams** 메뉴로 이동합니다.
2. 우측 상단의 **"+ Create New Team"** 버튼을 클릭합니다.
3. **기대 결과**:
   - 모달이 열리고 "Step 1 of 3: Team Info"가 표시됩니다.
   - Progress Bar가 33% 채워져 있습니다.
   - Team Name, Description, Status 입력 필드가 보입니다.

### Test 2: 유효성 검사 및 Step 2 이동
1. Team Name을 비워둔 채 **"Next Step"** 버튼을 클릭합니다.
   - **기대 결과**: "Please enter a team name" 경고창이 뜹니다.
2. Team Name에 `Test Wizard Team A` 입력.
3. Description에 `Testing the new wizard flow` 입력.
4. **"Next Step"** 클릭.
   - **기대 결과**: Step 2 화면으로 전환됩니다. Progress Bar가 66%가 됩니다.

### Test 3: Step 2 (Sub-Agent Selection)
1. 화면에 7가지 역할(Planner, Research, Creator 등) 카드가 표시되는지 확인합니다.
2. 각 카드에 드롭다운이 있고, 사용 가능한 Sub-Agent 버전들이 나열되는지 확인합니다.
   - *참고: Sub-Agent가 하나도 없다면 "No active agents"로 표시됩니다.*
3. **Planner**와 **Creator** 역할에 대해 임의의 버전을 선택합니다.
4. **"Next Step"** 클릭.
   - **기대 결과**: Step 3 화면으로 전환됩니다. Progress Bar가 100%가 됩니다.

### Test 4: Step 3 (Review) 및 생성
1. **Team Summary**에 입력한 이름과 설명이 맞는지 확인합니다.
2. **Selected Agents** 목록에 방금 선택한 Planner와 Creator가 표시되는지 확인합니다.
3. **"Create Team"** 버튼 클릭.
   - **기대 결과**:
     - "Creating..." 로딩 상태 표시.
     - "✅ Team created successfully!" 알림.
     - 모달이 닫힘.
     - 목록에 `Test Wizard Team A`가 추가됨.

### Test 5: 데이터 확인 (상세 페이지)
1. 목록에서 방금 생성한 팀을 클릭합니다.
2. **상세 페이지**에서:
   - 팀 이름, 설명이 맞는지 확인.
   - Sub-Agents 섹션에 선택한 Planner, Creator가 할당되어 있는지 확인.

---

## 🐛 트러블슈팅

**Q: Sub-Agent 목록이 비어있어요.**
A: `admin-subagents.html` 페이지에서 먼저 Sub-Agent를 몇 개 생성해주세요. (Status: Active여야 함)

**Q: "Next Step" 버튼이 작동하지 않아요.**
A: 브라우저 콘솔(F12)에 에러 메시지가 있는지 확인해주세요.
