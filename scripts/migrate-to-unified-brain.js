/**
 * Migration Script: Migrate Existing Projects to Unified Brain Architecture
 * 
 * This script finds all projects without a `coreAgentTeamInstanceId` and
 * creates a 12-agent team instance for them.
 * 
 * Run via: Include this script in admin-settings.html or run in browser console.
 */

const CORE_SUBAGENT_DEFINITIONS = [
    { role_type: 'manager', role_name: 'Content Manager', display_order: 1, stage: 'final' },
    { role_type: 'planner', role_name: 'Content Planner', display_order: 2, stage: 'planning' },
    { role_type: 'research', role_name: 'Researcher', display_order: 3, stage: 'research' },
    { role_type: 'knowledge_curator', role_name: 'Knowledge Curator', display_order: 4, stage: 'research' },
    { role_type: 'seo_watcher', role_name: 'SEO Watcher', display_order: 5, stage: 'research' },
    { role_type: 'kpi', role_name: 'KPI Engine', display_order: 6, stage: 'research' },
    { role_type: 'creator_text', role_name: 'Text Creator', display_order: 7, stage: 'creation' },
    { role_type: 'creator_image', role_name: 'Image Creator', display_order: 8, stage: 'creation' },
    { role_type: 'creator_video', role_name: 'Video Creator', display_order: 9, stage: 'creation' },
    { role_type: 'compliance', role_name: 'Compliance Officer', display_order: 10, stage: 'validation' },
    { role_type: 'seo_optimizer', role_name: 'SEO Optimizer', display_order: 11, stage: 'validation' },
    { role_type: 'evaluator', role_name: 'Quality Evaluator', display_order: 12, stage: 'validation' }
];

async function migrateProjectsToUnifiedBrain() {
    const db = firebase.firestore();
    console.log('🧠 [Unified Brain Migration] Starting...');

    try {
        // 1. Find all projects without coreAgentTeamInstanceId
        const projectsSnapshot = await db.collection('projects')
            .where('isDraft', '==', false)
            .get();

        const projectsToMigrate = [];
        projectsSnapshot.forEach(doc => {
            const data = doc.data();
            if (!data.coreAgentTeamInstanceId) {
                projectsToMigrate.push({ id: doc.id, data });
            }
        });

        console.log(`📋 Found ${projectsToMigrate.length} projects to migrate`);

        if (projectsToMigrate.length === 0) {
            console.log('✅ All projects already have Core Agent Teams. No migration needed.');
            return { success: true, migrated: 0 };
        }

        // 2. Migrate each project
        let migratedCount = 0;
        for (const project of projectsToMigrate) {
            console.log(`🔄 Migrating project: ${project.data.projectName || project.id}`);

            try {
                // Create team instance
                const teamRef = await db.collection('projectAgentTeamInstances').add({
                    projectId: project.id,
                    name: 'Core Team',
                    description: 'Unified Brain - Auto-migrated',
                    isActive: true,
                    defaultLLMProvider: 'openai',
                    defaultLLMModel: 'gpt-4o-mini',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                const teamId = teamRef.id;

                // Create sub-agents
                const batch = db.batch();
                for (const def of CORE_SUBAGENT_DEFINITIONS) {
                    const subAgentRef = teamRef.collection('subAgents').doc();
                    batch.set(subAgentRef, {
                        role_type: def.role_type,
                        role_name: def.role_name,
                        display_order: def.display_order,
                        execution_stage: def.stage,
                        is_active: true,
                        system_prompt: '',
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
                await batch.commit();

                // Link to project
                await db.collection('projects').doc(project.id).update({
                    coreAgentTeamInstanceId: teamId,
                    totalAgents: 12
                });

                migratedCount++;
                console.log(`   ✅ Migrated: ${project.data.projectName || project.id}`);

            } catch (err) {
                console.error(`   ❌ Failed to migrate project ${project.id}:`, err);
            }
        }

        console.log(`🧠 [Unified Brain Migration] Complete! Migrated ${migratedCount}/${projectsToMigrate.length} projects.`);
        return { success: true, migrated: migratedCount, total: projectsToMigrate.length };

    } catch (error) {
        console.error('❌ Migration failed:', error);
        return { success: false, error: error.message };
    }
}

// Export for use
window.migrateProjectsToUnifiedBrain = migrateProjectsToUnifiedBrain;

console.log('🧠 Unified Brain Migration Script Loaded. Run `migrateProjectsToUnifiedBrain()` to start.');
