/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                sorare: {
                    dark: '#0c0e12',
                    card: '#1a1d26',
                    cardHover: '#232631',
                    border: '#2e323e',
                    text: '#e2e8f0',
                    muted: '#94a3b8',
                    accent: '#4c6ef5', // Bright Indigo
                    accentHover: '#3b5bdb',
                    secondary: '#7950f2', // Purple
                }
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-out',
                'slide-up': 'slideUp 0.5s ease-out',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                }
            }
        },
    },
    plugins: [],
}
