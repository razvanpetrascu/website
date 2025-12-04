/**
 * Analytics Module
 * Tracks user interactions privately and securely.
 */

export const trackEvent = (eventName, params = {}) => {
    // Log to console for dev visibility
    if (import.meta.env && import.meta.env.DEV) {
        console.log(`[Analytics] ${eventName}`, params);
    }

    // Example: Integration with a real privacy-friendly tool (e.g., Plausible, Fathom)
    // if (window.plausible) { window.plausible(eventName, { props: params }); }

    // Example: Integration with GA4 (if ID is present)
    // if (typeof gtag === 'function') {
    //     gtag('event', eventName, params);
    // }
};

export const initializeAnalytics = () => {
    // Track route changes or hash changes if any
    window.addEventListener('hashchange', () => {
        trackEvent('page_view', { path: location.hash });
    });

    // Track video plays (custom event from VideoCard)
    // Since WebComponents encapsulate, we can dispatch events from them that bubble up.
    document.body.addEventListener('video-play', (e) => {
        trackEvent('video_play', { 
            id: e.detail.id, 
            platform: e.detail.platform, 
            title: e.detail.title 
        });
    });
};
