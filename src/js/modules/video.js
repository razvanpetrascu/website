/**
 * Video Module
 * Handles Video API integrations (Vimeo/YouTube), auto-pausing, and responsive resizing.
 */

import { toPx, debounce } from '../utils.js';

export const initializeAutoPause = () => {
    const scrollContainer = document.getElementById('scroll-container');
    
    // Standard DOM Traversal
    const getIframes = () => Array.from(document.querySelectorAll('iframe'));

    const vimeoPlayers = new Map();
    
    const initPlayers = () => {
        if (typeof Vimeo !== 'undefined') {
            getIframes().filter(f => f.src.includes('player.vimeo.com') && !vimeoPlayers.has(f)).forEach(f => {
                try { vimeoPlayers.set(f, new Vimeo.Player(f)); } catch {}
            });
        }
    };

    // Init periodically as iframes are lazy loaded
    setInterval(initPlayers, 2000);

    const pauseYouTube = (frame) => {
        try {
            frame.contentWindow.postMessage(JSON.stringify({ event:'command', func:'pauseVideo', args:[] }), '*');
        } catch {}
    };

    const pauseAll = () => {
        document.querySelectorAll('video').forEach(v => { try { v.pause(); } catch{} });
        vimeoPlayers.forEach(p => { try { p.pause(); } catch{} });
        getIframes().filter(f => /youtube\.com\/embed\//.test(f.src)).forEach(pauseYouTube);
    };

    document.addEventListener('visibilitychange', () => { if (document.hidden) pauseAll(); });

    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) return;
                const el = entry.target;
                
                if (el.tagName === 'IFRAME') {
                    if (el.src.includes('player.vimeo.com')) {
                        const p = vimeoPlayers.get(el); if (p) { try { p.pause(); } catch {} }
                    } else if (/youtube\.com\/embed\//.test(el.src)) {
                        pauseYouTube(el);
                    }
                } else if (el.tagName === 'VIDEO') {
                    try { el.pause(); } catch {}
                }
            });
        }, { root: scrollContainer, threshold: 0.1 });

        // Observe all iframes (re-scan for lazy loaded ones)
        setInterval(() => {
            getIframes().forEach(f => observer.observe(f));
            document.querySelectorAll('video').forEach(v => observer.observe(v));
        }, 2000);
    }
};

// --- Vimeo Resizing Logic ---

const getNumber = (v) => (v ? parseFloat(v) || 0 : 0);

const readInitialAspectAndCache = (container) => {
    if (container.dataset.aspect) return parseFloat(container.dataset.aspect);
    
    // Fallback if dataset not set (legacy)
    const iframe = container.querySelector('iframe[src*="player.vimeo.com"]');
    let aspect = 16/9;

    if (iframe) {
        const wrapper = iframe.parentElement;
        if (wrapper) {
             const inline = wrapper.getAttribute('style') || '';
             const m = inline.match(/padding\s*:\s*([\d.]+)%/i) || inline.match(/padding-top\s*:\s*([\d.]+)%/i);
             if (m && m[1]) {
                 const pct = parseFloat(m[1]);
                 if (pct > 0) aspect = pct / 100;
             }
        }
    }
    container.dataset.aspect = String(aspect);
    return aspect;
};

const fitVimeoInContainer = (container) => {
    const scrollContainer = document.getElementById('scroll-container');
    const section = container.closest('.video-category') || container.closest('.snap-point');
    if (!section || !scrollContainer) return;

    const title  = section.querySelector('.category-title');
    const header = container.querySelector('.video-header');
    const meta   = container.querySelector('.video-meta');
    const scroller = container.closest('.videos-scroller');

    const sStyle = getComputedStyle(section);
    const scStyle = scroller ? getComputedStyle(scroller) : { paddingTop:'0', paddingBottom:'0' };
    const cStyle = getComputedStyle(container);

    const titleH  = title  ? (title.offsetHeight  + getNumber(getComputedStyle(title).marginBottom)) : 0;
    const headerH = header ? (header.offsetHeight + getNumber(getComputedStyle(header).marginBottom)) : 0;
    const metaH   = meta   ? (meta.offsetHeight   + getNumber(getComputedStyle(meta).marginTop))     : 0;

    const sectionPadV  = getNumber(sStyle.paddingTop) + getNumber(sStyle.paddingBottom);
    const scrollerPadV = getNumber(scStyle.paddingTop) + getNumber(scStyle.paddingBottom);
    const containerPadV= getNumber(cStyle.paddingTop) + getNumber(cStyle.paddingBottom);
    const containerMarV= getNumber(cStyle.marginTop)  + getNumber(cStyle.marginBottom);

    const viewportH = scrollContainer.clientHeight;
    const buffer = 40;

    let availableH = viewportH
        - titleH
        - headerH
        - metaH
        - sectionPadV
        - scrollerPadV
        - containerPadV
        - containerMarV
        - buffer;

    if (availableH < 140) availableH = 140;

    // Find the aspect-ratio wrapper.
    // In new render.js, it's .video-wrapper
    const wrapper = container.querySelector('.video-wrapper') 
                 || container.querySelector('div[style*="padding"]'); 

    if (!wrapper) return;

    // Default to 16/9 if we can't find aspect yet
    // Note: aspect here is H/W. Landscape (16:9) is 0.5625. Vertical (9:16) is 1.7778.
    const isLandscape = container.classList.contains('video-container-landscape') || container.hasAttribute('landscape');
    const aspect = readInitialAspectAndCache(container) || (isLandscape ? 0.5625 : 1.7778);

    const desiredW_fromHeightCap = Math.floor(availableH / aspect);

    const cs = getComputedStyle(container);
    const cssMaxW = toPx(cs.maxWidth, scroller || container);
    const hardViewportCap = Math.floor(window.innerWidth * 0.95);
    const minCardW = 220;

    const finalW = Math.max(minCardW, Math.min(hardViewportCap, cssMaxW, desiredW_fromHeightCap));

    container.style.maxWidth = '';
    container.style.width = `${finalW}px`;
    container.style.flexBasis = `${finalW}px`;
    container.style.flexGrow = '0';
    container.style.flexShrink = '0';

    const videoH = Math.floor(finalW * aspect);
    wrapper.style.paddingTop = '0';
    wrapper.style.height = `${videoH}px`;
    
    // If iframe exists, ensure it fits
    const iframe = wrapper.querySelector('iframe');
    if (iframe) {
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.position = 'absolute';
        iframe.style.top = '0';
        iframe.style.left = '0';
    }
};

export const fitAllVimeoToViewport = () => {
    // Standard containers
    const containers = Array.from(document.querySelectorAll('.video-container'));
    // Filter only those that are essentially Vimeo (vertical/square) or generic resize targets
    // For now, resize ALL containers to fit viewport height
    containers.forEach(fitVimeoInContainer);
};

export const debouncedVimeoReflow = debounce(() => {
    fitAllVimeoToViewport();
}, 100);
