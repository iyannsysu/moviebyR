// ==========================================
// Movie Free by R - Main Application
// ==========================================

let currentPage = 'home';
let currentData = null;
let currentParams = { page: 1, query: '', category: '' };
let heroInterval = null;
let currentSlide = 0;

// ==========================================
// DOM HELPERS
// ==========================================

const $ = (id) => document.getElementById(id);
const qs = (sel) => document.querySelector(sel);
const qsa = (sel) => document.querySelectorAll(sel);

function formatDuration(seconds) {
    if (!seconds || seconds === 0) return '';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}j ${m}m` : `${m}m`;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatSize(bytes) {
    if (!bytes) return '';
    const mb = parseInt(bytes) / (1024 * 1024);
    return mb > 1024 ? (mb / 1024).toFixed(1) + ' GB' : mb.toFixed(0) + ' MB';
}

function getTypeBadge(type) {
    return type === 2
        ? '<span class="type-badge series-badge">Series</span>'
        : '<span class="type-badge">Movie</span>';
}

function showLoader() {
    $('loader').style.display = 'flex';
    $('pageContent').innerHTML = '';
}

function hideLoader() {
    $('loader').style.display = 'none';
}

function showToast(msg) {
    const toast = document.createElement('div');
    toast.style.cssText =
        'position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:#e50914;color:white;padding:12px 24px;border-radius:8px;z-index:9999;font-weight:600;box-shadow:0 8px 25px rgba(0,0,0,0.3);animation:fadeIn 0.3s ease;';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==========================================
// NAVIGATION
// ==========================================

function navigate(page, params = {}) {
    if (heroInterval) clearInterval(heroInterval);
    currentPage = page;
    currentParams = { ...currentParams, ...params, page: params.page || 1 };

    qsa('.nav-link').forEach((l) => l.classList.remove('active'));
    const navMap = {
        home: 'home', global: 'global', indonesia: 'indonesia',
        hollywood: 'hollywood', asia: 'asia', horror: 'horror',
        animasi: 'animasi', series: 'series',
        'series-kdrama': 'series', 'series-indo': 'series',
        'series-anime': 'series', 'series-barat': 'series',
        'series-cdrama': 'series', 'series-thai': 'series',
        'series-reality': 'series',
    };
    const navPage = navMap[page] || 'home';
    const activeLink = qs(`.nav-link[data-page="${navPage}"]`);
    if (activeLink) activeLink.classList.add('active');

    $('navMenu').classList.remove('active');
    showLoader();

    const handlers = {
        home: loadHome,
        global: () => loadRanking('global'),
        indonesia: () => loadRanking('indonesia'),
        hollywood: () => loadRanking('hollywood'),
        asia: () => loadRanking('asia'),
        horror: () => loadRanking('horror'),
        animasi: () => loadRanking('animasi'),
        detail: () => loadDetail(params.subjectId),
        search: () => searchMovies(params.query),
        series: () => loadSeries('kdrama'),
        'series-kdrama': () => loadSeries('kdrama'),
        'series-indo': () => loadSeries('indo'),
        'series-anime': () => loadSeries('anime'),
        'series-barat': () => loadSeries('barat'),
        'series-cdrama': () => loadSeries('cdrama'),
        'series-thai': () => loadSeries('thai'),
        'series-reality': () => loadSeries('reality'),
    };

    const handler = handlers[page] || loadHome;
    handler();
}

// ==========================================
// HOME PAGE
// ==========================================

async function loadHome() {
    try {
        const [homeRes, globalRes, indoRes, holRes, kdramaRes] = await Promise.all([
            fetch(`${CONFIG.API_BASE}/moviebox/homepage`),
            fetch(`${CONFIG.API_BASE}/moviebox/global?page=1&perPage=${CONFIG.PER_PAGE}`),
            fetch(`${CONFIG.API_BASE}/moviebox/indonesia?page=1&perPage=10`),
            fetch(`${CONFIG.API_BASE}/moviebox/hollywood?page=1&perPage=10`),
            fetch(`${CONFIG.API_BASE}/moviebox/series/kdrama?page=1&perPage=10`),
        ]);

        const homeData = await homeRes.json();
        const globalData = await globalRes.json();
        const indoData = await indoRes.json();
        const holData = await holRes.json();
        const kdramaData = await kdramaRes.json();

        hideLoader();
        let html = '';

        // ─── Hero Banner ───
        const banners = [];
        if (homeData.data && homeData.data.items) {
            homeData.data.items.forEach((item) => {
                if (item.banner && item.banner.banners) {
                    item.banner.banners.forEach((b) => {
                        if (b.subject) banners.push(b);
                    });
                }
            });
        }

        if (banners.length > 0) {
            html += `<section class="hero-section"><div class="hero-carousel" id="heroCarousel">`;
            banners.slice(0, CONFIG.HERO_BANNER_COUNT).forEach((b, i) => {
                const sub = b.subject;
                const genres = sub.genre
                    ? sub.genre.split(',').map((g) => g.trim()).slice(0, 3)
                    : [];
                html += `
                <div class="hero-slide ${i === 0 ? 'active' : ''}" data-index="${i}">
                    <div class="hero-slide-bg" style="background-image:url('${sub.cover?.url || ''}')"></div>
                    <div class="hero-slide-content">
                        <h2>${escHtml(sub.title)}</h2>
                        <div class="hero-meta">
                            <span><i class="fas fa-calendar"></i> ${sub.releaseDate || ''}</span>
                            <span><i class="fas fa-star" style="color:var(--accent)"></i> ${sub.imdbRatingValue || sub.imdbRate || ''}</span>
                        </div>
                        <div class="hero-genre">${genres.map((g) => `<span>${escHtml(g)}</span>`).join('')}</div>
                        <div class="hero-actions">
                            <button class="btn-primary" onclick="navigate('detail', {subjectId:'${sub.subjectId}'})">
                                <i class="fas fa-info-circle"></i> Detail
                            </button>
                            <button class="btn-secondary" onclick="playMovie('${sub.subjectId}', '${escHtml(sub.title)}')">
                                <i class="fas fa-play"></i> Tonton
                            </button>
                        </div>
                    </div>
                </div>`;
            });
            html += `<div class="hero-dots">`;
            banners.slice(0, CONFIG.HERO_BANNER_COUNT).forEach((_, i) => {
                html += `<button class="hero-dot ${i === 0 ? 'active' : ''}" data-slide="${i}" onclick="gotoHeroSlide(${i})"></button>`;
            });
            html += `</div></div></section>`;
        }

        // ─── Category Icons ───
        html += `<section class="container"><div class="categories-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:15px;margin-bottom:40px;">`;
        const cats = [
            { name: 'Global', icon: 'fa-globe', page: 'global', color: '#4361ee' },
            { name: 'Indonesia', icon: 'fa-flag', page: 'indonesia', color: '#e50914' },
            { name: 'Hollywood', icon: 'fa-film', page: 'hollywood', color: '#f5c518' },
            { name: 'Asia', icon: 'fa-earth-asia', page: 'asia', color: '#06d6a0' },
            { name: 'Horror', icon: 'fa-ghost', page: 'horror', color: '#7209b7' },
            { name: 'Animasi', icon: 'fa-dragon', page: 'animasi', color: '#fb5607' },
            { name: 'K-Drama', icon: 'fa-tv', page: 'series-kdrama', color: '#e63946' },
            { name: 'Anime', icon: 'fa-crown', page: 'series-anime', color: '#f72585' },
            { name: 'C-Drama', icon: 'fa-bolt', page: 'series-cdrama', color: '#4cc9f0' },
            { name: 'Barat', icon: 'fa-globe-americas', page: 'series-barat', color: '#2ec4b6' },
        ];
        cats.forEach((c) => {
            html += `<a href="#" onclick="navigate('${c.page}')" 
                style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:25px 15px;background:var(--bg-card);border-radius:var(--radius);text-decoration:none;color:var(--text-primary);transition:var(--transition);border:1px solid rgba(255,255,255,0.05);"
                onmouseover="this.style.borderColor='${c.color}';this.style.transform='translateY(-5px)'"
                onmouseout="this.style.borderColor='transparent';this.style.transform='none'">
                <i class="fas ${c.icon}" style="font-size:2rem;color:${c.color};margin-bottom:10px;"></i>
                <span style="font-weight:600;font-size:0.9rem;">${c.name}</span>
            </a>`;
        });
        html += `</div></section>`;

        // ─── Rows ───
        if (globalData.data && globalData.data.subjects) {
            html += renderSection('🌍', 'Global', globalData.data.subjects.slice(0, 10), 'global');
        }
        if (indoData.data && indoData.data.subjects) {
            html += renderSection('🇮🇩', 'Indonesia', indoData.data.subjects.slice(0, 10), 'indonesia');
        }
        if (holData.data && holData.data.subjects) {
            html += renderSection('🇺🇸', 'Hollywood', holData.data.subjects.slice(0, 10), 'hollywood');
        }
        if (kdramaData.data && kdramaData.data.subjects) {
            html += renderSection('📺', 'K-Drama Series', kdramaData.data.subjects.slice(0, 10), 'series-kdrama');
        }

        $('pageContent').innerHTML = html;
        startHeroAutoplay();
    } catch (err) {
        console.error('Home load error:', err);
        hideLoader();
        $('pageContent').innerHTML = `<div class="container empty-state"><i class="fas fa-exclamation-triangle" style="color:var(--primary)"></i><p>Gagal memuat data. Coba refresh halaman.</p><p style="font-size:0.8rem;color:var(--text-muted)">${err.message}</p></div>`;
    }
}

function renderSection(icon, title, subjects, page) {
    let html = `<section class="container" style="margin-bottom:40px;">
        <div class="section-header">
            <h2><span class="section-icon">${icon}</span> ${title}</h2>
            <button class="view-all" onclick="navigate('${page}')">Lihat Semua <i class="fas fa-arrow-right"></i></button>
        </div>
        <div class="movie-grid">`;
    subjects.forEach((s) => { html += renderMovieCard(s); });
    html += `</div></section>`;
    return html;
}

function renderMovieCard(s) {
    const img = s.cover?.url || 'https://via.placeholder.com/300x450/1a1a2e/666?text=No+Image';
    return `
    <div class="movie-card" onclick="navigate('detail', {subjectId:'${s.subjectId}')">
        <div class="movie-card-poster">
            <img src="${img}" alt="${escHtml(s.title)}" loading="lazy"
                 onerror="this.src='https://via.placeholder.com/300x450/1a1a2e/666?text=No+Image'">
            <div class="movie-card-overlay">
                <div class="play-btn-small"><i class="fas fa-play"></i></div>
            </div>
        </div>
        <div class="movie-card-info">
            <h3 title="${escHtml(s.title)}">${escHtml(s.title)}</h3>
            <div class="card-meta">
                ${s.imdbRate || s.imdbRatingValue ? `<span class="imdb"><i class="fas fa-star"></i> ${s.imdbRate || s.imdbRatingValue}</span>` : ''}
                ${s.releaseDate ? `<span>${(s.releaseDate + '').substring(0, 4)}</span>` : ''}
                ${getTypeBadge(s.subjectType)}
            </div>
        </div>
    </div>`;
}

function escHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ==========================================
// HERO CAROUSEL
// ==========================================

function gotoHeroSlide(index) {
    currentSlide = index;
    qsa('.hero-slide').forEach((s, i) => s.classList.toggle('active', i === index));
    qsa('.hero-dot').forEach((d, i) => d.classList.toggle('active', i === index));
}

function startHeroAutoplay() {
    const slides = qsa('.hero-slide');
    if (slides.length < 2) return;
    if (heroInterval) clearInterval(heroInterval);
    heroInterval = setInterval(() => {
        gotoHeroSlide((currentSlide + 1) % slides.length);
    }, 5000);
}

// ==========================================
// RANKING PAGES
// ==========================================

async function loadRanking(type) {
    try {
        const url = `${CONFIG.API_BASE}/moviebox/${type}?page=${currentParams.page}&perPage=${CONFIG.PER_PAGE}`;
        const res = await fetch(url);
        const data = await res.json();
        currentData = data;
        hideLoader();

        const titleMap = {
            global: '🌍 Global',
            indonesia: '🇮🇩 Indonesia',
            hollywood: '🇺🇸 Hollywood',
            asia: '🌏 Asia',
            horror: '👻 Horror',
            animasi: '🐉 Animasi',
        };

        let html = `<div class="container" style="padding-top:30px;">
            <div class="section-header"><h2>${titleMap[type] || type}</h2></div>`;

        if (data.data && data.data.subjects && data.data.subjects.length > 0) {
            html += `<div class="movie-grid">`;
            data.data.subjects.forEach((s) => { html += renderMovieCard(s); });
            html += `</div>${renderPagination()}`;
        } else {
            html += `<div class="empty-state"><i class="fas fa-film"></i><p>Tidak ada data.</p></div>`;
        }
        html += `</div>`;
        $('pageContent').innerHTML = html;
    } catch (err) {
        console.error('Ranking load error:', err);
        hideLoader();
        $('pageContent').innerHTML = `<div class="container empty-state"><i class="fas fa-exclamation-triangle" style="color:var(--primary)"></i><p>Gagal memuat data.</p></div>`;
    }
}

// ==========================================
// SERIES PAGES
// ==========================================

async function loadSeries(type) {
    try {
        const url = `${CONFIG.API_BASE}/moviebox/series/${type}?page=${currentParams.page}&perPage=${CONFIG.PER_PAGE}`;
        const res = await fetch(url);
        const data = await res.json();
        currentData = data;
        hideLoader();

        const titleMap = {
            kdrama: '📺 K-Drama', indo: '🇮🇩 Indo Drama', anime: '🇯🇵 Anime',
            barat: '🌎 Series Barat', cdrama: '🇨🇳 C-Drama', thai: '🇹🇭 Thai-Drama',
            reality: '🎯 Reality',
        };

        let html = `<div class="container" style="padding-top:30px;">
            <div class="section-header"><h2>${titleMap[type] || 'Series'}</h2></div>`;

        if (data.data && data.data.subjects && data.data.subjects.length > 0) {
            html += `<div class="movie-grid">`;
            data.data.subjects.forEach((s) => { html += renderMovieCard(s); });
            html += `</div>${renderPagination()}`;
        } else {
            html += `<div class="empty-state"><i class="fas fa-tv"></i><p>Tidak ada data.</p></div>`;
        }
        html += `</div>`;
        $('pageContent').innerHTML = html;
    } catch (err) {
        console.error('Series load error:', err);
        hideLoader();
        $('pageContent').innerHTML = `<div class="container empty-state"><i class="fas fa-exclamation-triangle" style="color:var(--primary)"></i><p>Gagal memuat data.</p></div>`;
    }
}

// ==========================================
// DETAIL PAGE
// ==========================================

async function loadDetail(subjectId) {
    try {
        const res = await fetch(`${CONFIG.API_BASE}/moviebox/detail?subjectId=${subjectId}`);
        const data = await res.json();
        if (data.code !== 0 || !data.data) throw new Error('Data tidak ditemukan');

        const d = data.data;
        const isSeries = d.subjectType === 2;
        const genres = d.genre ? d.genre.split(',').map((g) => g.trim()) : [];
        const cast = d.staffList ? d.staffList.filter((s) => s.staffType === 1) : [];
        hideLoader();

        let html = `
        <div class="container" style="padding-top:30px;">
            <div class="detail-header">
                <div class="detail-backdrop" style="background-image:url('${d.cover?.url || ''}')"></div>
                <div class="detail-backdrop-overlay"></div>
                <div class="detail-content">
                    <div class="detail-poster">
                        <img src="${d.cover?.url || 'https://via.placeholder.com/300x450/1a1a2e/666?text=No+Image'}" 
                             alt="${escHtml(d.title)}"
                             onerror="this.src='https://via.placeholder.com/300x450/1a1a2e/666?text=No+Image'">
                    </div>
                    <div class="detail-info">
                        <h1>${escHtml(d.title)}</h1>
                        <div class="detail-meta">
                            ${d.releaseDate ? `<span><i class="fas fa-calendar"></i> ${formatDate(d.releaseDate)}</span>` : ''}
                            ${d.duration ? `<span><i class="fas fa-clock"></i> ${d.duration}</span>` : ''}
                            ${d.imdbRatingValue ? `<span class="imdb-rating"><i class="fas fa-star"></i> IMDb ${d.imdbRatingValue}</span>` : ''}
                            ${d.countryName ? `<span><i class="fas fa-map-pin"></i> ${escHtml(d.countryName)}</span>` : ''}
                            ${d.language ? `<span><i class="fas fa-language"></i> ${escHtml(d.language)}</span>` : ''}
                            ${isSeries ? '<span><i class="fas fa-list"></i> Series</span>' : '<span><i class="fas fa-film"></i> Movie</span>'}
                            ${d.viewers ? `<span><i class="fas fa-eye"></i> ${d.viewers.toLocaleString()} viewers</span>` : ''}
                        </div>
                        <div class="detail-genre">${genres.map((g) => `<span>${escHtml(g)}</span>`).join('')}</div>
                        <p class="detail-desc">${d.description || 'Tidak ada deskripsi.'}</p>
                        <div class="detail-actions">
                            <button class="btn-primary" onclick="playMovie('${d.subjectId}', '${escHtml(d.title)}')">
                                <i class="fas fa-play"></i> Putar Video
                            </button>
                            <button class="btn-secondary" onclick="downloadMovie('${d.subjectId}', '${escHtml(d.title)}')">
                                <i class="fas fa-download"></i> Download
                            </button>
                        </div>
                        ${cast.length > 0 ? `
                        <div class="detail-cast">
                            <h3><i class="fas fa-users"></i> Pemain</h3>
                            <div class="cast-grid">
                                ${cast.slice(0, 10).map((c) => `
                                    <div class="cast-item">
                                        <img src="${c.avatarUrl || 'https://via.placeholder.com/60x60/1a1a2e/666?text=' + c.name.charAt(0)}" 
                                             alt="${escHtml(c.name)}"
                                             onerror="this.src='https://via.placeholder.com/60x60/1a1a2e/666?text=${c.name.charAt(0)}'">
                                        <div class="cast-name">${escHtml(c.name)}</div>
                                        <div class="cast-role">${escHtml(c.character)}</div>
                                    </div>`).join('')}
                            </div>
                        </div>` : ''}
                    </div>
                </div>
            </div>
        </div>`;

        // ─── Episodes / Download Section ───
        html += `<div class="container section-episodes">`;

        if (isSeries) {
            html += `<h3><i class="fas fa-list-ol"></i> Episode</h3><div class="episode-list">`;
            try {
                const dlRes = await fetch(`${CONFIG.API_BASE}/moviebox/download-series?subjectId=${d.subjectId}&season=1&resolution=360`);
                const dlData = await dlRes.json();
                if (dlData.data && dlData.data.episodes) {
                    dlData.data.episodes.forEach((ep) => {
                        html += `
                        <div class="episode-card">
                            <div class="ep-info">
                                <h4>Episode ${ep.ep}</h4>
                                <p>${ep.title || `Season ${ep.se} - Episode ${ep.ep}`} • ${formatSize(ep.size)}</p>
                            </div>
                            <div class="ep-actions">
                                <button class="btn-play-ep" onclick='openPlayer("${ep.resourceLink}", "${escHtml(d.title)} - Episode ${ep.ep}")'>
                                    <i class="fas fa-play"></i>
                                </button>
                                <a href="${ep.resourceLink}" target="_blank" class="btn-download-ep" download>
                                    <i class="fas fa-download"></i>
                                </a>
                            </div>
                        </div>`;
                    });
                }
            } catch (e) {
                html += `<p style="color:var(--text-muted)">Gunakan tombol Download untuk mengunduh episode.</p>`;
            }
            html += `</div>`;
        } else {
            html += `<h3><i class="fas fa-download"></i> Download & Resolusi</h3>
            <div class="resolution-tabs" id="resolutionTabs">
                <button class="resolution-tab active" onclick="selectResolution('${d.subjectId}', 360, this)">360P</button>
                <button class="resolution-tab" onclick="selectResolution('${d.subjectId}', 480, this)">480P</button>
                <button class="resolution-tab" onclick="selectResolution('${d.subjectId}', 720, this)">720P</button>
                <button class="resolution-tab" onclick="selectResolution('${d.subjectId}', 1080, this)">1080P</button>
            </div>
            <div id="downloadInfo"><div class="episode-list">`;

            try {
                const dlRes = await fetch(`${CONFIG.API_BASE}/moviebox/download-movie?subjectId=${d.subjectId}&resolution=360`);
                const dlData = await dlRes.json();
                if (dlData.data && dlData.data.files) {
                    dlData.data.files.forEach((f) => {
                        html += `
                        <div class="episode-card">
                            <div class="ep-info">
                                <h4>${f.resolution}P</h4>
                                <p>${(f.codecName || 'H.264').toUpperCase()} • ${formatSize(f.size)}</p>
                            </div>
                            <div class="ep-actions">
                                <button class="btn-play-ep" onclick='openPlayer("${f.resourceLink}", "${escHtml(d.title)} - ${f.resolution}P")'>
                                    <i class="fas fa-play"></i> Putar
                                </button>
                                <a href="${f.resourceLink}" target="_blank" class="btn-download-ep" download>
                                    <i class="fas fa-download"></i> Download
                                </a>
                            </div>
                        </div>`;
                    });
                }
            } catch (e) {
                html += `<p style="color:var(--text-muted)">Tidak ada data download tersedia.</p>`;
            }
            html += `</div></div>`;
        }
        html += `</div>`;
        $('pageContent').innerHTML = html;
    } catch (err) {
        console.error('Detail load error:', err);
        hideLoader();
        $('pageContent').innerHTML = `<div class="container empty-state" style="padding-top:50px;"><i class="fas fa-exclamation-triangle" style="color:var(--primary)"></i><p>Gagal memuat detail.</p></div>`;
    }
}

// ==========================================
// RESOLUTION SELECTOR
// ==========================================

async function selectResolution(subjectId, resolution, btn) {
    qsa('.resolution-tab').forEach((t) => t.classList.remove('active'));
    btn.classList.add('active');
    const infoDiv = $('downloadInfo');
    infoDiv.innerHTML = `<div style="display:flex;justify-content:center;padding:30px;"><div class="loader"></div></div>`;

    try {
        const res = await fetch(`${CONFIG.API_BASE}/moviebox/download-movie?subjectId=${subjectId}&resolution=${resolution}`);
        const data = await res.json();
        if (data.data && data.data.files) {
            let html = `<div class="episode-list">`;
            data.data.files.forEach((f) => {
                html += `
                <div class="episode-card">
                    <div class="ep-info">
                        <h4>${f.resolution}P</h4>
                        <p>${(f.codecName || 'H.264').toUpperCase()} • ${formatSize(f.size)}</p>
                    </div>
                    <div class="ep-actions">
                        <button class="btn-play-ep" onclick='openPlayer("${f.resourceLink}", "${escHtml(data.data.title)} - ${f.resolution}P")'>
                            <i class="fas fa-play"></i> Putar
                        </button>
                        <a href="${f.resourceLink}" target="_blank" class="btn-download-ep" download>
                            <i class="fas fa-download"></i> Download
                        </a>
                    </div>
                </div>`;
            });
            html += `</div>`;
            if (data.data.subtitle) {
                html += `<div style="margin-top:15px;padding:15px;background:var(--bg-card);border-radius:var(--radius-sm);">
                    <p style="color:var(--text-muted);font-size:0.85rem;">
                        <i class="fas fa-closed-captioning"></i> Subtitle: ${data.data.subtitle.lanName}
                        <a href="${data.data.subtitle.url}" target="_blank" style="color:var(--primary);margin-left:10px;">Download SRT</a>
                    </p>
                </div>`;
            }
            infoDiv.innerHTML = html;
        } else {
            infoDiv.innerHTML = `<p style="color:var(--text-muted);text-align:center;padding:20px;">Resolusi tidak tersedia.</p>`;
        }
    } catch (err) {
        infoDiv.innerHTML = `<p style="color:var(--text-muted);text-align:center;padding:20px;">Gagal memuat data.</p>`;
    }
}

// ==========================================
// PLAY MOVIE
// ==========================================

async function playMovie(subjectId, title) {
    try {
        const res = await fetch(`${CONFIG.API_BASE}/moviebox/download-movie?subjectId=${subjectId}&resolution=0`);
        const data = await res.json();
        if (data.data && data.data.files && data.data.files.length > 0) {
            openPlayer(data.data.files[0].resourceLink, title);
        } else {
            showToast('Tidak ada sumber video yang tersedia.');
        }
    } catch (err) {
        showToast('Gagal memuat video.');
    }
}

// ==========================================
// DOWNLOAD MOVIE
// ==========================================

async function downloadMovie(subjectId, title) {
    try {
        const res = await fetch(`${CONFIG.API_BASE}/moviebox/download-movie?subjectId=${subjectId}&resolution=720`);
        const data = await res.json();
        if (data.data && data.data.files && data.data.files.length > 0) {
            const best = data.data.files.reduce((a, b) => (a.resolution > b.resolution ? a : b));
            window.open(best.resourceLink, '_blank');
            showToast(`Downloading ${title} - ${best.resolution}P`);
        } else {
            showToast('Tidak ada link download.');
        }
    } catch (err) {
        showToast('Gagal mendapatkan link download.');
    }
}

// ==========================================
// OPEN VIDEO PLAYER
// ==========================================

function openPlayer(videoUrl, title) {
    $('modalTitle').textContent = title || 'Player';
    const player = $('videoPlayer');
    player.src = videoUrl;
    player.load();
    $('downloadBtn').href = videoUrl;
    $('videoModal').classList.add('active');
}

function closeModal(e) {
    if (e && e.target !== $('videoModal')) return;
    $('videoModal').classList.remove('active');
    $('videoPlayer').pause();
    $('videoPlayer').src = '';
}

// ==========================================
// SEARCH
// ==========================================

function toggleSearch() {
    $('searchBar').classList.toggle('active');
    if ($('searchBar').classList.contains('active')) $('searchInput').focus();
}

async function searchMovies(query) {
    const q = query || $('searchInput').value.trim();
    if (!q) return;
    $('searchBar').classList.remove('active');
    showLoader();

    try {
        const url = `${CONFIG.API_BASE}/moviebox/search?keyword=${encodeURIComponent(q)}&page=${currentParams.page}&perPage=${CONFIG.PER_PAGE}`;
        const res = await fetch(url);
        const data = await res.json();
        hideLoader();

        let html = `<div class="container" style="padding-top:30px;">
            <div class="search-results-info">
                <h2><i class="fas fa-search"></i> Hasil Pencarian: "${escHtml(q)}"</h2>
            </div>`;

        const items = [];
        if (data.data && data.data.results) {
            data.data.results.forEach((item) => {
                if (item.topicType === 'SUBJECT' && item.subjects) {
                    item.subjects.forEach((s) => items.push(s));
                }
            });
        }

        if (items.length > 0) {
            html += `<div class="movie-grid">`;
            items.forEach((s) => { html += renderMovieCard(s); });
            html += `</div>`;
        } else {
            html += `<div class="empty-state"><i class="fas fa-search-minus"></i><p>Tidak ada hasil untuk "${escHtml(q)}"</p></div>`;
        }
        html += `</div>`;
        $('pageContent').innerHTML = html;
    } catch (err) {
        hideLoader();
        $('pageContent').innerHTML = `<div class="container empty-state" style="padding-top:50px;"><i class="fas fa-exclamation-triangle" style="color:var(--primary)"></i><p>Gagal mencari.</p></div>`;
    }
}

// ==========================================
// PAGINATION
// ==========================================

function renderPagination() {
    const page = currentParams.page;
    return `
    <div class="pagination">
        <button ${page <= 1 ? 'disabled' : ''} onclick="changePage(${page - 1})">
            <i class="fas fa-chevron-left"></i> Sebelumnya
        </button>
        <span>Halaman ${page}</span>
        <button onclick="changePage(${page + 1})">
            Selanjutnya <i class="fas fa-chevron-right"></i>
        </button>
    </div>`;
}

function changePage(newPage) {
    currentParams.page = newPage;
    navigate(currentPage, { page: newPage });
}

// ==========================================
// MOBILE MENU
// ==========================================

function toggleMobileMenu() {
    $('navMenu').classList.toggle('active');
}

// ==========================================
// INIT
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    navigate('home');
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) $('navMenu').classList.remove('active');
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
});
