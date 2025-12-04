/**
 * Animations Module
 * Hero animations, background effects, and arrow attention grabbers.
 */

import { CONFIG } from '../config.js';

export const initializeHeroTextAnimation = () => {
    const header = document.querySelector('header#home');
    if (!header) return;
    const wrapText = (el, baseDelay, className) => {
        if (!el) return;
        const text = el.textContent;
        el.textContent = '';
        [...text].forEach((ch, i) => {
            const span = document.createElement('span');
            span.textContent = ch === ' ' ? '\u00A0' : ch;
            span.className = className + (ch === ' ' ? ' hero-space' : '');
            span.style.animationDelay = (baseDelay + i * 0.04).toFixed(2) + 's';
            el.appendChild(span);
        });
    };
    wrapText(header.querySelector('h1'), 0.1, 'hero-char hero-char-title');
    wrapText(header.querySelector('h2'), 0.6, 'hero-char hero-char-subtitle');
};

export const initializeHeroAboutReveal = () => {
    const about = document.querySelector('.hero-about');
    const scrollContainer = document.getElementById('scroll-container');
    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!about) return;
    if (prefersReduced) {
        about.classList.add('is-visible');
        return;
    }
    const header = document.querySelector('header#home');
    if (!('IntersectionObserver' in window) || !header) {
        requestAnimationFrame(() => about.classList.add('is-visible'));
        return;
    }
    const io = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                about.classList.add('is-visible');
                io.disconnect();
            }
        });
    }, { root: scrollContainer || null, threshold: 0.6 });
    io.observe(header);
};

export const initializeBackgroundInteraction = () => {
    const scrollContainer = document.getElementById('scroll-container');
    if (!scrollContainer) return;
    const orbs = Array.from(document.querySelectorAll('.orb'));
    const lerp = (a,b,t)=>a+(b-a)*t;
    let tx = 0, ty = 0, cx = 0, cy = 0;

    const onMove = (e) => {
        const rect = scrollContainer.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top)  / rect.height - 0.5;
        tx = x; ty = y;
    };
    scrollContainer.addEventListener('pointermove', onMove);

    const tick = () => {
        cx = lerp(cx, tx, 0.06);
        cy = lerp(cy, ty, 0.06);
        orbs.forEach((o, i) => {
            const m = 12 + i*6;
            o.style.transform = `translate(${cx*m}px, ${cy*m}px)`;
        });
        requestAnimationFrame(tick);
    };
    tick();

    scrollContainer.addEventListener('scroll', () => {
        const y = scrollContainer.scrollTop * 0.18;
        document.body.style.backgroundPosition = `0px ${-y}px`;
        if (Math.random() < 0.25) {
            const a = (0.4 + Math.random() * 0.4).toFixed(2);
            const b = (0.4 + Math.random() * 0.4).toFixed(2);
            const c = (0.4 + Math.random() * 0.4).toFixed(2);
            document.body.style.setProperty('--twinkle-a', a);
            document.body.style.setProperty('--twinkle-b', b);
            document.body.style.setProperty('--twinkle-c', c);
        }
    });
};

export const initializeArrowAttention = () => {
    const scrollContainer = document.getElementById('scroll-container');
    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const arrows = Array.from(document.querySelectorAll('.scroll-button'));
    if (!arrows.length || prefersReduced) return;

    let attnDisabled = sessionStorage.getItem(CONFIG.ATTN_DISABLED_KEY) === '1';
    
    // Helper to stop animations
    const state = new Map(); // el -> {visible, timer}
    const stopAll = () => {
        state.forEach(({timer}, el) => {
            if (timer) clearInterval(timer);
            el.classList.remove('attn-swing');
        });
    };

    const disableAll = () => {
        if (attnDisabled) return;
        attnDisabled = true;
        sessionStorage.setItem(CONFIG.ATTN_DISABLED_KEY, '1');
        stopAll();
    };

    const schedule = (el) => {
        const st = state.get(el) || {};
        if (st.timer) clearInterval(st.timer);

        const t = setInterval(() => {
            const s = state.get(el);
            if (!s || !s.visible || attnDisabled) return;
            el.classList.add('attn-swing');
            const onEnd = () => {
                el.classList.remove('attn-swing');
                el.removeEventListener('animationend', onEnd);
            };
            el.addEventListener('animationend', onEnd, { once: true });
        }, CONFIG.ATTENTION_INTERVAL);

        state.set(el, { ...st, timer: t });
    };

    const unschedule = (el) => {
        const st = state.get(el);
        if (st && st.timer) clearInterval(st.timer);
        if (st) st.timer = null;
        el.classList.remove('attn-swing');
    };

    const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const el = entry.target;
            const st = state.get(el) || {};
            st.visible = entry.isIntersecting;
            state.set(el, st);

            if (attnDisabled) { unschedule(el); return; }

            if (entry.isIntersecting) {
                if (!st.timer) schedule(el);
            } else {
                unschedule(el);
            }
        });
    }, { root: scrollContainer || null, threshold: 0.8 });

    arrows.forEach(el => {
        state.set(el, { visible: false, timer: null });
        io.observe(el);
        el.addEventListener('mouseenter', disableAll, { once: true });
        el.addEventListener('click', disableAll, { once: true });
    });

    window.addEventListener('storage', (e) => {
        if (e.key === CONFIG.ATTN_DISABLED_KEY && e.newValue === '1') disableAll();
    });
};
