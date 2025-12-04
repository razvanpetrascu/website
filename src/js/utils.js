/**
 * Utility Functions
 */

export const storage = {
    setCookie(name, value, days = 180) {
        try {
            const d = new Date();
            d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
            document.cookie = `${name}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=/;SameSite=Lax`;
        } catch {}
    },
    getCookie(name) {
        try {
            const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
            return match ? decodeURIComponent(match[2]) : null;
        } catch { return null; }
    },
    setLocal(k, v){ try{ localStorage.setItem(k,v);}catch{} },
    getLocal(k){ try{ return localStorage.getItem(k);}catch{ return null; } }
};

export const toPx = (val, basisEl) => {
    if (!val || val === 'none') return Infinity;
    const s = String(val).trim().toLowerCase();
    if (/^\d+(\.\d+)?$/.test(s)) return parseFloat(s);
    if (s.endsWith('px')) return parseFloat(s);
    if (s.endsWith('vw')) return (parseFloat(s) / 100) * window.innerWidth;
    if (s.endsWith('vh')) return (parseFloat(s) / 100) * window.innerHeight;
    if (s.endsWith('%')) {
        const base = basisEl && basisEl.getBoundingClientRect
            ? basisEl.getBoundingClientRect().width
            : (document.documentElement.getBoundingClientRect().width || window.innerWidth);
        return (parseFloat(s) / 100) * base;
    }
    const num = parseFloat(s);
    return isNaN(num) ? Infinity : num;
};

export const debounce = (func, wait) => {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
};
