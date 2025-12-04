/**
 * Scroll Logic Module
 * Handles vertical snap scrolling and horizontal video category scrolling.
 */

import { CONFIG } from '../config.js';
import { storage } from '../utils.js';
import { fitAllVimeoToViewport } from './video.js';
import { adjustArrowWidths } from './ui.js';

// --- Shared Snap Logic ---

const readSnapPref = () => storage.getCookie(CONFIG.SNAP_COOKIE) || storage.getLocal(CONFIG.SNAP_COOKIE) || 'on';

const applySnapPref = (state) => {
    const scrollContainer = document.getElementById('scroll-container');
    if (!scrollContainer) return;
    
    scrollContainer.classList.toggle('snap-on', state === 'on');
    const toggle = document.getElementById('snap-toggle');
    if (toggle) toggle.checked = state === 'on';
};

/**
 * Toggles the snap scrolling state and persists it.
 * @param {string} state - 'on' or 'off'
 */
export const toggleSnap = (state) => {
    storage.setCookie(CONFIG.SNAP_COOKIE, state);
    storage.setLocal(CONFIG.SNAP_COOKIE, state);
    applySnapPref(state);
    fitAllVimeoToViewport();
};

// --- Vertical Snap Scroll ---

export const initializeSnapScrollPerSection = () => {
    const scrollContainer = document.getElementById('scroll-container');
    if (!scrollContainer) return;

    // Initialize state
    applySnapPref(readSnapPref());

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
        setTimeout(() => { isAnimating = false; }, CONFIG.ANIMATION_DURATION);
    };

    // Keep index in sync when user lands on a section from other interactions
    scrollContainer.addEventListener('scroll', () => {
        if (!scrollContainer.classList.contains('snap-on')) return;
        if (isAnimating) return;
        clearTimeout(syncTimer);
        syncTimer = setTimeout(() => {
            currentIndex = findNearestIndex();
        }, 120);
    });

    // Wheel: force single-step scroll between sections
    scrollContainer.addEventListener('wheel', (e) => {
        if (!scrollContainer.classList.contains('snap-on')) return;
        if (Math.abs(e.deltaY) < 5) return; // Ignore tiny jitter
        e.preventDefault();
        
        if (isAnimating) return;

        // Recalculate current index based on current position to avoid state drift
        const realCurrentIndex = findNearestIndex();
        const dir = e.deltaY > 0 ? 1 : -1;
        
        const targetIndex = Math.min(
            snapSections.length - 1,
            Math.max(0, realCurrentIndex + dir)
        );

        if (targetIndex !== realCurrentIndex) {
            scrollToIndex(targetIndex);
        }
    }, { passive: false });

    // Touch: swipe up/down = single section step
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
        // We take over vertical scroll when snap is ON
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
        
        if (Math.abs(dy) < CONFIG.SCROLL_THRESHOLD) {
            // Tiny movement: snap back to nearest section
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

    // Initial index
    currentIndex = findNearestIndex();
};

// --- Horizontal Video Category Scroll ---

export const initializeVideoCategory = (categoryElement) => {
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

    if (!storage.getLocal(CONFIG.HINT_KEY) && hint) hint.classList.add('visible-once');
    const dismissHint = () => { 
        if (hint) hint.classList.remove('visible-once'); 
        storage.setLocal(CONFIG.HINT_KEY, '1'); 
        [scrollLeftButton, scrollRightButton].forEach(b => b && b.removeAttribute('data-attn'));
    };

    let currentVideoIndex = 0;
    let videoCenters = [];
    
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

    let hideLockSide = null; // 'left' | 'right' | null
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
        let target = videoCenter - visibleCenterOffset - CONFIG.CENTER_OFFSET;
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