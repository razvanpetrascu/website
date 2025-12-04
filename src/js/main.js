/**
 * Main Entry Point
 * Orchestrates the initialization of all modules.
 */

import { initializeSnapScrollPerSection, initializeVideoCategory } from './modules/scroll.js';
import { initializeMenu, initializeSectionObserver } from './modules/navigation.js';
import { initializeAutoPause, fitAllVimeoToViewport, debouncedVimeoReflow } from './modules/video.js';
import { initializeHeroTextAnimation, initializeHeroAboutReveal, initializeBackgroundInteraction, initializeArrowAttention } from './modules/animations.js';
import { initializeVideoInfoOverlay, adjustArrowWidths } from './modules/ui.js';
import { renderVideos } from './modules/render.js';
import { initializeCanvasBackground } from './modules/canvas-bg.js';
import { initializeAnalytics } from './modules/analytics.js';

document.addEventListener('DOMContentLoaded', async () => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

    await renderVideos();

    // Initialize Modules
    initializeCanvasBackground();
    initializeAnalytics();
    initializeHeroTextAnimation();
    initializeHeroAboutReveal();
    initializeMenu();
    initializeSectionObserver();
    initializeVideoInfoOverlay();
    initializeBackgroundInteraction(); // CSS Orbs logic (can coexist or be removed if canvas covers it)
    initializeAutoPause();
    initializeSnapScrollPerSection();

    // Initialize Category Scrollers
    document.querySelectorAll('.video-category').forEach(initializeVideoCategory);

    // Initial fit + debounced resize wiring
    requestAnimationFrame(() => { 
        fitAllVimeoToViewport();
        adjustArrowWidths();
    });
    
    // Setup Resize Observers for Scrollers
    const scrollers = Array.from(document.querySelectorAll('.videos-scroller'));
    if (window.ResizeObserver) {
        const ro = new ResizeObserver(() => debouncedVimeoReflow());
        scrollers.forEach(s => ro.observe(s));
    }

    // Start arrow attention after everything else
    initializeArrowAttention();
});
