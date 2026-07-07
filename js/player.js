// ===== SUBTITLE INJECTOR =====
// Convert SRT text to VTT format
function srt2vtt(text) {
  return 'WEBVTT\n\n' + text.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
}

// Download SRT, convert to VTT blob, return blob URL
async function fetchSubtitle(subUrl) {
  if (!subUrl) return null;
  try {
    var r = await fetch(subUrl);
    if (!r.ok) return null;
    var text = await r.text();
    // Skip WEBVTT header if already present
    if (text.trim().startsWith('WEBVTT')) return URL.createObjectURL(new Blob([text], {type:'text/vtt'}));
    var vtt = srt2vtt(text);
    return URL.createObjectURL(new Blob([vtt], {type:'text/vtt'}));
  } catch(e) { return null; }
}

// ===== VIDEO PLAYER WITH EMBEDDED SUBTITLE =====
function openPlayer(url, title, subVttUrl) {
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

    // Set video source
    p.src = url;

    // Inject subtitle track BEFORE load() so browser recognizes it
    if (subVttUrl) {
      var track = document.createElement('track');
      track.kind = 'subtitles';
      track.label = 'Indonesian';
      track.srclang = 'id';
      track.src = subVttUrl;
      track.default = true; // Auto-show
      p.appendChild(track);
    }

    p.load(); // Load with subtitle already attached
  }

  // Show or hide subtitle button
  var subBtn = $('subtitleBtn');
  if(subBtn) {
    if (subVttUrl) {
      subBtn.style.display = 'flex';
      // Reset to default state
      subBtn.classList.remove('active');
      subBtn.innerHTML = '<i class="fas fa-closed-captioning"></i>';
    } else {
      subBtn.style.display = 'none';
    }
  }

  $('downloadBtnBottom').href = url;
  document.body.style.overflow = 'hidden';
  $('videoModal').classList.add('active');

  if(p) {
    p.oncanplay = function(){
      if(pl) pl.style.display='none';
      // Auto-enable subtitle track
      try {
        if (p.textTracks && p.textTracks.length > 0) {
          p.textTracks[0].mode = 'showing';
          var sb = $('subtitleBtn');
          if(sb) { sb.classList.add('active'); sb.innerHTML = '<i class="fas fa-closed-captioning"></i> <span>IND</span>'; }
        }
      } catch(e){}
    };
    p.onplaying = function(){ if(pl) pl.style.display='none'; };
    p.onerror = function(){ if(pl) pl.innerHTML='<span style="color:#e50914;font-size:0.9rem">Gagal. <a href="'+url+'" target="_blank" style="color:#fff">Download</a></span>'; };
  }
}

// Toggle subtitle on/off
function toggleSubtitle() {
  var p = $('videoPlayer');
  if (!p || !p.textTracks || p.textTracks.length === 0) return;
  var track = p.textTracks[0];
  var btn = $('subtitleBtn');
  if (track.mode === 'showing') {
    track.mode = 'hidden';
    if(btn) { btn.classList.remove('active'); btn.innerHTML = '<i class="fas fa-closed-captioning"></i>'; }
  } else {
    track.mode = 'showing';
    if(btn) { btn.classList.add('active'); btn.innerHTML = '<i class="fas fa-closed-captioning"></i> <span>IND</span>'; }
  }
}

// PLAY MOVIE (auto load subtitle)
function playMovie(sid) {
  // Fetch video + subtitle info first
  api(CONFIG.API_BASE+'/moviebox/download-movie?subjectId='+sid+'&resolution=360').then(async function(dl) {
    if (!dl || !dl.data || !dl.data.files || dl.data.files.length === 0) {
      toast('Tidak ada sumber video.');
      return;
    }
    var videoUrl = dl.data.files[0].resourceLink;
    var title = dl.data.title || 'Movie';
    var subUrl = dl.data.subtitle && dl.data.subtitle.url ? dl.data.subtitle.url : null;

    // Fetch & convert subtitle to VTT blob, then open player
    var vttUrl = subUrl ? await fetchSubtitle(subUrl) : null;
    openPlayer(videoUrl, title, vttUrl);
  });
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

// For episode buttons
function playEpisode(videoUrl, title, subUrl) {
  fetchSubtitle(subUrl).then(function(vttUrl) {
    openPlayer(videoUrl, title, vttUrl);
  });
}
