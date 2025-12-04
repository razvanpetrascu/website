/**
 * Render Module
 * Fetches JSON data and populates the DOM with standard HTML video cards.
 */

export const renderVideos = async () => {
    try {
        const response = await fetch('/src/data/videos.json');
        if (!response.ok) throw new Error('Failed to load video data');
        const videosData = await response.json();

        // Process each category
        videosData.categories.forEach(category => {
            const section = document.getElementById(category.id);
            if (!section) return;

            const scroller = section.querySelector('.videos-scroller');
            if (!scroller) return;

            scroller.innerHTML = '';

            const isLandscape = category.id === 'longform' || category.id === 'music';

            category.videos.forEach(video => {
                const card = createVideoCard(video, isLandscape);
                scroller.appendChild(card);
            });
        });
        
        injectJSONLD(videosData);

    } catch (error) {
        console.error('Error rendering videos:', error);
    }
};

const createVideoCard = (video, isLandscape) => {
    const container = document.createElement('div');
    container.className = isLandscape ? 'video-container video-container-landscape' : 'video-container';
    
    // Store data for resizing logic
    container.dataset.id = video.id;
    container.dataset.platform = video.platform;
    container.dataset.aspect = isLandscape ? '0.5625' : '1.7778'; // H/W: 9/16 or 16/9

    // Header
    const header = document.createElement('div');
    header.className = 'video-header';
    if (video.views) {
        header.innerHTML = `<div class="video-views">${video.views}</div>`;
    } else {
        header.innerHTML = `<div class="video-views">&nbsp;</div>`;
    }
    container.appendChild(header);

    // Wrapper (Facade)
    const wrapper = document.createElement('div');
    wrapper.className = 'video-wrapper';
    wrapper.style.position = 'relative';
    wrapper.style.width = '100%';
    wrapper.style.cursor = 'pointer';
    
    // Aspect Ratio Padding
    // 16:9 = 56.25%, 9:16 = 177.78%
    wrapper.style.paddingTop = isLandscape ? '56.25%' : '177.78%';
    wrapper.style.backgroundColor = '#111';
    wrapper.style.overflow = 'hidden';

    // Thumbnail
    const thumb = document.createElement('img');
    thumb.className = 'video-thumbnail';
    thumb.alt = video.title || 'Video thumbnail';
    thumb.style.position = 'absolute';
    thumb.style.top = '0';
    thumb.style.left = '0';
    thumb.style.width = '100%';
    thumb.style.height = '100%';
    thumb.style.objectFit = 'cover';
    thumb.style.opacity = '0'; 
    thumb.style.transition = 'opacity 0.4s ease';

    // Fetch thumb url
    fetchThumbnailUrl(video).then(url => {
        if (url) {
            thumb.src = url;
            thumb.onload = () => thumb.style.opacity = '1';
        }
    });

    // Play Button
    const playBtn = document.createElement('div');
    playBtn.className = 'play-button-overlay';
    playBtn.innerHTML = '<div class="play-icon"></div>';

    wrapper.appendChild(thumb);
    wrapper.appendChild(playBtn);

    // Click to Load
    const loadVideo = () => {
        // Avoid double load
        if (wrapper.querySelector('iframe')) return;
        
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.top = '0';
        iframe.style.left = '0';
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.frameBorder = '0';
        iframe.allowFullscreen = true;

        if (video.platform === 'youtube') {
            iframe.src = `https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0`;
            iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
        } else {
            const hash = video.hash ? `&h=${video.hash}` : '';
            iframe.src = `https://player.vimeo.com/video/${video.id}?autoplay=1${hash}&badge=0&autopause=0&player_id=0&app_id=58479`;
            iframe.allow = "autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share";
        }

        wrapper.innerHTML = ''; // Remove thumb/btn
        wrapper.appendChild(iframe);
        
        // Dispatch event for analytics
        document.body.dispatchEvent(new CustomEvent('video-play', {
            detail: { id: video.id, platform: video.platform, title: video.title }
        }));
    };

    wrapper.addEventListener('click', loadVideo);
    container.appendChild(wrapper);

    // Meta
    if (video.link) {
        const meta = document.createElement('div');
        meta.className = 'video-meta';
        meta.innerHTML = `Watch on <a href="${video.link}" target="_blank">${video.linkText || 'External'}</a>`;
        container.appendChild(meta);
    }

    return container;
};

const fetchThumbnailUrl = async (video) => {
    if (video.platform === 'youtube') {
        return `https://img.youtube.com/vi/${video.id}/maxresdefault.jpg`;
    } else {
        try {
            const res = await fetch(`https://vimeo.com/api/v2/video/${video.id}.json`);
            const data = await res.json();
            return data[0]?.thumbnail_large;
        } catch { return null; }
    }
};

const injectJSONLD = (data) => {
    const schema = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "itemListElement": []
    };

    let index = 1;
    data.categories.forEach(cat => {
        cat.videos.forEach(vid => {
            schema.itemListElement.push({
                "@type": "VideoObject",
                "position": index++,
                "name": vid.title,
                "description": `Video by Razvan Petrascu - ${cat.title}`,
                "thumbnailUrl": vid.platform === 'youtube' 
                    ? `https://img.youtube.com/vi/${vid.id}/maxresdefault.jpg`
                    : `https://vumbnail.com/${vid.id}.jpg`, 
                "uploadDate": new Date().toISOString(), 
                "contentUrl": vid.platform === 'youtube' 
                    ? `https://www.youtube.com/watch?v=${vid.id}`
                    : `https://vimeo.com/${vid.id}`
            });
        });
    });

    const script = document.createElement('script');
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
};
