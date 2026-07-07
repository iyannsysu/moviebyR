// ==========================================
// Movie Free by R v2.0 - Main Application
// ==========================================

let currentPage = 'home';
let currentData = null;
let currentParams = { page: 1 };
let heroInterval = null;
let currentSlide = 0;

// ==========================================
// DOM HELPERS
// ==========================================

const $ = id => document.getElementById(id);
const qs = sel => document.querySelector(sel);
const qsa = sel => document.querySelectorAll(sel);

function escAttr(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatDate(d) {
    if (!d) return '';
    try { return new Date(d).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }); }
    catch (e) { return d; }
}

function formatSize(b) {
    if (!b) return '';
    const mb = parseInt(b) / (1024 * 1024);
    return mb > 1024 ? (mb / 1024).toFixed(1) + ' GB' : mb.toFixed(0) + ' MB';
}

function getImdb(s) { return s.imdbRatingValue || s.imdbRate || ''; }

const PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 300 450%22%3E%3Crect fill=%22%231a1a2e%22 width=%22300%22 height=%22450%22/%3E%3Ctext x=%22150%22 y=%22225%22 text-anchor=%22middle%22 fill=%22%23666%22 font-size=%2218%22 font-family=%22sans-serif%22%3ENo Image%3C/text%3E%3C/svg%3E';

function showLoader() {
    const l = $('loader');
    if (l) l.style.display = 'flex';
    const pc = $('pageContent');
    if (pc) pc.innerHTML = '';
}

function hideLoader() {
    const l = $('loader');
    if (l) l.style.display = 'none';
}

function toast(msg) {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#e50914;color:#fff;padding:12px 24px;border-radius:8px;z-index:9999;font-weight:600;box-shadow:0 4px 20px rgba(0,0,0,0.5);font-size:14px;max-width:90vw;text-align:center;';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 400); }, 3000);
}

// ==========================================
// API FETCH
// ==========================================

async function api(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return await res.json();
    } catch (e) {
        console.error('API Error [' + url.split('?')[0].split('/').pop() + ']: ' + e.message);
        return null;
    }
}

function imgUrl(obj) {
    if (!obj) return PLACEHOLDER;
    if (typeof obj === 'string') return obj || PLACEHOLDER;
    if (obj && obj.url) return obj.url;
    return PLACEHOLDER;
}

// ==========================================
// NAVIGATION
// ==========================================

function navigate(page, params) {
    params = params || {};
    if (heroInterval) { clearInterval(heroInterval); heroInterval = null; }
    currentPage = page;
    currentParams = Object.assign({}, currentParams, params, { page: params.page || 1 });

    qsa('.nav-link').forEach(function(l) { l.classList.remove('active'); });
    var map = { home:'home', global:'global', indonesia:'indonesia', hollywood:'hollywood', asia:'asia', horror:'horror', animasi:'animasi', series:'series', 'series-kdrama':'series', 'series-indo':'series', 'series-anime':'series', 'series-barat':'series', 'series-cdrama':'series', 'series-thai':'series' };
    var el = qs('.nav-link[data-page="' + (map[page] || 'home') + '"]');
    if (el) el.classList.add('active');
    if ($('navMenu')) $('navMenu').classList.remove('active');

    showLoader();
    window.scrollTo({ top: 0, behavior: 'smooth' });

    var handlers = {
        home: function() { loadHome(); },
        global: function() { loadList('global'); },
        indonesia: function() { loadList('indonesia'); },
        hollywood: function() { loadList('hollywood'); },
        asia: function() { loadList('asia'); },
        horror: function() { loadList('horror'); },
        animasi: function() { loadList('animasi'); },
        detail: function() { loadDetail(params.subjectId); },
        search: function() { searchMovies(params.query); },
        series: function() { loadSeries('kdrama'); },
        'series-kdrama': function() { loadSeries('kdrama'); },
        'series-indo': function() { loadSeries('indo'); },
        'series-anime': function() { loadSeries('anime'); },
        'series-barat': function() { loadSeries('barat'); },
        'series-cdrama': function() { loadSeries('cdrama'); },
        'series-thai': function() { loadSeries('thai'); }
    };
    (handlers[page] || loadHome)();
}

function changePage(np) {
    currentParams.page = np;
    navigate(currentPage, { page: np });
}

// ==========================================
// RENDER CARD
// ==========================================

function cardClick(sid) {
    navigate('detail', { subjectId: sid });
}

function renderMovieCard(s) {
    if (!s || !s.subjectId) return '';
    var img = imgUrl(s.cover);
    var title = escHtml(s.title || 'Untitled');
    var imdb = getImdb(s);
    var year = s.releaseDate ? String(s.releaseDate).substring(0, 4) : '';
    var isSeries = s.subjectType === 2;
    var sid = s.subjectId;

    return '<div class="movie-card" onclick="cardClick(\'' + sid + '\')">' +
        '<div class="movie-card-poster">' +
            '<img src="' + img + '" alt="' + title + '" loading="lazy" onerror="this.src=\'' + PLACEHOLDER + '\'">' +
            '<div class="movie-card-overlay"><div class="play-btn-small"><i class="fas fa-play"></i></div></div>' +
        '</div>' +
        '<div class="movie-card-info">' +
            '<h3 title="' + title + '">' + title + '</h3>' +
            '<div class="card-meta">' +
                (imdb ? '<span class="imdb"><i class="fas fa-star"></i> ' + imdb + '</span>' : '') +
                (year ? '<span>' + year + '</span>' : '') +
                '<span class="type-badge ' + (isSeries ? 'series-badge' : '') + '">' + (isSeries ? 'Series' : 'Movie') + '</span>' +
            '</div>' +
        '</div>' +
    '</div>';
}

function renderGrid(subjects) {
    if (!subjects || subjects.length === 0) return '<div class="empty-state"><i class="fas fa-film"></i><p>Tidak ada data.</p></div>';
    return '<div class="movie-grid">' + subjects.map(renderMovieCard).join('') + '</div>';
}

function renderSection(icon, title, subjects, page) {
    if (!subjects || subjects.length === 0) return '';
    return '<section class="container" style="margin-bottom:40px">' +
        '<div class="section-header">' +
            '<h2><span class="section-icon">' + icon + '</span> ' + title + '</h2>' +
            '<button class="view-all" onclick="navigate(\'' + page + '\')">Lihat Semua <i class="fas fa-arrow-right"></i></button>' +
        '</div>' +
        renderGrid(subjects) +
    '</section>';
}

function renderPagination() {
    var p = currentParams.page;
    return '<div class="pagination">' +
        '<button ' + (p <= 1 ? 'disabled' : '') + ' onclick="changePage(' + (p - 1) + ')"><i class="fas fa-chevron-left"></i> Sebelumnya</button>' +
        '<span>Halaman ' + p + '</span>' +
        '<button onclick="changePage(' + (p + 1) + ')">Selanjutnya <i class="fas fa-chevron-right"></i></button>' +
    '</div>';
}

// ==========================================
// HOME
// ==========================================

function loadHome() {
    var urls = [
        CONFIG.API_BASE + '/moviebox/homepage',
        CONFIG.API_BASE + '/moviebox/global?page=1&perPage=' + CONFIG.PER_PAGE,
        CONFIG.API_BASE + '/moviebox/indonesia?page=1&perPage=10',
        CONFIG.API_BASE + '/moviebox/hollywood?page=1&perPage=10',
        CONFIG.API_BASE + '/moviebox/series/kdrama?page=1&perPage=10'
    ];

    Promise.all(urls.map(api)).then(function(results) {
        var home = results[0], global = results[1], indo = results[2], hol = results[3], kdrama = results[4];
        hideLoader();

        var html = '';

        // HERO BANNER
        if (home && home.data && home.data.items) {
            var banners = [];
            home.data.items.forEach(function(item) {
                if (item.banner && item.banner.banners) {
                    item.banner.banners.forEach(function(b) { if (b.subject) banners.push(b); });
                }
            });
            if (banners.length > 0) {
                html += '<section class="hero-section"><div class="hero-carousel" id="heroCarousel">';
                banners.slice(0, 6).forEach(function(b, i) {
                    var sub = b.subject;
                    var g = sub.genre ? sub.genre.split(',').map(function(x) { return x.trim(); }).slice(0, 3) : [];
                    var bg = imgUrl(sub.cover);
                    var imdb = getImdb(sub);
                    var sid = sub.subjectId;
                    html += '<div class="hero-slide' + (i === 0 ? ' active' : '') + '">' +
                        '<div class="hero-slide-bg" style="background-image:url(\'' + bg + '\')"></div>' +
                        '<div class="hero-slide-content">' +
                            '<h2>' + escHtml(sub.title) + '</h2>' +
                            '<div class="hero-meta">' +
                                (sub.releaseDate ? '<span><i class="fas fa-calendar"></i> ' + sub.releaseDate + '</span>' : '') +
                                (imdb ? '<span><i class="fas fa-star" style="color:var(--accent)"></i> ' + imdb + '</span>' : '') +
                            '</div>' +
                            '<div class="hero-genre">' + g.map(function(x) { return '<span>' + escHtml(x) + '</span>'; }).join('') + '</div>' +
                            '<div class="hero-actions">' +
                                '<button class="btn-primary" onclick="navigate(\'detail\',{subjectId:\'' + sid + '\'})"><i class="fas fa-info-circle"></i> Detail</button>' +
                                '<button class="btn-secondary" onclick="playMovie(\'' + sid + '\')"><i class="fas fa-play"></i> Tonton</button>' +
                            '</div>' +
                        '</div>' +
                    '</div>';
                });
                html += '<div class="hero-dots">';
                banners.slice(0, 6).forEach(function(_, i) {
                    html += '<button class="hero-dot' + (i === 0 ? ' active' : '') + '" onclick="gotoHeroSlide(' + i + ')"></button>';
                });
                html += '</div></div></section>';
            }
        }

        // CATEGORY ICONS
        html += '<section class="container"><div class="categories-grid">';
        var cats = [
            { n:'Global', i:'fa-globe', p:'global', c:'#4361ee' },
            { n:'Indonesia', i:'fa-flag', p:'indonesia', c:'#e50914' },
            { n:'Hollywood', i:'fa-film', p:'hollywood', c:'#f5c518' },
            { n:'Asia', i:'fa-earth-asia', p:'asia', c:'#06d6a0' },
            { n:'Horror', i:'fa-ghost', p:'horror', c:'#7209b7' },
            { n:'Animasi', i:'fa-dragon', p:'animasi', c:'#fb5607' },
            { n:'K-Drama', i:'fa-tv', p:'series-kdrama', c:'#e63946' },
            { n:'Anime', i:'fa-crown', p:'series-anime', c:'#f72585' },
            { n:'C-Drama', i:'fa-bolt', p:'series-cdrama', c:'#4cc9f0' },
            { n:'Barat', i:'fa-globe-americas', p:'series-barat', c:'#2ec4b6' }
        ];
        cats.forEach(function(c) {
            html += '<a href="#" onclick="navigate(\'' + c.p + '\')" class="cat-item" style="--cat-color:' + c.c + '">' +
                '<i class="fas ' + c.i + '"></i><span>' + c.n + '</span></a>';
        });
        html += '</div></section>';

        // CONTENT ROWS
        var sections = [
            { icon:'🌍', title:'Global', data:global, page:'global' },
            { icon:'🇮🇩', title:'Indonesia', data:indo, page:'indonesia' },
            { icon:'🇺🇸', title:'Hollywood', data:hol, page:'hollywood' },
            { icon:'📺', title:'K-Drama', data:kdrama, page:'series-kdrama' }
        ];
        sections.forEach(function(s) {
            var subs = s.data && s.data.data && s.data.data.subjects ? s.data.data.subjects.slice(0, 10) : null;
            if (subs) html += renderSection(s.icon, s.title, subs, s.page);
        });

        var pc = $('pageContent');
        if (pc) pc.innerHTML = html || '<div class="container empty-state"><i class="fas fa-frown"></i><p>Tidak ada data.</p></div>';
        startHeroAutoplay();
    }).catch(function(err) {
        console.error('Home:', err);
        hideLoader();
        var pc = $('pageContent');
        if (pc) pc.innerHTML = '<div class="container empty-state"><i class="fas fa-exclamation-triangle" style="color:var(--primary)"></i><p>Gagal memuat data.</p><button class="btn-primary" style="margin-top:15px" onclick="navigate(\'home\')"><i class="fas fa-redo"></i> Coba Lagi</button></div>';
    });
}

// ==========================================
// HERO
// ==========================================

function gotoHeroSlide(i) {
    currentSlide = i;
    qsa('.hero-slide').forEach(function(s, idx) { s.classList.toggle('active', idx === i); });
    qsa('.hero-dot').forEach(function(d, idx) { d.classList.toggle('active', idx === i); });
}

function startHeroAutoplay() {
    var slides = qsa('.hero-slide');
    if (slides.length < 2) return;
    if (heroInterval) clearInterval(heroInterval);
    heroInterval = setInterval(function() { gotoHeroSlide((currentSlide + 1) % slides.length); }, 5000);
}

// ==========================================
// LIST PAGES
// ==========================================

function loadList(type) {
    api(CONFIG.API_BASE + '/moviebox/' + type + '?page=' + currentParams.page + '&perPage=' + CONFIG.PER_PAGE).then(function(data) {
        hideLoader();
        currentData = data;
        var titles = { global:'Global', indonesia:'Indonesia', hollywood:'Hollywood', asia:'Asia', horror:'Horror', animasi:'Animasi' };
        var subs = data && data.data && data.data.subjects ? data.data.subjects : [];
        var pc = $('pageContent');
        if (pc) pc.innerHTML = '<div class="container" style="padding-top:30px">' +
            '<div class="section-header"><h2>' + (titles[type] || type) + '</h2></div>' +
            (subs.length > 0 ? renderGrid(subs) + renderPagination() : '<div class="empty-state"><i class="fas fa-film"></i><p>Tidak ada data.</p></div>') +
        '</div>';
    }).catch(function() {
        hideLoader();
        var pc = $('pageContent');
        if (pc) pc.innerHTML = '<div class="container empty-state"><i class="fas fa-exclamation-triangle" style="color:var(--primary)"></i><p>Gagal memuat data.</p></div>';
    });
}

// ==========================================
// SERIES PAGES
// ==========================================

function loadSeries(type) {
    api(CONFIG.API_BASE + '/moviebox/series/' + type + '?page=' + currentParams.page + '&perPage=' + CONFIG.PER_PAGE).then(function(data) {
        hideLoader();
        currentData = data;
        var titles = { kdrama:'K-Drama', indo:'Indo Drama', anime:'Anime', barat:'Series Barat', cdrama:'C-Drama', thai:'Thai-Drama', reality:'Reality' };
        var subs = data && data.data && data.data.subjects ? data.data.subjects : [];
        var pc = $('pageContent');
        if (pc) pc.innerHTML = '<div class="container" style="padding-top:30px">' +
            '<div class="section-header"><h2>' + (titles[type] || 'Series') + '</h2></div>' +
            (subs.length > 0 ? renderGrid(subs) + renderPagination() : '<div class="empty-state"><i class="fas fa-tv"></i><p>Tidak ada data.</p></div>') +
        '</div>';
    }).catch(function() {
        hideLoader();
        var pc = $('pageContent');
        if (pc) pc.innerHTML = '<div class="container empty-state"><i class="fas fa-exclamation-triangle" style="color:var(--primary)"></i><p>Gagal memuat data.</p></div>';
    });
}

// ==========================================
// DETAIL
// ==========================================

function loadDetail(subjectId) {
    api(CONFIG.API_BASE + '/moviebox/detail?subjectId=' + subjectId).then(function(data) {
        hideLoader();
        if (!data || !data.data) {
            var pc = $('pageContent');
            if (pc) pc.innerHTML = '<div class="container empty-state" style="padding-top:50px"><i class="fas fa-exclamation-triangle" style="color:var(--primary)"></i><p>Detail tidak ditemukan.</p></div>';
            return;
        }

        var d = data.data;
        var isSeries = d.subjectType === 2;
        var genres = d.genre ? d.genre.split(',').map(function(g) { return g.trim(); }) : [];
        var cast = d.staffList ? d.staffList.filter(function(s) { return s.staffType === 1; }) : [];
        var img = imgUrl(d.cover);
        var imdb = getImdb(d);
        var sid = d.subjectId;

        var html = '<div class="container" style="padding-top:30px">' +
            '<div class="detail-header">' +
                '<div class="detail-backdrop" style="background-image:url(\'' + img + '\')"></div>' +
                '<div class="detail-backdrop-overlay"></div>' +
                '<div class="detail-content">' +
                    '<div class="detail-poster">' +
                        '<img src="' + img + '" alt="' + escHtml(d.title) + '" onerror="this.src=\'' + PLACEHOLDER + '\'">' +
                    '</div>' +
                    '<div class="detail-info">' +
                        '<h1>' + escHtml(d.title) + '</h1>' +
                        '<div class="detail-meta">' +
                            (d.releaseDate ? '<span><i class="fas fa-calendar"></i> ' + formatDate(d.releaseDate) + '</span>' : '') +
                            (d.duration ? '<span><i class="fas fa-clock"></i> ' + d.duration + '</span>' : '') +
                            (imdb ? '<span class="imdb-rating"><i class="fas fa-star"></i> IMDb ' + imdb + '</span>' : '') +
                            (d.countryName ? '<span><i class="fas fa-map-pin"></i> ' + escHtml(d.countryName) + '</span>' : '') +
                            (d.language ? '<span><i class="fas fa-language"></i> ' + escHtml(d.language) + '</span>' : '') +
                            '<span><i class="fas ' + (isSeries ? 'fa-list' : 'fa-film') + '"></i> ' + (isSeries ? 'Series' : 'Movie') + '</span>' +
                            (d.viewers ? '<span><i class="fas fa-eye"></i> ' + Number(d.viewers).toLocaleString() + ' viewers</span>' : '') +
                        '</div>' +
                        '<div class="detail-genre">' + genres.map(function(g) { return '<span>' + escHtml(g) + '</span>'; }).join('') + '</div>' +
                        '<p class="detail-desc">' + (d.description || 'Tidak ada deskripsi.') + '</p>' +
                        '<div class="detail-actions">' +
                            '<button class="btn-primary" onclick="playMovie(\'' + sid + '\')"><i class="fas fa-play"></i> Putar Video</button>' +
                            '<button class="btn-secondary" onclick="downloadMovie(\'' + sid + '\')"><i class="fas fa-download"></i> Download</button>' +
                        '</div>';

        if (cast.length > 0) {
            html += '<div class="detail-cast"><h3><i class="fas fa-users"></i> Pemain</h3><div class="cast-grid">';
            cast.slice(0, 10).forEach(function(c) {
                var av = c.avatarUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(c.name) + '&background=1a1a2e&color=fff&size=60';
                html += '<div class="cast-item"><img src="' + av + '" alt="' + escHtml(c.name) + '" onerror="this.src=\'https://ui-avatars.com/api/?name=' + encodeURIComponent(c.name) + '&background=1a1a2e&color=fff&size=60\'"><div class="cast-name">' + escHtml(c.name) + '</div><div class="cast-role">' + escHtml(c.character) + '</div></div>';
            });
            html += '</div></div>';
        }

        html += '</div></div></div></div>';

        // EPISODES / DOWNLOAD
        html += '<div class="container section-episodes">';

        if (isSeries) {
            html += '<h3><i class="fas fa-list-ol"></i> Episode</h3><div class="episode-list">';
            api(CONFIG.API_BASE + '/moviebox/download-series?subjectId=' + sid + '&season=1&resolution=360').then(function(dl) {
                if (dl && dl.data && dl.data.episodes) {
                    dl.data.episodes.forEach(function(ep) {
                        html += '<div class="episode-card">' +
                            '<div class="ep-info"><h4>Episode ' + ep.ep + '</h4><p>' + (ep.title || 'Season ' + ep.se + ' - Episode ' + ep.ep) + ' &bull; ' + formatSize(ep.size) + '</p></div>' +
                            '<div class="ep-actions">' +
                                '<button class="btn-play-ep" onclick="openPlayer(\'' + ep.resourceLink + '\',\'' + escHtml(d.title) + ' - Ep ' + ep.ep + '\')"><i class="fas fa-play"></i></button>' +
                                '<a href="' + ep.resourceLink + '" target="_blank" class="btn-download-ep" download><i class="fas fa-download"></i></a>' +
                            '</div>' +
                        '</div>';
                    });
                } else {
                    html += '<p style="color:var(--text-muted);grid-column:1/-1">Data episode tidak tersedia.</p>';
                }
                html += '</div>';
                var pc2 = $('pageContent');
                if (pc2) pc2.innerHTML = html + '</div>';
            });
            return; // Wait for async episode load
        } else {
            html += '<h3><i class="fas fa-download"></i> Download &amp; Resolusi</h3>' +
                '<div class="resolution-tabs" id="resolutionTabs">' +
                [360, 480, 720, 1080].map(function(r, i) {
                    return '<button class="resolution-tab' + (i === 0 ? ' active' : '') + '" onclick="selectResolution(\'' + sid + '\',' + r + ',this)">' + r + 'P</button>';
                }).join('') +
                '</div><div id="downloadInfo"><div class="episode-list">';
            api(CONFIG.API_BASE + '/moviebox/download-movie?subjectId=' + sid + '&resolution=360').then(function(dl) {
                if (dl && dl.data && dl.data.files) {
                    dl.data.files.forEach(function(f) {
                        html += '<div class="episode-card">' +
                            '<div class="ep-info"><h4>' + f.resolution + 'P</h4><p>' + (f.codecName || 'H.264').toUpperCase() + ' &bull; ' + formatSize(f.size) + '</p></div>' +
                            '<div class="ep-actions">' +
                                '<button class="btn-play-ep" onclick="openPlayer(\'' + f.resourceLink + '\',\'' + escHtml(d.title) + ' - ' + f.resolution + 'P\')"><i class="fas fa-play"></i> Putar</button>' +
                                '<a href="' + f.resourceLink + '" target="_blank" class="btn-download-ep" download><i class="fas fa-download"></i></a>' +
                            '</div>' +
                        '</div>';
                    });
                    if (dl.data.subtitle) {
                        html += '<div style="margin-top:15px;padding:15px;background:var(--bg-card);border-radius:var(--radius-sm)"><p style="color:var(--text-muted);font-size:.85rem"><i class="fas fa-closed-captioning"></i> Subtitle: ' + dl.data.subtitle.lanName + ' <a href="' + dl.data.subtitle.url + '" target="_blank" style="color:var(--primary);margin-left:10px">Download SRT</a></p></div>';
                    }
                } else {
                    html += '<p style="color:var(--text-muted);grid-column:1/-1">Data download tidak tersedia.</p>';
                }
                html += '</div></div></div>';
                var pc2 = $('pageContent');
                if (pc2) pc2.innerHTML = html;
            });
            return; // Wait for async download load
        }
    }).catch(function(err) {
        console.error('Detail:', err);
        hideLoader();
        var pc = $('pageContent');
        if (pc) pc.innerHTML = '<div class="container empty-state" style="padding-top:50px"><i class="fas fa-exclamation-triangle" style="color:var(--primary)"></i><p>Gagal memuat detail.</p></div>';
    });
}

// ==========================================
// RESOLUTION SELECTOR
// ==========================================

function selectResolution(sid, res, btn) {
    qsa('.resolution-tab').forEach(function(t) { t.classList.remove('active'); });
    btn.classList.add('active');
    var div = $('downloadInfo');
    if (!div) return;
    div.innerHTML = '<div style="display:flex;justify-content:center;padding:30px"><div class="loader"></div></div>';
    api(CONFIG.API_BASE + '/moviebox/download-movie?subjectId=' + sid + '&resolution=' + res).then(function(dl) {
        if (dl && dl.data && dl.data.files) {
            var h = '<div class="episode-list">';
            dl.data.files.forEach(function(f) {
                h += '<div class="episode-card"><div class="ep-info"><h4>' + f.resolution + 'P</h4><p>' + (f.codecName || 'H.264').toUpperCase() + ' &bull; ' + formatSize(f.size) + '</p></div><div class="ep-actions"><button class="btn-play-ep" onclick="openPlayer(\'' + f.resourceLink + '\',\'' + escHtml(dl.data.title) + ' - ' + f.resolution + 'P\')"><i class="fas fa-play"></i> Putar</button><a href="' + f.resourceLink + '" target="_blank" class="btn-download-ep" download><i class="fas fa-download"></i></a></div></div>';
            });
            h += '</div>';
            if (dl.data.subtitle) {
                h += '<div style="margin-top:15px;padding:15px;background:var(--bg-card);border-radius:var(--radius-sm)"><p style="color:var(--text-muted);font-size:.85rem"><i class="fas fa-closed-captioning"></i> Subtitle: ' + dl.data.subtitle.lanName + ' <a href="' + dl.data.subtitle.url + '" target="_blank" style="color:var(--primary);margin-left:10px">Download SRT</a></p></div>';
            }
            div.innerHTML = h;
        } else {
            div.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px">Resolusi tidak tersedia.</p>';
        }
    });
}

// ==========================================
// PLAY / DOWNLOAD
// ==========================================

function playMovie(sid) {
    api(CONFIG.API_BASE + '/moviebox/download-movie?subjectId=' + sid + '&resolution=0').then(function(dl) {
        if (dl && dl.data && dl.data.files && dl.data.files.length > 0) {
            openPlayer(dl.data.files[0].resourceLink, dl.data.title || 'Movie');
        } else {
            toast('Tidak ada sumber video.');
        }
    });
}

function downloadMovie(sid) {
    api(CONFIG.API_BASE + '/moviebox/download-movie?subjectId=' + sid + '&resolution=720').then(function(dl) {
        if (dl && dl.data && dl.data.files && dl.data.files.length > 0) {
            var best = dl.data.files.reduce(function(a, b) { return a.resolution > b.resolution ? a : b; });
            window.open(best.resourceLink, '_blank');
            toast('Download ' + (dl.data.title || '') + ' - ' + best.resolution + 'P');
        } else {
            toast('Link download tidak tersedia.');
        }
    });
}

// ==========================================
// VIDEO PLAYER (Mobile Friendly)
// ==========================================

function openPlayer(url, title) {
    var mt = $('modalTitle');
    if (mt) mt.textContent = title || 'Player';
    var p = $('videoPlayer');
    if (p) {
        p.src = url;
        p.setAttribute('playsinline', '');
        p.setAttribute('webkit-playsinline', '');
        p.setAttribute('x5-playsinline', '');
        p.load();
    }
    var db = $('downloadBtn');
    if (db) db.href = url;
    var vm = $('videoModal');
    if (vm) vm.classList.add('active');
}

function closeModal(e) {
    if (e && e.target !== $('videoModal')) return;
    var vm = $('videoModal');
    if (vm) vm.classList.remove('active');
    var p = $('videoPlayer');
    if (p) { p.pause(); p.src = ''; p.removeAttribute('src'); }
}

// ==========================================
// SEARCH
// ==========================================

function toggleSearch() {
    var sb = $('searchBar');
    if (!sb) return;
    sb.classList.toggle('active');
    if (sb.classList.contains('active')) {
        var si = $('searchInput');
        if (si) si.focus();
    }
}

function searchMovies(query) {
    var q = query || ($('searchInput') ? $('searchInput').value.trim() : '');
    if (!q) return;
    var sb = $('searchBar');
    if (sb) sb.classList.remove('active');
    showLoader();

    api(CONFIG.API_BASE + '/moviebox/search?keyword=' + encodeURIComponent(q) + '&page=1&perPage=' + CONFIG.PER_PAGE).then(function(data) {
        hideLoader();

        var html = '<div class="container" style="padding-top:30px"><div class="search-results-info"><h2><i class="fas fa-search"></i> Pencarian: "' + escHtml(q) + '"</h2></div>';

        var items = [];
        if (data && data.data && data.data.results) {
            data.data.results.forEach(function(item) {
                if (item.topicType === 'SUBJECT' && item.subjects) {
                    item.subjects.forEach(function(s) { items.push(s); });
                }
            });
        }

        html += items.length > 0 ? renderGrid(items) : '<div class="empty-state"><i class="fas fa-search-minus"></i><p>Tidak ada hasil untuk "' + escHtml(q) + '"</p></div>';
        html += '</div>';

        var pc = $('pageContent');
        if (pc) pc.innerHTML = html;
    });
}

// ==========================================
// MOBILE MENU
// ==========================================

function toggleMobileMenu() {
    var nm = $('navMenu');
    if (nm) nm.classList.toggle('active');
}

// ==========================================
// INIT
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('Movie Free by R v2 starting...');
    console.log('API: ' + CONFIG.API_BASE);
    navigate('home');
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            var nm = $('navMenu');
            if (nm) nm.classList.remove('active');
        }
    });
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeModal();
    });
});
