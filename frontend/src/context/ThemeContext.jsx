import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const ACCENT_PALETTES = [
    { id: 'indigo', name: 'Executive Indigo', hex: '#4f46e5', ringHex: '#818cf8', activeClass: 'from-indigo-600 to-indigo-800' },
    { id: 'emerald', name: 'Fintech Emerald', hex: '#059669', ringHex: '#34d399', activeClass: 'from-emerald-600 to-emerald-800' },
    { id: 'blue', name: 'Corporate Sapphire', hex: '#2563eb', ringHex: '#60a5fa', activeClass: 'from-blue-600 to-blue-800' },
    { id: 'slate', name: 'Minimal Obsidian', hex: '#334155', ringHex: '#94a3b8', activeClass: 'from-slate-700 to-slate-900' },
    { id: 'violet', name: 'Wealth Violet', hex: '#7c3aed', ringHex: '#a78bfa', activeClass: 'from-violet-600 to-violet-800' }
];

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(() => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            return savedTheme;
        }
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    });

    const [accent, setAccentState] = useState(() => {
        const savedAccent = localStorage.getItem('crm_accent');
        return savedAccent || 'indigo';
    });

    useEffect(() => {
        const root = window.document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        const root = window.document.documentElement;
        root.setAttribute('data-accent', accent);
        localStorage.setItem('crm_accent', accent);
    }, [accent]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    const setAccent = (newAccent) => {
        setAccentState(newAccent);
    };

    return (
        <ThemeContext.Provider value={{ 
            theme, 
            toggleTheme, 
            accent, 
            setAccent, 
            accentsList: ACCENT_PALETTES 
        }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
