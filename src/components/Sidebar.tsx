"use client";

import Link from "next/link";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";

export default function Sidebar() {
    const [user] = useAuthState(auth);

    const menuItems = [
        { name: "Command Center", href: "/command-center", icon: "home" },
        { name: "Projects", href: "#", icon: "folder" },
        { name: "Agents", href: "#", icon: "users" },
        { name: "Analytics", href: "#", icon: "bar-chart-2" },
        { name: "Settings", href: "#", icon: "settings" },
    ];

    return (
        <aside className="w-72 h-screen bg-charcoal flex flex-col p-6">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 mb-8">
                <svg
                    className="w-10 h-10"
                    viewBox="0 0 40 40"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        d="M20 0L40 10V30L20 40L0 30V10L20 0Z"
                        fill="url(#logo-gradient)"
                    />
                    <defs>
                        <linearGradient
                            id="logo-gradient"
                            x1="0"
                            y1="0"
                            x2="40"
                            y2="40"
                        >
                            <stop offset="0%" stopColor="#20F5CC" />
                            <stop offset="100%" stopColor="#3B82F6" />
                        </linearGradient>
                    </defs>
                    <text
                        x="20"
                        y="29"
                        fontSize="22"
                        fontWeight="800"
                        fill="white"
                        textAnchor="middle"
                        fontFamily="Inter, sans-serif"
                    >
                        Z
                    </text>
                </svg>
                <span className="text-2xl font-bold text-white">ZINC</span>
            </Link>

            {/* Menu */}
            <nav className="flex-1 space-y-2">
                {menuItems.map((item) => (
                    <Link
                        key={item.name}
                        href={item.href}
                        className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${item.name === "Command Center"
                                ? "bg-mint text-charcoal font-semibold active-sidebar"
                                : "text-gray-300 hover:bg-gray-800"
                            }`}
                    >
                        <span>{item.icon}</span>
                        {item.name}
                    </Link>
                ))}
            </nav>

            {/* Bottom – user status */}
            <div className="mt-auto text-sm text-gray-400">
                <span className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    {user?.email || "Guest"}
                </span>
            </div>
        </aside>
    );
}
