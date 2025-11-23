/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{js,ts,jsx,tsx}",
        "./public/**/*.html",
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                mint: "#20F5CC",
                charcoal: "#0F0F0F",
            },
            boxShadow: {
                glow: "0 0 20px rgba(32,245,204,0.6)",
            },
            animation: {
                pulse: "pulse 2s infinite",
            },
            keyframes: {
                pulse: {
                    "0%": { boxShadow: "0 0 0 0 rgba(32,245,204,0.4)" },
                    "70%": { boxShadow: "0 0 0 6px rgba(32,245,204,0)" },
                    "100%": { boxShadow: "0 0 0 0 rgba(32,245,204,0)" },
                },
            },
        },
    },
    plugins: [],
};
