(()=>{
const $=id=>document.getElementById(id),audio=$('audio'),play=$('play'),progress=$('progress'),volume=$('volume'),playlist=$('playlist'),ytHost=$('yt-player');let tracks=[],i=0,shuffle=false,repeat='all',ytReady=false,autoplayTimer=null,fallback=null,initialized=false,ytGeneration=0;
const fmt=s=>`${Math.floor((s||0)/60)}:${String(Math.floor((s||0)%60)).padStart(2,'0')}`;const current=()=>tracks[i];
function ensureFallback(){if(fallback||!play?.closest('.player'))return;fallback=document.createElement('button');fallback.id='autoplayFallback';fallback.type='button';fallback.className='autoplay-fallback';fallback.textContent='▶ เปิดเพลง';fallback.setAttribute('aria-label','เปิดเพลง');fallback.onclick=()=>startCurrent(true);play.closest('.player').appendChild(fallback)}function showFallback(){ensureFallback();if(fallback)fallback.hidden=false}function hideFallback(){if(fallback)fallback.hidden=true}function clearAutoplayTimer(){if(autoplayTimer){clearTimeout(autoplayTimer);autoplayTimer=null}}
function loadYTAPI(){if(window.YT?.Player){ytReady=true;return Promise.resolve()}return new Promise(resolve=>{const old=window.onYouTubeIframeAPIReady;window.onYouTubeIframeAPIReady=()=>{ytReady=true;old?.();resolve()};if(!document.querySelector('script[src*="youtube.com/iframe_api"]')){const s=document.createElement('script');s.src='https://www.youtube.com/iframe_api';document.head.appendChild(s)}})}
function destroyYT(){clearAutoplayTimer();const old=window.ytPlayer;window.ytPlayer=null;if(old?.destroy){try{old.destroy()}catch{}}ytHost.innerHTML=''}
async function loadYT(id,autoplay){
 const generation=++ytGeneration;clearAutoplayTimer();hideFallback();destroyYT();
 try{
  await loadYTAPI();
  if(generation!==ytGeneration)return;
  ytHost.innerHTML='';
  window.ytPlayer=new YT.Player(ytHost,{
   width:'200',height:'200',videoId:id,
   playerVars:{playsinline:1,controls:0,rel:0,modestbranding:1,enablejsapi:1},
   events:{
    onReady:e=>{
     if(generation!==ytGeneration)return;
     e.target.setVolume(Number(volume.value)*100);
     if(autoplay){
      e.target.playVideo();
      autoplayTimer=setTimeout(()=>{
       if(generation===ytGeneration&&window.ytPlayer?.getPlayerState?.()!==YT.PlayerState.PLAYING)showFallback();
      },1800);
     }
    },
    onStateChange:e=>{
     if(generation!==ytGeneration)return;
     if(e.data===YT.PlayerState.PLAYING){
      clearAutoplayTimer();hideFallback();play.textContent='❚❚';document.body.classList.add('youtube-playing');window.LinkBioVisualizer?.setMode('none');reportPlay();
     }
     if(e.data===YT.PlayerState.PAUSED){play.textContent='▶';document.body.classList.remove('youtube-playing')}
     if(e.data===YT.PlayerState.ENDED)ended();
    },
    onError:()=>{if(generation===ytGeneration)showFallback()}
   }
  });
 }catch(err){
  if(generation===ytGeneration){console.warn('YouTube player unavailable',err);showFallback()}
 }
}
async function startCurrent(force=false){const t=current();if(!t)return;if(t.type==='youtube'){if(!window.ytPlayer)return loadYT(t.youtubeId,true);try{window.ytPlayer.playVideo();return}catch{showFallback();return}}try{await audio.play();play.textContent='❚❚';hideFallback()}catch(err){if(force)showFallback();console.warn('Audio playback blocked',err)}}
function reportPlay(){const t=current();if(t?.id)fetch('/api/analytics/music-play',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({trackId:t.id})}).catch(()=>{})}
function setTrack(n,autoplay=false){if(!tracks.length)return;i=(n+tracks.length)%tracks.length;const t=current();document.body.classList.toggle('youtube-mode',t.type==='youtube');$('title').textContent=t.title||t.name||'ยังไม่มีเพลง';$('artist').textContent=t.artist||'เพลงจาก LinkBio';$('cover').src=t.thumbnail||t.cover||'https://placehold.co/180x180/png?text=Music';document.querySelectorAll('.song').forEach((e,k)=>e.classList.toggle('active',k===i));if(t.type==='youtube'){audio.pause();audio.removeAttribute('src');ytHost.style.display='block';loadYT(t.youtubeId,autoplay);window.LinkBioVisualizer?.setMode('none')}else{destroyYT();ytHost.style.display='none';audio.src=t.url;window.LinkBioVisualizer?.setMode('bars');if(autoplay)startCurrent(true)}}
function render(){playlist.innerHTML='';tracks.forEach((t,n)=>{const e=document.createElement('div');e.className='song';e.innerHTML=`<span>${n+1}. ${String(t.title||t.name||'Track').replace(/[<>]/g,'')}</span><small>${t.type==='youtube'?'YouTube':'Local music'}</small>`;e.onclick=()=>setTrack(n,true);playlist.appendChild(e)})}
function ended(){if(repeat==='one')return setTrack(i,true);if(repeat==='off'&&i===tracks.length-1)return;setTrack(shuffle?Math.floor(Math.random()*tracks.length):i+1,true)}
play.onclick=()=>{const t=current();if(t?.type==='youtube'){const s=window.ytPlayer?.getPlayerState?.();if(s===1||s===2||s===3)window.ytPlayer?.pauseVideo();else startCurrent(true);return}if(audio.paused)startCurrent(true);else audio.pause()};
audio.onplay=()=>{play.textContent='\u275A\u275A';reportPlay();window.LinkBioAudio?.start()};audio.onpause=()=>play.textContent='\u25B6';audio.onloadedmetadata=()=>{$('duration').textContent=fmt(audio.duration)};audio.ontimeupdate=()=>{$('current').textContent=fmt(audio.currentTime);progress.value=audio.duration?audio.currentTime/audio.duration*100:0};progress.oninput=()=>{const t=current();if(t?.type==='youtube')window.ytPlayer?.seekTo((progress.value/100)*(window.ytPlayer.getDuration()||0),true);else if(audio.duration)audio.currentTime=progress.value/100*audio.duration};
volume.oninput=()=>{audio.volume=+volume.value;window.ytPlayer?.setVolume(+volume.value*100)};audio.volume=.8;$('next').onclick=()=>setTrack(shuffle?Math.floor(Math.random()*tracks.length):i+1,true);$('prev').onclick=()=>setTrack(i-1,true);$('shuffle').onclick=()=>{shuffle=!shuffle;$('shuffle').style.opacity=shuffle?'1':'.55'};$('loop').onclick=()=>{repeat=repeat==='off'?'all':repeat==='all'?'one':'off';$('loop').title='Repeat: '+repeat};audio.onended=ended;
setInterval(()=>{const t=current();if(t?.type==='youtube'&&window.ytPlayer?.getCurrentTime){const d=window.ytPlayer.getDuration()||0,c=window.ytPlayer.getCurrentTime()||0;$('current').textContent=fmt(c);$('duration').textContent=fmt(d);progress.value=d?c/d*100:0}},300);
window.LinkBioPlayer={setTracks(x){const next=Array.isArray(x)?x.filter(t=>t.enabled!==false):[];const old=current();const oldId=old?.id||old?.youtubeId||old?.url;const wasPlaying=old?.type==='youtube'?(window.ytPlayer?.getPlayerState?.()===1||window.ytPlayer?.getPlayerState?.()===3):!audio.paused&&!audio.ended;const same=initialized&&oldId&&next[i]&&(next[i].id||next[i].youtubeId||next[i].url)===oldId;if(same){tracks=next;render();return}const keepIndex=Math.max(0,next.findIndex(t=>(t.id||t.youtubeId||t.url)===oldId));tracks=next;render();initialized=true;if(!tracks.length){destroyYT();audio.pause();audio.removeAttribute('src');hideFallback();play.textContent='▶';return}setTrack(keepIndex>=0?keepIndex:0,wasPlaying||!old)}};ensureFallback();
})();
