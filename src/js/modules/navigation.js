/**
 * Navigation Module
 * Handles the menu toggle, active section highlighting, and smooth scrolling to anchors.
 */

import { CONFIG } from '../config.js';
import { toggleSnap } from './scroll.js';

export const initializeMenu = () => {
    const openButton = document.getElementById('menu-open-button');
    const overlay = document.getElementById('menu-overlay');
    const menuLinks = document.querySelectorAll('#menu-categories a');
    const snapToggle = document.getElementById('snap-toggle');
    const scrollContainer = document.getElementById('scroll-container');
    
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
            toggleSnap(snapToggle.checked ? 'on' : 'off');
        });
    }
};

export const initializeSectionObserver = () => {
    const scrollContainer = document.getElementById('scroll-container');
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