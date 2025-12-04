/**
 * Canvas Background Module
 * Renders a high-performance starfield using HTML5 Canvas.
 */

export const initializeCanvasBackground = () => {
    const canvas = document.getElementById('starfield');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width, height;
    let stars = [];

    const CONFIG = {
        starCount: 150,
        speed: 0.05,
        twinkleSpeed: 0.02
    };

    const resize = () => {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        initStars();
    };

    const initStars = () => {
        stars = [];
        for (let i = 0; i < CONFIG.starCount; i++) {
            stars.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 1.5,
                alpha: Math.random(),
                twinkleDir: Math.random() > 0.5 ? 1 : -1
            });
        }
    };

    const animate = () => {
        ctx.clearRect(0, 0, width, height);
        
        // Update and Draw
        ctx.fillStyle = 'white';
        stars.forEach(star => {
            // Twinkle logic
            star.alpha += CONFIG.twinkleSpeed * star.twinkleDir;
            if (star.alpha > 1) { star.alpha = 1; star.twinkleDir = -1; }
            if (star.alpha < 0.2) { star.alpha = 0.2; star.twinkleDir = 1; }

            // Parallax / Movement logic based on scroll
            // (Optional: Connect to scroll position if desired, keeping simple for now)
            
            ctx.globalAlpha = star.alpha;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
        });

        requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resize);
    resize();
    animate();
};
