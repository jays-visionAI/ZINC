// ZYNK AGENT OS - Phase 1.5: Version Management System
// SubAgent 버전 업데이트 및 AgentSet 자동 버전 증가

(function setupVersionManagement() {
    console.log("📦 ZYNK AGENT OS - Version Management");
    console.log("=====================================\n");

    if (typeof db === 'undefined') {
        console.error("❌ Firestore 'db' not found.");
        return;
    }

    const projectId = "default_project"; // TODO: Get from context

    // =============================================
    // 1. SubAgent Version Update
    // =============================================

    /**
     * SubAgent를 새 버전으로 업데이트
     * @param {string} currentAgentId - 현재 Agent ID (예: "planner_v1_0_0")
     * @param {object} updates - 업데이트할 필드들
     * @param {string} changeLog - 변경 설명
     * @param {string} versionType - "major" | "minor" | "patch"
     * @returns {object} 새 SubAgent 문서
     */
    window.updateSubAgentVersion = async function (currentAgentId, updates, changeLog, versionType = "minor") {
        console.log(`\n🔄 Updating SubAgent: ${currentAgentId}`);
        console.log(`   Version type: ${versionType}`);
        console.log(`   Change: ${changeLog}\n`);

        try {
            // 1. 현재 Agent 가져오기
            const currentAgentRef = db.collection(`projects/${projectId}/subAgents`).doc(currentAgentId);
            const currentAgentDoc = await currentAgentRef.get();

            if (!currentAgentDoc.exists) {
                throw new Error(`SubAgent ${currentAgentId} not found`);
            }

            const currentAgent = currentAgentDoc.data();
            const currentVersion = currentAgent.version || "1.0.0"; // Default to 1.0.0 if missing

            // 2. 새 버전 번호 계산
            const newVersion = incrementVersion(currentVersion, versionType);
            const newAgentId = `${currentAgent.type}_v${newVersion.replace(/\./g, '_')}`;

            console.log(`   Current: ${currentVersion} (${currentAgentId})`);
            console.log(`   New: ${newVersion} (${newAgentId})`);

            // 3. 새 Agent 문서 생성
            const newAgent = {
                ...currentAgent,
                ...updates,
                sub_agent_id: newAgentId,
                version: newVersion,
                parent_version: currentAgentId,
                change_log: changeLog,
                updated_at: firebase.firestore.FieldValue.serverTimestamp(),
                created_at: firebase.firestore.FieldValue.serverTimestamp() // 새 버전의 생성 시간
            };

            await db.collection(`projects/${projectId}/subAgents`)
                .doc(newAgentId)
                .set(newAgent);

            console.log(`   ✅ Created new version: ${newAgentId}\n`);

            // 4. History 기록
            await recordSubAgentHistory(currentAgentId, newAgentId, currentVersion, newVersion, changeLog, updates);

            // 5. 이전 버전을 deprecated로 표시 (선택적)
            await currentAgentRef.update({
                status: "deprecated",
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            });

            console.log(`   ✅ Marked old version as deprecated\n`);

            return {
                success: true,
                oldAgentId: currentAgentId,
                newAgentId: newAgentId,
                oldVersion: currentVersion,
                newVersion: newVersion
            };

        } catch (error) {
            console.error("❌ Error updating SubAgent:", error);
            throw error;
        }
    };

    // =============================================
    // 2. AgentSet Version Auto-Increment
    // =============================================

    /**
     * AgentSet에서 SubAgent를 교체하고 버전 자동 증가
     * @param {string} agentSetId - AgentSet ID
     * @param {string} role - 교체할 역할 (예: "planner", "creator")
     * @param {string} newSubAgentId - 새 SubAgent ID
     * @returns {object} 업데이트된 AgentSet
     */
    window.updateAgentSetSubAgent = async function (agentSetId, role, newSubAgentId) {
        console.log(`\n🔄 Updating AgentSet: ${agentSetId}`);
        console.log(`   Role: ${role} → ${newSubAgentId}\n`);

        try {
            // 1. AgentSet 가져오기
            const agentSetRef = db.collection(`projects/${projectId}/agentSets`).doc(agentSetId);
            const agentSetDoc = await agentSetRef.get();

            if (!agentSetDoc.exists) {
                throw new Error(`AgentSet ${agentSetId} not found`);
            }

            const agentSet = agentSetDoc.data();
            const currentVersion = agentSet.agent_set_version;
            const oldSubAgentId = agentSet.active_sub_agents[role];

            // 2. 새 버전 계산 (SubAgent 교체는 minor 버전 증가)
            const newVersion = incrementVersion(currentVersion, "minor");

            console.log(`   Current version: ${currentVersion}`);
            console.log(`   New version: ${newVersion}`);
            console.log(`   Old ${role}: ${oldSubAgentId}`);
            console.log(`   New ${role}: ${newSubAgentId}\n`);

            // 3. AgentSet 업데이트
            const updatedActiveAgents = {
                ...agentSet.active_sub_agents,
                [role]: newSubAgentId
            };

            await agentSetRef.update({
                active_sub_agents: updatedActiveAgents,
                agent_set_version: newVersion,
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            });

            console.log(`   ✅ AgentSet updated to v${newVersion}\n`);

            // 4. AgentSet History 기록
            await recordAgentSetHistory(
                agentSetId,
                currentVersion,
                newVersion,
                `Updated ${role}: ${oldSubAgentId} → ${newSubAgentId}`
            );

            return {
                success: true,
                agentSetId,
                oldVersion: currentVersion,
                newVersion: newVersion,
                role,
                oldSubAgent: oldSubAgentId,
                newSubAgent: newSubAgentId
            };

        } catch (error) {
            console.error("❌ Error updating AgentSet:", error);
            throw error;
        }
    };

    // =============================================
    // 3. History Recording
    // =============================================

    async function recordSubAgentHistory(oldAgentId, newAgentId, oldVersion, newVersion, changeLog, updates) {
        const historyId = `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const history = {
            history_id: historyId,
            sub_agent_id: newAgentId,
            previous_version: oldAgentId,
            old_version_number: oldVersion,
            new_version_number: newVersion,
            change_log: changeLog,
            changes: updates,
            created_at: firebase.firestore.FieldValue.serverTimestamp(),
            updated_by: firebase.auth().currentUser?.uid || "system"
        };

        await db.collection(`projects/${projectId}/subAgent_history`)
            .doc(historyId)
            .set(history);

        console.log(`   📝 SubAgent history recorded: ${historyId}`);
    }

    window.recordAgentSetHistory = async function (agentSetId, oldVersion, newVersion, changeReason) {
        const historyId = `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const history = {
            history_id: historyId,
            agent_set_id: agentSetId,
            version: newVersion,
            previous_version: oldVersion,
            change_reason: changeReason,
            updated_at: firebase.firestore.FieldValue.serverTimestamp(),
            updated_by: firebase.auth().currentUser?.uid || "system"
        };

        await db.collection(`projects/${projectId}/agentSet_history`)
            .doc(historyId)
            .set(history);

        console.log(`   📝 AgentSet history recorded: ${historyId}`);
    };

    // =============================================
    // 4. Version Utilities
    // =============================================

    function incrementVersion(version, type) {
        if (!version) version = "1.0.0";
        const [major, minor, patch] = version.split('.').map(Number);

        switch (type) {
            case "major":
                return `${major + 1}.0.0`;
            case "minor":
                return `${major}.${minor + 1}.0`;
            case "patch":
                return `${major}.${minor}.${patch + 1}`;
            default:
                throw new Error(`Invalid version type: ${type}`);
        }
    }

    /**
     * SubAgent의 모든 버전 조회
     */
    window.getSubAgentVersions = async function (agentType) {
        const snapshot = await db.collection(`projects/${projectId}/subAgents`)
            .where("type", "==", agentType)
            .get();

        const versions = [];
        snapshot.forEach(doc => {
            versions.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // 클라이언트에서 정렬 (인덱스 불필요)
        versions.sort((a, b) => {
            if (b.created_at && a.created_at) {
                return b.created_at.seconds - a.created_at.seconds;
            }
            return 0;
        });

        return versions;
    };

    /**
     * AgentSet의 변경 히스토리 조회
     */
    window.getAgentSetHistory = async function (agentSetId) {
        const snapshot = await db.collection(`projects/${projectId}/agentSet_history`)
            .where("agent_set_id", "==", agentSetId)
            .get();

        const history = [];
        snapshot.forEach(doc => {
            history.push(doc.data());
        });

        // 클라이언트에서 정렬 (인덱스 불필요)
        history.sort((a, b) => {
            if (b.updated_at && a.updated_at) {
                return b.updated_at.seconds - a.updated_at.seconds;
            }
            return 0;
        });

        // 최대 20개만 반환
        return history.slice(0, 20);
    };

    /**
     * SubAgent 버전 롤백 (AgentSet에서 이전 버전으로 교체)
     */
    window.rollbackSubAgent = async function (agentSetId, role, targetSubAgentId) {
        console.log(`\n⏮️  Rolling back ${role} in ${agentSetId}`);
        console.log(`   Target: ${targetSubAgentId}\n`);

        return await updateAgentSetSubAgent(agentSetId, role, targetSubAgentId);
    };

    // =============================================
    // Helper Functions
    // =============================================

    /**
     * 버전 비교 (v1 > v2 이면 1, v1 < v2 이면 -1, 같으면 0)
     */
    function compareVersions(v1, v2) {
        const parts1 = v1.split('.').map(Number);
        const parts2 = v2.split('.').map(Number);

        for (let i = 0; i < 3; i++) {
            if (parts1[i] > parts2[i]) return 1;
            if (parts1[i] < parts2[i]) return -1;
        }
        return 0;
    }

    console.log("✅ Version Management loaded!");
    console.log("\nAvailable functions:");
    console.log("  - updateSubAgentVersion(agentId, updates, changeLog, versionType)");
    console.log("  - updateAgentSetSubAgent(agentSetId, role, newSubAgentId)");
    console.log("  - getSubAgentVersions(agentType)");
    console.log("  - getAgentSetHistory(agentSetId)");
    console.log("  - rollbackSubAgent(agentSetId, role, targetSubAgentId)\n");

})();
