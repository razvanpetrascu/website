document.addEventListener('DOMContentLoaded', () => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

    const storage = {
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

    const scrollContainer = document.getElementById('scroll-container');

    const SNAP_COOKIE = 'snapScroll';
    const readSnapPref = () => storage.getCookie(SNAP_COOKIE) || storage.getLocal(SNAP_COOKIE) || 'on';
    const applySnapPref = (state) => {
        if (!scrollContainer) return;
        scrollContainer.classList.toggle('snap-on', state === 'on');
        const toggle = document.getElementById('snap-toggle');
        if (toggle) toggle.checked = state === 'on';
    };
    const writeSnapPref = (state) => {
        storage.setCookie(SNAP_COOKIE, state);
        storage.setLocal(SNAP_COOKIE, state);
        applySnapPref(state);
        fitAllVimeoToViewport();
    };

    const initializeSnapScrollPerSection = () => {
        if (!scrollContainer) return;
        const snapSections = Array.from(document.querySelectorAll('.snap-point'));
        if (!snapSections.length) return;

        let currentIndex = 0;
        let isAnimating = false;
        let touchStartY = null;
        let touchLastY = null;
        let syncTimer = null;

        const findNearestIndex = () => {
            const scrollTop = scrollContainer.scrollTop;
            let bestIdx = 0;
            let bestDist = Infinity;
            snapSections.forEach((sec, idx) => {
                const dist = Math.abs(sec.offsetTop - scrollTop);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestIdx = idx;
                }
            });
            return bestIdx;
        };

        const scrollToIndex = (idx) => {
            if (idx < 0 || idx >= snapSections.length) return;
            isAnimating = true;
            const target = snapSections[idx].offsetTop;
            scrollContainer.scrollTo({ top: target, behavior: 'smooth' });
            currentIndex = idx;
            setTimeout(() => { isAnimating = false; }, 500);
        };

        scrollContainer.addEventListener('scroll', () => {
            if (!scrollContainer.classList.contains('snap-on')) return;
            if (isAnimating) return;
            clearTimeout(syncTimer);
            syncTimer = setTimeout(() => {
                currentIndex = findNearestIndex();
            }, 120);
        });

        scrollContainer.addEventListener('wheel', (e) => {
            if (!scrollContainer.classList.contains('snap-on')) return;
            if (e.deltaY === 0) return;
            e.preventDefault();
            if (isAnimating) return;
            const dir = e.deltaY > 0 ? 1 : -1;
            const targetIndex = Math.min(
                snapSections.length - 1,
                Math.max(0, currentIndex + dir)
            );
            if (targetIndex === currentIndex) return;
            scrollToIndex(targetIndex);
        }, { passive: false });

        scrollContainer.addEventListener('touchstart', (e) => {
            if (!scrollContainer.classList.contains('snap-on')) return;
            if (e.touches.length !== 1) return;
            touchStartY = e.touches[0].clientY;
            touchLastY = touchStartY;
        }, { passive: true });

        scrollContainer.addEventListener('touchmove', (e) => {
            if (!scrollContainer.classList.contains('snap-on')) return;
            if (touchStartY == null) return;
            touchLastY = e.touches[0].clientY;
            e.preventDefault();
        }, { passive: false });

        scrollContainer.addEventListener('touchend', () => {
            if (!scrollContainer.classList.contains('snap-on')) {
                touchStartY = null;
                touchLastY = null;
                return;
            }
            if (touchStartY == null || touchLastY == null) {
                touchStartY = null;
                touchLastY = null;
                return;
            }
            const dy = touchStartY - touchLastY;
            const threshold = 40;

            if (Math.abs(dy) < threshold) {
                currentIndex = findNearestIndex();
                scrollToIndex(currentIndex);
            } else if (!isAnimating) {
                const dir = dy > 0 ? 1 : -1;
                const targetIndex = Math.min(
                    snapSections.length - 1,
                    Math.max(0, currentIndex + dir)
                );
                if (targetIndex !== currentIndex) {
                    scrollToIndex(targetIndex);
                }
            }

            touchStartY = null;
            touchLastY = null;
        });

        currentIndex = findNearestIndex();
    };

    const initializeHeroTextAnimation = () => {
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

    const initializeHeroAboutReveal = () => {
        const about = document.querySelector('.hero-about');
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

    const initializeVideoCategory = (categoryElement) => {
        const scroller = categoryElement.querySelector('.videos-scroller');
        const scrollLeftButton  = categoryElement.querySelector('.scroll-left');
        const scrollRightButton = categoryElement.querySelector('.scroll-right');
        const hint = categoryElement.querySelector('.scroll-hint');
        if (!scroller || !scrollLeftButton || !scrollRightButton) return;

        scroller.scrollLeft = 0;
        scroller.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight') scroller.scrollBy({ left: 200, behavior: 'smooth' });
            if (e.key === 'ArrowLeft')  scroller.scrollBy({ left: -200, behavior: 'smooth' });
        });

        const nav = categoryElement.querySelector('.videos-navigation');
        const updateEdgeFades = () => {
            const max = Math.max(scroller.scrollWidth - scroller.clientWidth, 0);
            const sl = scroller.scrollLeft;
            nav.classList.toggle('show-left-fade', sl > 1);
            nav.classList.toggle('show-right-fade', (max - sl) > 1);
        };

        const HINT_KEY = 'hScrollHintDismissed';
        if (!storage.getLocal(HINT_KEY) && hint) hint.classList.add('visible-once');
        const dismissHint = () => { 
            if (hint) hint.classList.remove('visible-once'); 
            storage.setLocal(HINT_KEY, '1'); 
            [scrollLeftButton, scrollRightButton].forEach(b => b && b.removeAttribute('data-attn'));
        };

        let currentVideoIndex = 0;
        let videoCenters = [];
        const CENTER_OFFSET = 32;
        const getItems = () => Array.from(categoryElement.querySelectorAll('.video-container'));

        const getScrollerMetrics = () => {
            const style = window.getComputedStyle(scroller);
            const paddingLeft = parseFloat(style.paddingLeft) || 0;
            const paddingRight = parseFloat(style.paddingRight) || 0;
            const contentWidth = scroller.clientWidth - paddingLeft - paddingRight;
            const visibleCenterOffset = paddingLeft + contentWidth / 2;
            const maxScrollLeft = Math.max(scroller.scrollWidth - scroller.clientWidth, 0);
            return { paddingLeft, paddingRight, contentWidth, visibleCenterOffset, maxScrollLeft };
        };

        const computeVideoCenters = () => {
            const items = getItems();
            videoCenters = items.map(v => v.offsetLeft + v.offsetWidth / 2);
        };

        let hideLockSide = null; 
        let hideLockTimer = null;
        const setHideLock = (side) => {
            hideLockSide = side;
            clearTimeout(hideLockTimer);
            hideLockTimer = setTimeout(() => { hideLockSide = null; }, 450);
        };

        const updateButtonVisibility = () => {
            const items = getItems();
            const lastIndex = items.length - 1;
            const { maxScrollLeft } = getScrollerMetrics();
            const sl = scroller.scrollLeft;
            const hasScroll = maxScrollLeft > 1;
            if (!hasScroll) {
                scrollLeftButton.classList.add('hidden');
                scrollRightButton.classList.add('hidden');
                return;
            }
            const nearStart = currentVideoIndex <= 0 || sl <= 1;
            const nearEnd = currentVideoIndex >= lastIndex || (maxScrollLeft - sl) <= 1;

            const leftShouldHide  = nearStart || hideLockSide === 'left';
            const rightShouldHide = nearEnd  || hideLockSide === 'right';

            scrollLeftButton.classList.toggle('hidden', leftShouldHide);
            scrollRightButton.classList.toggle('hidden', rightShouldHide);
        };

        const scrollToVideo = (index, smooth = true) => {
            const items = getItems();
            const lastIndex = items.length - 1;
            if (index < 0 || index > lastIndex) return;

            if (index === 0)        { scrollLeftButton.classList.add('hidden');  setHideLock('left'); }
            if (index === lastIndex){ scrollRightButton.classList.add('hidden'); setHideLock('right'); }

            const video = items[index];
            const videoCenter = video.offsetLeft + video.offsetWidth / 2;
            const { visibleCenterOffset, maxScrollLeft } = getScrollerMetrics();
            let target = videoCenter - visibleCenterOffset - CENTER_OFFSET;
            target = Math.max(0, Math.min(maxScrollLeft, target));

            scroller.scrollTo({ left: target, behavior: smooth ? 'smooth' : 'auto' });
            currentVideoIndex = index;
            updateEdgeFades();
        };

        const updateCurrentFromScroll = () => {
            if (!videoCenters.length) return;
            const { visibleCenterOffset } = getScrollerMetrics();
            const center = scroller.scrollLeft + visibleCenterOffset;
            let closest = 0, min = Infinity;
            videoCenters.forEach((c, i) => {
                const d = Math.abs(c - center);
                if (d < min) { min = d; closest = i; }
            });
            currentVideoIndex = closest;
            updateButtonVisibility();
            updateEdgeFades();
        };

        scrollLeftButton.addEventListener('click', () => { scrollToVideo(currentVideoIndex - 1); dismissHint(); });
        scrollRightButton.addEventListener('click', () => { scrollToVideo(currentVideoIndex + 1); dismissHint(); });

        scroller.addEventListener('scroll', () => { updateCurrentFromScroll(); dismissHint(); });
        scroller.addEventListener('pointerdown', dismissHint, { once: true });

        window.addEventListener('resize', () => {
            computeVideoCenters();
            updateButtonVisibility();
            updateEdgeFades();
            fitAllVimeoToViewport();
            adjustArrowWidths(); 
        });

        computeVideoCenters();
        currentVideoIndex = 0;
        updateButtonVisibility();
        updateEdgeFades();
    };

    const initializeMenu = () => {
        const openButton = document.getElementById('menu-open-button');
        const overlay = document.getElementById('menu-overlay');
        const menuLinks = document.querySelectorAll('#menu-categories a');
        const snapToggle = document.getElementById('snap-toggle');
        if (!openButton || !overlay) return;

        const toggleMenu = () => {
            const willOpen = !document.body.classList.contains('menu-open');
            document.body.classList.toggle('menu-open');

            overlay.setAttribute('aria-hidden', String(!willOpen));
            overlay.classList.remove('fading-out');
            if (willOpen) {
                overlay.classList.add('visible');
                overlay.style.pointerEvents = 'auto';
            } else {
                overlay.style.pointerEvents = 'none';
                overlay.classList.add('fading-out');
                setTimeout(() => overlay.classList.remove('visible'), 180);
            }
            if (!document.body.classList.contains('menu-open')) openButton.focus();
        };
        const closeMenu = () => {
            document.body.classList.remove('menu-open');
            overlay.setAttribute('aria-hidden', 'true');
            overlay.style.pointerEvents = 'none';
            overlay.classList.add('fading-out');
            setTimeout(() => overlay.classList.remove('visible'), 180);
            openButton.focus();
        };

        openButton.addEventListener('click', (e) => { e.stopPropagation(); toggleMenu(); });
        overlay.addEventListener('click', closeMenu);

        menuLinks.forEach(link => {
            link.addEventListener('click', (event) => {
                event.preventDefault();
                const targetElement = document.querySelector(link.getAttribute('href'));
                if (targetElement && scrollContainer) {
                    scrollContainer.scrollTo({ top: targetElement.offsetTop, behavior: 'smooth' });
                }
                closeMenu();
            });
        });

        if (snapToggle) {
            snapToggle.addEventListener('change', () => {
                writeSnapPref(snapToggle.checked ? 'on' : 'off');
            });
        }
    };

    const initializeSectionObserver = () => {
        const sections = document.querySelectorAll('.snap-point');
        if (!sections.length || !scrollContainer) return;

        const videoSections = document.querySelectorAll('.video-category');
        const animHandler = (entries) => {
            entries.forEach(entry => {
                const section = entry.target;
                const title = section.querySelector('.category-title');
                if (entry.isIntersecting) {
                    section.classList.add('section-in-view');
                    if (title) title.classList.add('in-view');
                } else {
                    section.classList.remove('section-in-view');
                    if (title) title.classList.remove('in-view');
                }
            });
        };
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver(animHandler, { root: scrollContainer, threshold: 0.35 });
            videoSections.forEach(sec => observer.observe(sec));
        } else {
            videoSections.forEach(sec => {
                sec.classList.add('section-in-view');
                const title = sec.querySelector('.category-title');
                if (title) title.classList.add('in-view');
            });
        }

        const links = Array.from(document.querySelectorAll('#menu-categories a'));
        const setActive = (id) => { links.forEach(a => a.classList.toggle('active', a.dataset.target === id)); };

        const activeObserver = new IntersectionObserver((entries) => {
            let best = { id: null, ratio: 0 };
            entries.forEach(e => {
                const id = e.target.id;
                if (e.intersectionRatio > best.ratio) best = { id, ratio: e.intersectionRatio };
            });
            if (best.id) setActive(best.id);
        }, { root: scrollContainer, threshold: [0.1, 0.25, 0.5, 0.75, 0.9] });

        sections.forEach(s => activeObserver.observe(s));
    };

    const initializeVideoInfoOverlay = () => {
        const overlay = document.getElementById('video-info-overlay');
        const dialog = overlay ? overlay.querySelector('.video-info-dialog') : null;
        const content = overlay ? overlay.querySelector('.video-info-dialog-content') : null;
        if (!overlay || !dialog || !content) return;

        let lastOrigin = null; 

        const setOriginVars = (x, y) => {
            dialog.style.setProperty('--origin-x', `${x}px`);
            dialog.style.setProperty('--origin-y', `${y}px`);
        };

        const openOverlay = (html, triggerEl) => {
            const r = triggerEl.getBoundingClientRect();
            const ox = r.left + r.width / 2;
            const oy = r.top + r.height / 2;
            lastOrigin = { x: ox, y: oy };
            setOriginVars(ox, oy);

            content.innerHTML = html;
            overlay.classList.add('visible');
            overlay.classList.remove('fading-out');
            overlay.style.pointerEvents = 'auto';
            overlay.setAttribute('aria-hidden', 'false');

            dialog.classList.remove('animate-from-origin', 'animate-to-origin');
            void dialog.offsetWidth; 
            dialog.classList.add('animate-from-origin');
        };

        const closeOverlay = () => {
            overlay.style.pointerEvents = 'none';
            overlay.setAttribute('aria-hidden', 'true');

            if (lastOrigin) setOriginVars(lastOrigin.x, lastOrigin.y);

            dialog.classList.remove('animate-from-origin');
            dialog.classList.add('animate-to-origin');
            overlay.classList.add('fading-out');

            setTimeout(() => {
                overlay.classList.remove('visible', 'fading-out');
                dialog.classList.remove('animate-to-origin');
                content.innerHTML = '';
            }, 220);
        };

        overlay.addEventListener('click', closeOverlay);
        dialog.addEventListener('click', closeOverlay);

        document.addEventListener('click', (event) => {
            const infoButton = event.target.closest('.video-info-button');
            if (!infoButton) return;
            event.stopPropagation();
            const container = infoButton.closest('.video-container');
            if (!container) return;
            const descriptionEl = container.querySelector('.video-description-text');
            const html = descriptionEl ? descriptionEl.innerHTML.trim() : 'No description available.';
            openOverlay(html, infoButton);
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && overlay.classList.contains('visible')) {
                e.preventDefault();
                closeOverlay();
            }
        });
    };

    const initializeBackgroundInteraction = () => {
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

    const initializeAutoPause = () => {
        const iframes = Array.from(document.querySelectorAll('iframe'));
        const nativeVideos = Array.from(document.querySelectorAll('video'));

        const vimeoPlayers = new Map();
        iframes.filter(f => f.src.includes('player.vimeo.com')).forEach(f => {
            try { vimeoPlayers.set(f, new Vimeo.Player(f)); } catch {}
        });

        const ytIframes = iframes.filter(f => /youtube\.com\/embed\//.test(f.src));
        const pauseYouTube = (frame) => {
            try {
                frame.contentWindow.postMessage(JSON.stringify({ event:'command', func:'pauseVideo', args:[] }), '*');
            } catch {}
        };

        const pauseAll = () => {
            nativeVideos.forEach(v => { try { v.pause(); } catch{} });
            vimeoPlayers.forEach(p => { try { p.pause(); } catch{} });
            ytIframes.forEach(pauseYouTube);
        };

        document.addEventListener('visibilitychange', () => { if (document.hidden) pauseAll(); });

        const targets = [...nativeVideos, ...iframes];
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    const el = entry.target;
                    if (entry.isIntersecting) return;
                    if (el.tagName === 'VIDEO') { try { el.pause(); } catch {} }
                    else if (el.tagName === 'IFRAME') {
                        if (el.src.includes('player.vimeo.com')) {
                            const p = vimeoPlayers.get(el); if (p) { try { p.pause(); } catch {} }
                        } else if (/youtube\.com\/embed\//.test(el.src)) pauseYouTube(el);
                    }
                });
            }, { root: scrollContainer, threshold: 0.2 });
            targets.forEach(t => observer.observe(t));
        }
    };

    const toPx = (val, basisEl) => {
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

    const getNumber = (v) => (v ? parseFloat(v) || 0 : 0);

    const readInitialAspectAndCache = (container) => {
        if (container.dataset.aspect) return parseFloat(container.dataset.aspect);
        const iframe = container.querySelector('iframe[src*="player.vimeo.com"]');
        if (!iframe) return null;
        const wrapper = iframe.parentElement;
        if (!wrapper) return null;

        const inline = wrapper.getAttribute('style') || '';
        let aspect = null;
        const m = inline.match(/padding\s*:\s*([\d.]+)%/i) || inline.match(/padding-top\s*:\s*([\d.]+)%/i);
        if (m && m[1]) {
            const pct = parseFloat(m[1]);
            if (pct > 0) aspect = pct / 100; 
        }
        if (!aspect) aspect = 16/9;
        container.dataset.aspect = String(aspect);
        return aspect;
    };

    const fitVimeoInContainer = (container) => {
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

        const iframe = container.querySelector('iframe[src*="player.vimeo.com"]');
        if (!iframe) return;
        const wrapper = iframe.parentElement;
        if (!wrapper) return;

        const aspect = readInitialAspectAndCache(container) || 16/9; 

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

        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.position = 'absolute';
        iframe.style.top = '0';
        iframe.style.left = '0';
    };

    const fitAllVimeoToViewport = () => {
        const vimeoContainers = Array.from(document.querySelectorAll('.video-container iframe[src*="player.vimeo.com"]'))
            .map(f => f.closest('.video-container'))
            .filter(Boolean);
        vimeoContainers.forEach(fitVimeoInContainer);
    };

    let _resizeTimer = null;
    const debouncedVimeoReflow = () => {
        clearTimeout(_resizeTimer);
        _resizeTimer = setTimeout(() => { fitAllVimeoToViewport(); }, 100);
    };

    const scrollers = Array.from(document.querySelectorAll('.videos-scroller'));
    if (window.ResizeObserver) {
        const ro = new ResizeObserver(() => debouncedVimeoReflow());
        scrollers.forEach(s => ro.observe(s));
    }

    const initializeArrowAttention = () => {
        const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const arrows = Array.from(document.querySelectorAll('.scroll-button'));
        if (!arrows.length || prefersReduced) return;

        let attnDisabled = sessionStorage.getItem('attnDisabled') === '1';
        const disableAll = () => {
            if (attnDisabled) return;
            attnDisabled = true;
            sessionStorage.setItem('attnDisabled', '1');
            stopAll();
        };

        const state = new Map(); 
        const stopAll = () => {
            state.forEach(({timer}, el) => {
                if (timer) clearInterval(timer);
                el.classList.remove('attn-swing');
            });
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
            }, 5000);

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
            if (e.key === 'attnDisabled' && e.newValue === '1') disableAll();
        });
    };

    const adjustArrowWidths = () => {
        const arrows = Array.from(document.querySelectorAll('.scroll-button'));
        if (!arrows.length) return;
        arrows.forEach(el => {
            
            el.style.width = ''; 
            const rect = el.getBoundingClientRect();
            const half = Math.max(24, Math.round(rect.width * 0.5)); 
            el.style.width = half + 'px';
            
        });
    };

    applySnapPref(readSnapPref());

    initializeHeroTextAnimation();
    initializeHeroAboutReveal();
    document.querySelectorAll('.video-category').forEach(initializeVideoCategory);
    initializeMenu();
    initializeSectionObserver();
    initializeVideoInfoOverlay();
    initializeBackgroundInteraction();
    initializeAutoPause();
    initializeSnapScrollPerSection();

    requestAnimationFrame(() => { 
        fitAllVimeoToViewport();
        adjustArrowWidths(); 
    });
    window.addEventListener('resize', () => {
        
        adjustArrowWidths();
    });

    initializeArrowAttention();
});