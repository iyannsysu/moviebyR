// Movie Free by R v3 - Application
var currentPage = 'home';
var currentParams = { page: 1 };
var heroInterval = null;
var currentSlide = 0;

function $(id) { return document.getElementById(id); }
function qs(s) { return document.querySelector(s); }
function qsa(s) { return document.querySelectorAll(s); }

function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function fmtDate(d) { if (!d) return ''; try { return new Date(d).toLocaleDateString('id-ID',{year:'numeric',month:'long',day:'numeric'}); } catch(e) { return d; } }
function fmtSize(b) { if (!b) return ''; var mb=parseInt(b)/(1024*1024); return mb>1024?(mb/1024).toFixed(1)+' GB':mb.toFixed(0)+' MB'; }
function getImdb(s) { return s.imdbRatingValue || s.imdbRate || ''; }
var PH = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 300 450%22%3E%3Crect fill=%22%231a1a2e%22 width=%22300%22 height=%22450%22/%3E%3Ctext x=%22150%22 y=%22225%22 text-anchor=%22middle%22 fill=%22%23666%22 font-size=%2218%22 font-family=%22sans-serif%22%3ENo Image%3C/text%3E%3C/svg%3E';

function showL() { var l=$('loader'); if(l) l.style.display='flex'; var p=$('pageContent'); if(p) p.innerHTML=''; }
function hideL() { var l=$('loader'); if(l) l.style.display='none'; }
function toast(m) {
  var e=document.createElement('div');
  e.style.cssText='position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#e50914;color:#fff;padding:10px 20px;border-radius:8px;z-index:9999;font-weight:600;font-size:14px;';
  e.textContent=m; document.body.appendChild(e);
  setTimeout(function(){ e.style.opacity='0'; e.style.transition='opacity .3s'; setTimeout(function(){ e.remove(); },400); },3000);
}

async function api(url) {
  try { var r=await fetch(url); if(!r.ok) return null; return await r.json(); } catch(e) { return null; }
}

function imgUrl(o) {
  if(!o) return PH;
  if(typeof o==='string') return o||PH;
  if(o&&o.url) return o.url;
  return PH;
}

// ===== SRT to VTT Converter =====
function srt2vtt(srt) {
  // Add WEBVTT header
  var vtt = 'WEBVTT\n\n';
  // Replace SRT timing format (comma) with VTT format (dot)
  vtt += srt.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
  return vtt;
}

async function loadSubtitle(subUrl) {
  if (!subUrl) return null;
  try {
    var res = await fetch(subUrl);
    if (!res.ok) return null;
    var text = await res.text();
    var vtt = srt2vtt(text);
    var blob = new Blob([vtt], { type: 'text/vtt' });
    return URL.createObjectURL(blob);
  } catch(e) {
    return null;
  }
}

// NAVIGATION
function navigate(page, params) {
  params = params || {};
  if(heroInterval) { clearInterval(heroInterval); heroInterval=null; }
  currentPage = page;
  currentParams = Object.assign({}, currentParams, params, { page: params.page||1 });
  qsa('.nav-link').forEach(function(l){ l.classList.remove('active'); });
  var map={home:'home',global:'global',indonesia:'indonesia',hollywood:'hollywood',asia:'asia',horror:'horror',animasi:'animasi',series:'series','series-kdrama':'series','series-indo':'series','series-anime':'series','series-barat':'series','series-cdrama':'series','series-thai':'series'};
  var el = qs('.nav-link[data-page="'+(map[page]||'home')+'"]');
  if(el) el.classList.add('active');
  if($('navMenu')) $('navMenu').classList.remove('active');
  showL(); window.scrollTo({top:0});
  var h={
    home:function(){loadHome();},
    global:function(){loadList('global');},
    indonesia:function(){loadList('indonesia');},
    hollywood:function(){loadList('hollywood');},
    asia:function(){loadList('asia');},
    horror:function(){loadList('horror');},
    animasi:function(){loadList('animasi');},
    detail:function(){loadDetail(params.subjectId);},
    search:function(){searchMovies(params.query);},
    series:function(){loadSeries('kdrama');},
    'series-kdrama':function(){loadSeries('kdrama');},
    'series-indo':function(){loadSeries('indo');},
    'series-anime':function(){loadSeries('anime');},
    'series-barat':function(){loadSeries('barat');},
    'series-cdrama':function(){loadSeries('cdrama');},
    'series-thai':function(){loadSeries('thai');}
  };
  (h[page]||loadHome)();
}

function changePage(np) { currentParams.page=np; navigate(currentPage,{page:np}); }

// RENDER
function cardClick(sid) { navigate('detail',{subjectId:sid}); }

function rCard(s) {
  if(!s||!s.subjectId) return '';
  var img=imgUrl(s.cover);
  var title=esc(s.title||'Untitled');
  var imdb=getImdb(s);
  var year=s.releaseDate?String(s.releaseDate).substring(0,4):'';
  var isS=s.subjectType===2;
  var sid=s.subjectId;
  return '<div class="movie-card" onclick="cardClick(\''+sid+'\')">'
    +'<div class="movie-card-poster">'
    +'<img src="'+img+'" alt="'+title+'" loading="lazy" onerror="this.src=\''+PH+'\'">'
    +'<div class="movie-card-overlay"><div class="play-btn-small"><i class="fas fa-play"></i></div></div>'
    +'</div><div class="movie-card-info">'
    +'<h3 title="'+title+'">'+title+'</h3>'
    +'<div class="card-meta">'
    +(imdb?'<span class="imdb"><i class="fas fa-star"></i> '+imdb+'</span>':'')
    +(year?'<span>'+year+'</span>':'')
    +'<span class="type-badge '+(isS?'series-badge':'')+'">'+(isS?'Series':'Movie')+'</span>'
    +'</div></div></div>';
}

function rGrid(subs) {
  if(!subs||subs.length===0) return '<div class="empty-state"><i class="fas fa-film"></i><p>Tidak ada data.</p></div>';
  return '<div class="movie-grid">'+subs.map(rCard).join('')+'</div>';
}

function rSection(icon,title,subs,page) {
  if(!subs||subs.length===0) return '';
  return '<section class="container" style="margin-bottom:40px">'
    +'<div class="section-header"><h2><span class="section-icon">'+icon+'</span> '+title+'</h2>'
    +'<button class="view-all" onclick="navigate(\''+page+'\')">Lihat Semua <i class="fas fa-arrow-right"></i></button></div>'
    +rGrid(subs)+'</section>';
}

function rPage() {
  var p=currentParams.page;
  return '<div class="pagination"><button '+(p<=1?'disabled':'')+' onclick="changePage('+(p-1)+')"><i class="fas fa-chevron-left"></i> Sebelumnya</button><span>Halaman '+p+'</span><button onclick="changePage('+(p+1)+')">Selanjutnya <i class="fas fa-chevron-right"></i></button></div>';
}

// HOME
function loadHome() {
  Promise.all([
    api(CONFIG.API_BASE+'/moviebox/homepage'),
    api(CONFIG.API_BASE+'/moviebox/global?page=1&perPage='+CONFIG.PER_PAGE),
    api(CONFIG.API_BASE+'/moviebox/indonesia?page=1&perPage=10'),
    api(CONFIG.API_BASE+'/moviebox/hollywood?page=1&perPage=10'),
    api(CONFIG.API_BASE+'/moviebox/series/kdrama?page=1&perPage=10')
  ]).then(function(r){
    var home=r[0],global=r[1],indo=r[2],hol=r[3],kd=r[4];
    hideL();
    var html='';

    // Hero
    if(home&&home.data&&home.data.items){
      var banners=[];
      home.data.items.forEach(function(item){
        if(item.banner&&item.banner.banners){
          item.banner.banners.forEach(function(b){if(b.subject)banners.push(b);});
        }
      });
      if(banners.length>0){
        html+='<section class="hero-section"><div class="hero-carousel" id="heroCarousel">';
        banners.slice(0,6).forEach(function(b,i){
          var sub=b.subject;
          var g=sub.genre?sub.genre.split(',').map(function(x){return x.trim();}).slice(0,3):[];
          var bg=imgUrl(sub.cover);
          var imdb=getImdb(sub);
          var sid=sub.subjectId;
          html+='<div class="hero-slide'+(i===0?' active':'')+'">'
            +'<div class="hero-slide-bg" style="background-image:url(\''+bg+'\')"></div>'
            +'<div class="hero-slide-content">'
            +'<h2>'+esc(sub.title)+'</h2>'
            +'<div class="hero-meta">'
            +(sub.releaseDate?'<span><i class="fas fa-calendar"></i> '+sub.releaseDate+'</span>':'')
            +(imdb?'<span><i class="fas fa-star" style="color:var(--accent)"></i> '+imdb+'</span>':'')
            +'</div>'
            +'<div class="hero-genre">'+g.map(function(x){return '<span>'+esc(x)+'</span>';}).join('')+'</div>'
            +'<div class="hero-actions">'
            +'<button class="btn-primary" onclick="navigate(\'detail\',{subjectId:\''+sid+'\'})"><i class="fas fa-info-circle"></i> Detail</button>'
            +'<button class="btn-secondary" onclick="playMovie(\''+sid+'\')"><i class="fas fa-play"></i> Tonton</button>'
            +'</div></div></div>';
        });
        html+='<div class="hero-dots">';
        banners.slice(0,6).forEach(function(_,i){
          html+='<button class="hero-dot'+(i===0?' active':'')+'" onclick="gotoHeroSlide('+i+')"></button>';
        });
        html+='</div></div></section>';
      }
    }

    // Categories
    html+='<section class="container"><div class="categories-grid">';
    var cats=[
      {n:'Global',i:'fa-globe',p:'global',c:'#4361ee'},
      {n:'Indonesia',i:'fa-flag',p:'indonesia',c:'#e50914'},
      {n:'Hollywood',i:'fa-film',p:'hollywood',c:'#f5c518'},
      {n:'Asia',i:'fa-earth-asia',p:'asia',c:'#06d6a0'},
      {n:'Horror',i:'fa-ghost',p:'horror',c:'#7209b7'},
      {n:'Animasi',i:'fa-dragon',p:'animasi',c:'#fb5607'},
      {n:'K-Drama',i:'fa-tv',p:'series-kdrama',c:'#e63946'},
      {n:'Anime',i:'fa-crown',p:'series-anime',c:'#f72585'},
      {n:'C-Drama',i:'fa-bolt',p:'series-cdrama',c:'#4cc9f0'},
      {n:'Barat',i:'fa-globe-americas',p:'series-barat',c:'#2ec4b6'}
    ];
    cats.forEach(function(c){
      html+='<a href="#" onclick="navigate(\''+c.p+'\')" class="cat-item" style="--cat-color:'+c.c+'">'
        +'<i class="fas '+c.i+'"></i><span>'+c.n+'</span></a>';
    });
    html+='</div></section>';

    // Rows
    var secs=[
      {icon:'🌍',title:'Global',data:global,page:'global'},
      {icon:'🇮🇩',title:'Indonesia',data:indo,page:'indonesia'},
      {icon:'🇺🇸',title:'Hollywood',data:hol,page:'hollywood'},
      {icon:'📺',title:'K-Drama',data:kd,page:'series-kdrama'}
    ];
    secs.forEach(function(s){
      var subs=s.data&&s.data.data&&s.data.data.subjects?s.data.data.subjects.slice(0,10):null;
      if(subs) html+=rSection(s.icon,s.title,subs,s.page);
    });

    $('pageContent').innerHTML=html||'<div class="container empty-state"><i class="fas fa-frown"></i><p>Tidak ada data.</p></div>';
    startHero();
  });
}

function gotoHeroSlide(i) {
  currentSlide=i;
  qsa('.hero-slide').forEach(function(s,idx){s.classList.toggle('active',idx===i);});
  qsa('.hero-dot').forEach(function(d,idx){d.classList.toggle('active',idx===i);});
}
function startHero() {
  var slides=qsa('.hero-slide');
  if(slides.length<2) return;
  if(heroInterval) clearInterval(heroInterval);
  heroInterval=setInterval(function(){gotoHeroSlide((currentSlide+1)%slides.length);},5000);
}

// LIST
function loadList(type) {
  api(CONFIG.API_BASE+'/moviebox/'+type+'?page='+currentParams.page+'&perPage='+CONFIG.PER_PAGE).then(function(data){
    hideL();
    var titles={global:'Global',indonesia:'Indonesia',hollywood:'Hollywood',asia:'Asia',horror:'Horror',animasi:'Animasi'};
    var subs=data&&data.data&&data.data.subjects?data.data.subjects:[];
    $('pageContent').innerHTML='<div class="container" style="padding-top:30px"><div class="section-header"><h2>'+(titles[type]||type)+'</h2></div>'+(subs.length>0?rGrid(subs)+rPage():'<div class="empty-state"><i class="fas fa-film"></i><p>Tidak ada data.</p></div>')+'</div>';
  });
}

function loadSeries(type) {
  api(CONFIG.API_BASE+'/moviebox/series/'+type+'?page='+currentParams.page+'&perPage='+CONFIG.PER_PAGE).then(function(data){
    hideL();
    var titles={kdrama:'K-Drama',indo:'Indo Drama',anime:'Anime',barat:'Series Barat',cdrama:'C-Drama',thai:'Thai-Drama'};
    var subs=data&&data.data&&data.data.subjects?data.data.subjects:[];
    $('pageContent').innerHTML='<div class="container" style="padding-top:30px"><div class="section-header"><h2>'+(titles[type]||'Series')+'</h2></div>'+(subs.length>0?rGrid(subs)+rPage():'<div class="empty-state"><i class="fas fa-tv"></i><p>Tidak ada data.</p></div>')+'</div>';
  });
}

// DETAIL
function loadDetail(sid) {
  api(CONFIG.API_BASE+'/moviebox/detail?subjectId='+sid).then(function(data){
    hideL();
    if(!data||!data.data){
      $('pageContent').innerHTML='<div class="container empty-state" style="padding-top:50px"><i class="fas fa-exclamation-triangle" style="color:var(--primary)"></i><p>Detail tidak ditemukan.</p></div>';
      return;
    }
    var d=data.data;
    var isS=d.subjectType===2;
    var genres=d.genre?d.genre.split(',').map(function(g){return g.trim();}):[];
    var cast=d.staffList?d.staffList.filter(function(s){return s.staffType===1;}):[];
    var img=imgUrl(d.cover);
    var imdb=getImdb(d);

    var html='<div class="container" style="padding-top:30px">'
      +'<div class="detail-header">'
      +'<div class="detail-backdrop" style="background-image:url(\''+img+'\')"></div>'
      +'<div class="detail-backdrop-overlay"></div>'
      +'<div class="detail-content">'
      +'<div class="detail-poster"><img src="'+img+'" alt="'+esc(d.title)+'" onerror="this.src=\''+PH+'\'"></div>'
      +'<div class="detail-info">'
      +'<h1>'+esc(d.title)+'</h1>'
      +'<div class="detail-meta">'
      +(d.releaseDate?'<span><i class="fas fa-calendar"></i> '+fmtDate(d.releaseDate)+'</span>':'')
      +(d.duration?'<span><i class="fas fa-clock"></i> '+d.duration+'</span>':'')
      +(imdb?'<span class="imdb-rating"><i class="fas fa-star"></i> IMDb '+imdb+'</span>':'')
      +(d.countryName?'<span><i class="fas fa-map-pin"></i> '+esc(d.countryName)+'</span>':'')
      +(d.language?'<span><i class="fas fa-language"></i> '+esc(d.language)+'</span>':'')
      +'<span><i class="fas '+(isS?'fa-list':'fa-film')+'"></i> '+(isS?'Series':'Movie')+'</span>'
      +(d.viewers?'<span><i class="fas fa-eye"></i> '+Number(d.viewers).toLocaleString()+' viewers</span>':'')
      +'</div>'
      +'<div class="detail-genre">'+genres.map(function(g){return '<span>'+esc(g)+'</span>';}).join('')+'</div>'
      +'<p class="detail-desc">'+(d.description||'Tidak ada deskripsi.')+'</p>'
      +'<div class="detail-actions">'
      +'<button class="btn-primary" onclick="playMovie(\''+sid+'\')"><i class="fas fa-play"></i> Putar Video</button>'
      +'<button class="btn-secondary" onclick="downloadMovie(\''+sid+'\')"><i class="fas fa-download"></i> Download</button>'
      +'</div>';

    if(cast.length>0){
      html+='<div class="detail-cast"><h3><i class="fas fa-users"></i> Pemain</h3><div class="cast-grid">';
      cast.slice(0,10).forEach(function(c){
        var av=c.avatarUrl||'https://ui-avatars.com/api/?name='+encodeURIComponent(c.name)+'&background=1a1a2e&color=fff&size=60';
        html+='<div class="cast-item"><img src="'+av+'" alt="'+esc(c.name)+'" onerror="this.src=\''+av+'\'"><div class="cast-name">'+esc(c.name)+'</div><div class="cast-role">'+esc(c.character)+'</div></div>';
      });
      html+='</div></div>';
    }
    html+='</div></div></div></div><div class="container section-episodes">';

    // Download sections
    if(isS){
      html+='<h3><i class="fas fa-list-ol"></i> Episode</h3><div class="episode-list">';
      api(CONFIG.API_BASE+'/moviebox/download-series?subjectId='+sid+'&season=1&resolution=360').then(function(dl){
        if(dl&&dl.data&&dl.data.episodes){
          dl.data.episodes.forEach(function(ep){
            var subUrl = ep.subtitle && ep.subtitle.url ? ep.subtitle.url : '';
            html+='<div class="episode-card"><div class="ep-info"><h4>Episode '+ep.ep+'</h4><p>'+(ep.title||'Season '+ep.se+' - Episode '+ep.ep)+' &bull; '+fmtSize(ep.size)+'</p></div><div class="ep-actions">'
              +'<button class="btn-play-ep" onclick="playWithSub(\''+ep.resourceLink+'\',\''+esc(d.title)+' - Ep '+ep.ep+'\',\''+subUrl+'\')"><i class="fas fa-play"></i></button>'
              +'<a href="'+ep.resourceLink+'" target="_blank" class="btn-download-ep" download><i class="fas fa-download"></i></a></div></div>';
          });
        } else {
          html+='<p style="color:var(--text-muted);grid-column:1/-1">Data episode tidak tersedia.</p>';
        }
        html+='</div></div>';
        $('pageContent').innerHTML=html;
      });
      return;
    } else {
      html+='<h3><i class="fas fa-download"></i> Download &amp; Resolusi</h3>'
        +'<div class="resolution-tabs">'
        +'<button class="resolution-tab active" onclick="selectRes(\''+sid+'\',360,this)">360P</button>'
        +'<button class="resolution-tab" onclick="selectRes(\''+sid+'\',480,this)">480P</button>'
        +'<button class="resolution-tab" onclick="selectRes(\''+sid+'\',720,this)">720P</button>'
        +'<button class="resolution-tab" onclick="selectRes(\''+sid+'\',1080,this)">1080P</button>'
        +'</div><div id="downloadInfo"><div class="episode-list">';
      api(CONFIG.API_BASE+'/moviebox/download-movie?subjectId='+sid+'&resolution=360').then(function(dl){
        if(dl&&dl.data&&dl.data.files){
          dl.data.files.forEach(function(f){
            html+='<div class="episode-card"><div class="ep-info"><h4>'+f.resolution+'P</h4><p>'+(f.codecName||'H.264').toUpperCase()+' &bull; '+fmtSize(f.size)+'</p></div><div class="ep-actions"><button class="btn-play-ep" onclick="openPlayer(\''+f.resourceLink+'\',\''+esc(d.title)+' - '+f.resolution+'P\')"><i class="fas fa-play"></i> Putar</button><a href="'+f.resourceLink+'" target="_blank" class="btn-download-ep" download><i class="fas fa-download"></i></a></div></div>';
          });
          if(dl.data.subtitle){
            html+='<div style="margin-top:12px;padding:12px;background:var(--bg-card);border-radius:6px"><p style="color:var(--text-muted);font-size:.8rem"><i class="fas fa-closed-captioning"></i> Subtitle: '+dl.data.subtitle.lanName+' <a href="'+dl.data.subtitle.url+'" target="_blank" style="color:var(--primary);margin-left:8px">Download SRT</a></p></div>';
          }
        } else {
          html+='<p style="color:var(--text-muted);grid-column:1/-1">Data download tidak tersedia.</p>';
        }
        html+='</div></div></div>';
        $('pageContent').innerHTML=html;
      });
      return;
    }
  });
}

function selectRes(sid,res,btn){
  qsa('.resolution-tab').forEach(function(t){t.classList.remove('active');});
  btn.classList.add('active');
  var div=$('downloadInfo');
  if(!div) return;
  div.innerHTML='<div style="display:flex;justify-content:center;padding:30px"><div class="loader"></div></div>';
  api(CONFIG.API_BASE+'/moviebox/download-movie?subjectId='+sid+'&resolution='+res).then(function(dl){
    if(dl&&dl.data&&dl.data.files){
      var h='<div class="episode-list">';
      dl.data.files.forEach(function(f){
        h+='<div class="episode-card"><div class="ep-info"><h4>'+f.resolution+'P</h4><p>'+(f.codecName||'H.264').toUpperCase()+' &bull; '+fmtSize(f.size)+'</p></div><div class="ep-actions"><button class="btn-play-ep" onclick="openPlayer(\''+f.resourceLink+'\',\''+esc(dl.data.title)+' - '+f.resolution+'P\')"><i class="fas fa-play"></i> Putar</button><a href="'+f.resourceLink+'" target="_blank" class="btn-download-ep" download><i class="fas fa-download"></i></a></div></div>';
      });
      h+='</div>';
      if(dl.data.subtitle){
        h+='<div style="margin-top:12px;padding:12px;background:var(--bg-card);border-radius:6px"><p style="color:var(--text-muted);font-size:.8rem"><i class="fas fa-closed-captioning"></i> Subtitle: '+dl.data.subtitle.lanName+' <a href="'+dl.data.subtitle.url+'" target="_blank" style="color:var(--primary);margin-left:8px">Download SRT</a></p></div>';
      }
      div.innerHTML=h;
    } else {
      div.innerHTML='<p style="color:var(--text-muted);text-align:center;padding:20px">Resolusi tidak tersedia.</p>';
    }
  });
}

// PLAY / DOWNLOAD (with subtitle support)
function playMovie(sid) {
  api(CONFIG.API_BASE+'/moviebox/download-movie?subjectId='+sid+'&resolution=360').then(function(dl){
    if(dl&&dl.data&&dl.data.files&&dl.data.files.length>0){
      var subUrl = dl.data.subtitle && dl.data.subtitle.url ? dl.data.subtitle.url : '';
      playWithSub(dl.data.files[0].resourceLink, dl.data.title||'Movie', subUrl);
    } else {
      toast('Tidak ada sumber video.');
    }
  });
}

function playWithSub(url, title, subUrl) {
  // Load subtitle first, then open player
  if (subUrl) {
    loadSubtitle(subUrl).then(function(vttUrl) {
      openPlayer(url, title, vttUrl);
    });
  } else {
    openPlayer(url, title, null);
  }
}

function downloadMovie(sid) {
  api(CONFIG.API_BASE+'/moviebox/download-movie?subjectId='+sid+'&resolution=720').then(function(dl){
    if(dl&&dl.data&&dl.data.files&&dl.data.files.length>0){
      var best=dl.data.files.reduce(function(a,b){return a.resolution>b.resolution?a:b;});
      window.open(best.resourceLink,'_blank');
      toast('Download '+(dl.data.title||'')+' - '+best.resolution+'P');
    } else {
      toast('Link download tidak tersedia.');
    }
  });
}

// ===== VIDEO PLAYER WITH SUBTITLE SUPPORT =====
function openPlayer(url, title, subBlobUrl) {
  $('modalTitle').textContent = title || '';

  var pl = $('playerLoading');
  if(pl) { pl.style.display='flex'; pl.innerHTML='<div class="loader"></div><span>Memuat video...</span>'; }

  var p = $('videoPlayer');
  if(p) {
    p.pause();
    p.removeAttribute('src');

    // Remove old tracks
    var oldTracks = p.querySelectorAll('track');
    oldTracks.forEach(function(t){ t.remove(); });

    p.src = url;
    p.load();
  }

  // Show subtitle button if available
  var subBtn = $('subtitleBtn');
  if(subBtn) {
    if(subBlobUrl) {
      subBtn.style.display = 'flex';
      subBtn.dataset.subUrl = subBlobUrl || '';
    } else {
      subBtn.style.display = 'none';
      subBtn.dataset.subUrl = '';
    }
  }

  $('downloadBtnBottom').href = url;

  document.body.style.overflow = 'hidden';
  $('videoModal').classList.add('active');

  if(p) {
    p.oncanplay = function(){ if(pl) pl.style.display='none'; };
    p.onplaying = function(){ if(pl) pl.style.display='none'; };
    p.onerror = function(){ if(pl) pl.innerHTML='<span style="color:#e50914;font-size:0.9rem">Gagal. <a href="'+url+'" target="_blank" style="color:#fff">Download</a></span>'; };
  }
}

function toggleSubtitle() {
  var btn = $('subtitleBtn');
  if(!btn) return;
  var p = $('videoPlayer');
  if(!p) return;

  // Check if subtitle is already active
  var tracks = p.textTracks;
  if(tracks && tracks.length > 0) {
    var track = tracks[0];
    if(track.mode === 'showing') {
      track.mode = 'hidden';
      btn.classList.remove('active');
      btn.innerHTML = '<i class="fas fa-closed-captioning"></i>';
    } else {
      track.mode = 'showing';
      btn.classList.add('active');
      btn.innerHTML = '<i class="fas fa-closed-captioning"></i> <span>IND</span>';
    }
    return;
  }

  // If no track, create one
  var subUrl = btn.dataset.subUrl;
  if(!subUrl) return;

  var track = document.createElement('track');
  track.kind = 'subtitles';
  track.label = 'Indonesian';
  track.srclang = 'id';
  track.src = subUrl;
  track.default = true;
  p.appendChild(track);

  // Wait for track to load then enable
  track.addEventListener('load', function() {
    if(tracks && tracks.length > 0) {
      tracks[0].mode = 'showing';
    }
    btn.classList.add('active');
    btn.innerHTML = '<i class="fas fa-closed-captioning"></i> <span>IND</span>';
  });
}

function closeModal(e) {
  if(e && e.target !== $('videoModal')) return;
  $('videoModal').classList.remove('active');
  document.body.style.overflow = '';
  var p = $('videoPlayer');
  if(p) { p.pause(); p.removeAttribute('src'); p.load(); p.oncanplay=null; p.onplaying=null; p.onerror=null; }
  var pl = $('playerLoading');
  if(pl) { pl.style.display='flex'; pl.innerHTML='<div class="loader"></div><span>Memuat video...</span>'; }
}

// SEARCH
function toggleSearch() { $('searchBar').classList.toggle('active'); if($('searchBar').classList.contains('active')) $('searchInput').focus(); }

function searchMovies(query) {
  var q = query||($('searchInput')?$('searchInput').value.trim():'');
  if(!q) return;
  $('searchBar').classList.remove('active');
  showL();
  api(CONFIG.API_BASE+'/moviebox/search?keyword='+encodeURIComponent(q)+'&page=1&perPage='+CONFIG.PER_PAGE).then(function(data){
    hideL();
    var html='<div class="container" style="padding-top:30px"><div class="search-results-info"><h2><i class="fas fa-search"></i> Pencarian: "'+esc(q)+'"</h2></div>';
    var items=[];
    if(data&&data.data&&data.data.results){
      data.data.results.forEach(function(item){
        if(item.topicType==='SUBJECT'&&item.subjects) item.subjects.forEach(function(s){items.push(s);});
      });
    }
    html+=items.length>0?rGrid(items):'<div class="empty-state"><i class="fas fa-search-minus"></i><p>Tidak ada hasil untuk "'+esc(q)+'"</p></div>';
    html+='</div>';
    $('pageContent').innerHTML=html;
  });
}

function toggleMobileMenu() { $('navMenu').classList.toggle('active'); }

// INIT
document.addEventListener('DOMContentLoaded', function(){
  console.log('Movie Free by R v3 - Sub Indo');
  navigate('home');
  window.addEventListener('resize',function(){if(window.innerWidth>768)$('navMenu').classList.remove('active');});
  document.addEventListener('keydown',function(e){if(e.key==='Escape')closeModal();});
});
