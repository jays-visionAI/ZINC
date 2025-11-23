"use client";

import { motion } from "framer-motion";
import { Project } from "@/lib/firebase";

type Props = {
    project: Project;
};

export default function ProjectCard({ project }: Props) {
    const {
        projectName,
        category,
        status,
        followerGrowth30d,
        engagementRate30d,
        pendingApprovals,
        agentHealthCurrent,
        agentHealthMax,
    } = project;

    const statusClasses =
        status === "NOMINAL"
            ? "bg-green-100 text-green-800"
            : "bg-yellow-100 text-yellow-800";

    const categoryColor =
        category === "Blockchain" ? "#8B5CF6" : "#20F5CC";

    return (
        <motion.div
            className="bg-gray-800 bg-opacity-60 backdrop-blur-md border border-gray-700 rounded-xl p-6 flex flex-col gap-4 hover:shadow-lg transition-shadow"
            whileHover={{ y: -4, scale: 1.02 }}
        >
            {/* Header */}
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full" style={{ background: categoryColor }} />
                    <h3 className="text-lg font-medium">{projectName}</h3>
                </div>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded ${statusClasses}`}>${status}</span>
            </div>

            {/* Tags */}
            <div className="flex gap-2">
                <span
                    className="px-2 py-0.5 text-xs rounded border"
                    style={{
                        borderColor: categoryColor,
                        color: categoryColor,
                    }}
                >
                    {category}
                </span>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                    <p className="text-gray-400">Follower Growth (30d)</p>
                    <p className="font-medium">{followerGrowth30d}%</p>
                </div>
                <div>
                    <p className="text-gray-400">Engagement Rate (30d)</p>
                    <p className="font-medium">{engagementRate30d}%</p>
                </div>
                <div>
                    <p className="text-gray-400">Pending Approvals</p>
                    <p className="font-medium">{pendingApprovals}</p>
                </div>
                <div>
                    <p className="text-gray-400">Agent Health</p>
                    <p className="font-medium">{agentHealthCurrent}/{agentHealthMax}</p>
                </div>
            </div>

            {/* CTA */}
            <div className="mt-auto flex justify-between items-center">
                <button className="bg-mint text-charcoal px-4 py-2 rounded-lg font-semibold hover:bg-mint/80 transition">
                    Jump to Mission Control
                </button>
                <button className="text-gray-400 hover:text-white">⚙</button>
            </div>
        </motion.div>
    );
}
