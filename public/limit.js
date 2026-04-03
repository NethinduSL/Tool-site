/* ═══════════════════════════════════════════════
   Bit X Tools — Shared Rate Limit Guard
   Guests: 400 uses/day (shared by IP)
   Signed-in users: unlimited
   ═══════════════════════════════════════════════ */

(function(){
  // ── Token helpers ──
  function tok(){ return localStorage.getItem('bxt_token')||''; }

  // ── Show a nice "limit reached" overlay ──
  function showLimitUI(){
    if(document.getElementById('bxt-limit-overlay')) return;
    const el=document.createElement('div');
    el.id='bxt-limit-overlay';
    el.style.cssText='position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(4,4,13,.85);backdrop-filter:blur(12px);padding:24px;';
    el.innerHTML=`
      <div style="background:#0a0a20;border:1px solid rgba(239,68,68,.35);border-radius:24px;padding:36px;max-width:400px;width:100%;text-align:center;position:relative;">
        <div style="width:64px;height:64px;border-radius:50%;background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.3);display:flex;align-items:center;justify-content:center;margin:0 auto 18px;font-size:26px;">🚫</div>
        <div style="font-family:'Sora',sans-serif;font-size:20px;font-weight:800;color:#f87171;margin-bottom:8px;">Daily Limit Reached</div>
        <div style="font-size:14px;color:#9098c0;line-height:1.6;margin-bottom:24px;">You've used all <b style="color:#e8ecff">400</b> free daily tasks.<br>Sign in for <b style="color:#a5b4fc">unlimited</b> access — it's free!</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;">
          <a href="index.html" style="display:inline-flex;align-items:center;gap:7px;padding:11px 22px;border-radius:12px;background:linear-gradient(135deg,#4f8ef7,#7c5cfc,#a855f7);color:#fff;font-size:13px;font-weight:700;text-decoration:none;">Sign In / Sign Up</a>
          <button onclick="document.getElementById('bxt-limit-overlay').remove()" style="display:inline-flex;align-items:center;gap:7px;padding:11px 22px;border-radius:12px;background:transparent;border:1px solid rgba(120,110,220,.2);color:#9098c0;font-size:13px;font-weight:600;cursor:pointer;font-family:'Sora',sans-serif;">Dismiss</button>
        </div>
      </div>`;
    document.body.appendChild(el);
  }

  // ── Core: call before every tool action ──
  // Returns true  → allowed to proceed
  // Returns false → blocked, overlay shown
  window.bxtCheckLimit = async function(){
    const t=tok();
    try{
      const r=await fetch('/api/tasks/use',{
        method:'POST',
        headers:{'Content-Type':'application/json',...(t?{Authorization:'Bearer '+t}:{})},
        body:'{}'
      });
      const d=await r.json();
      if(d.ok) return true;
      if(d.limited){ showLimitUI(); return false; }
      return true; // fail-open for any other error
    }catch(e){
      return true; // network error → fail open
    }
  };

  // ── On page load: show remaining bar if guest ──
  window.addEventListener('DOMContentLoaded', async ()=>{
    if(tok()) return; // logged-in users skip bar
    try{
      const r=await fetch('/api/tasks/status');
      const d=await r.json();
      if(!d.ok) return;
      const pct=Math.min(100,Math.round((d.used/d.limit)*100));
      if(d.used===0) return; // don't show bar if unused

      const bar=document.createElement('div');
      bar.id='bxt-limit-bar';
      bar.style.cssText='position:fixed;bottom:0;left:0;right:0;z-index:9998;background:rgba(4,4,13,.92);border-top:1px solid rgba(120,110,220,.15);padding:8px 20px;display:flex;align-items:center;gap:14px;font-family:"Sora",sans-serif;backdrop-filter:blur(12px);';
      const color = pct>=100?'#ef4444':pct>=75?'#f59e0b':'#7c5cfc';
      bar.innerHTML=`
        <div style="flex:1;min-width:0;">
          <div style="display:flex;justify-content:space-between;font-size:11px;color:#9098c0;margin-bottom:4px;">
            <span><i class="fas fa-bolt" style="color:${color}"></i> Daily Limit</span>
            <span style="color:${color};font-weight:700">${d.used} / ${d.limit}</span>
          </div>
          <div style="background:rgba(120,110,220,.15);border-radius:100px;height:5px;">
            <div style="height:100%;border-radius:100px;background:${color};width:${pct}%;transition:width .5s;"></div>
          </div>
        </div>
        <a href="index.html" style="flex-shrink:0;font-size:11px;font-weight:700;color:#a5b4fc;text-decoration:none;white-space:nowrap;">Sign in →</a>
        <button onclick="document.getElementById('bxt-limit-bar').remove()" style="flex-shrink:0;background:none;border:none;color:#9098c0;cursor:pointer;font-size:14px;padding:2px;">✕</button>`;
      document.body.appendChild(bar);

      if(pct>=100) showLimitUI();
    }catch(e){}
  });
})();
