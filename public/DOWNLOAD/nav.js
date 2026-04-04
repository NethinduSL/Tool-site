/**
 * nav.js — Shared navigation bar for all Bit X Tools pages
 *
 * HOW TO ADD TO A TOOL PAGE:
 *   1. Add <div id="site-nav"></div> near the top of <body>
 *   2. Add <script src="nav.js"></script> before </body>
 *   3. Call initNav() — it auto-injects the nav + styles
 *
 * The nav includes:
 *   - Logo + back-to-home link
 *   - Usage pill (optional, pass via data-usage attribute on #site-nav)
 *   - Theme toggle (dark/light)
 *   - User profile icon with dropdown (login/logout)
 */

(function () {
  // ── CSS ───────────────────────────────────────────────────────────────────
  const CSS = `
    #bxt-nav{
      position:fixed;top:0;left:0;right:0;z-index:200;
      padding:11px 28px;display:flex;align-items:center;justify-content:space-between;gap:12px;
      background:var(--nav-bg,rgba(4,4,13,0.9));
      backdrop-filter:blur(24px);
      border-bottom:1px solid var(--bd2,rgba(120,110,220,0.18));
      font-family:'Sora',sans-serif;
    }
    #bxt-nav .bn-left{display:flex;align-items:center;gap:12px;}
    #bxt-nav .bn-logo{display:flex;align-items:center;gap:8px;text-decoration:none;}
    #bxt-nav .bn-logo-icon{width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,#4f8ef7,#7c5cfc,#a855f7);display:flex;align-items:center;justify-content:center;font-size:13px;color:#fff;flex-shrink:0;filter:drop-shadow(0 0 8px rgba(124,92,252,.5));}
    #bxt-nav .bn-logo span{font-size:14px;font-weight:800;background:linear-gradient(135deg,#4f8ef7,#7c5cfc,#a855f7);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
    #bxt-nav .bn-divider{width:1px;height:18px;background:var(--bd2,rgba(120,110,220,0.18));}
    #bxt-nav .bn-back{display:inline-flex;align-items:center;gap:6px;color:var(--tx2,#b0b8e0);font-size:12px;font-weight:600;padding:6px 12px;border-radius:8px;border:1px solid var(--bd2,rgba(120,110,220,0.18));text-decoration:none;transition:all .2s;}
    #bxt-nav .bn-back:hover{color:var(--tx,#e8ecff);background:var(--s1,rgba(10,10,32,.8));}
    #bxt-nav .bn-usage{display:inline-flex;align-items:center;gap:5px;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600;color:#a5b4fc;background:rgba(124,92,252,.1);border:1px solid rgba(124,92,252,.2);letter-spacing:.02em;}
    #bxt-nav .bn-usage i{font-size:10px;color:#7c5cfc;}
    #bxt-nav .bn-right{display:flex;align-items:center;gap:8px;}
    #bxt-nav .bn-theme{display:flex;align-items:center;background:var(--s1,rgba(10,10,32,.8));border:1px solid var(--bd2,rgba(120,110,220,0.18));border-radius:20px;padding:3px 4px;gap:2px;}
    #bxt-nav .bn-tbt{background:none;border:none;color:var(--tx2,#b0b8e0);font-size:11px;font-weight:600;cursor:pointer;padding:5px 9px;border-radius:14px;font-family:'Sora',sans-serif;transition:all .22s;display:flex;align-items:center;gap:4px;}
    #bxt-nav .bn-tbt.active{background:linear-gradient(135deg,#4f8ef7,#7c5cfc,#a855f7);color:#fff;box-shadow:0 0 10px rgba(124,92,252,.35);}
    #bxt-nav .bn-tbt i{font-size:10px;}
    /* Avatar */
    #bxt-nav .bn-auth-wrap{position:relative;}
    #bxt-nav .bn-login-btn{display:inline-flex;align-items:center;gap:6px;padding:7px 15px;border-radius:10px;background:linear-gradient(135deg,#4f8ef7,#7c5cfc);color:#fff;font-size:12px;font-weight:700;border:none;cursor:pointer;font-family:'Sora',sans-serif;transition:all .2s;box-shadow:0 0 16px rgba(124,92,252,.3);}
    #bxt-nav .bn-login-btn:hover{box-shadow:0 0 24px rgba(124,92,252,.5);transform:translateY(-1px);}
    #bxt-nav .bn-avatar{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#4f8ef7,#7c5cfc,#a855f7);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#fff;cursor:pointer;border:2px solid rgba(124,92,252,.4);flex-shrink:0;}
    #bxt-nav .bn-avatar-menu{position:absolute;top:calc(100% + 10px);right:0;background:var(--s1,rgba(10,10,32,.95));border:1px solid var(--bd2,rgba(120,110,220,0.18));border-radius:14px;padding:8px;min-width:190px;z-index:300;display:none;backdrop-filter:blur(20px);box-shadow:0 20px 60px rgba(0,0,0,.4);}
    #bxt-nav .bn-avatar-menu.open{display:block;}
    #bxt-nav .bn-av-info{padding:8px 12px 8px;border-bottom:1px solid var(--bd2,rgba(120,110,220,0.18));margin-bottom:6px;}
    #bxt-nav .bn-av-name{font-size:13px;font-weight:700;color:var(--tx,#e8ecff);}
    #bxt-nav .bn-av-email{font-size:11px;color:var(--tx2,#b0b8e0);}
    #bxt-nav .bn-av-item{display:flex;align-items:center;gap:9px;padding:9px 12px;border-radius:9px;font-size:13px;font-weight:500;color:var(--tx2,#b0b8e0);cursor:pointer;transition:all .18s;border:none;background:none;width:100%;text-align:left;font-family:'Sora',sans-serif;}
    #bxt-nav .bn-av-item:hover{background:var(--s2,rgba(14,14,40,.9));color:var(--tx,#e8ecff);}
    #bxt-nav .bn-av-item i{width:16px;text-align:center;color:#7c5cfc;}
    #bxt-nav .bn-av-item.danger i{color:#f87171;}
    #bxt-nav .bn-av-item.danger:hover{color:#f87171;}
    @media(max-width:600px){
      #bxt-nav{padding:10px 14px;}
      #bxt-nav .bn-logo span{display:none;}
      #bxt-nav .bn-usage{display:none;}
      #bxt-nav .bn-back span{display:none;}
      #bxt-nav .bn-tbt span{display:none;}
    }
  `;

  // ── HTML ──────────────────────────────────────────────────────────────────
  function buildNav(usageText) {
    return `
      <div class="bn-left">
        <a href="/" class="bn-logo">
          <div class="bn-logo-icon"><i class="fas fa-bolt"></i></div>
          <span>Bit X Tools</span>
        </a>
        <div class="bn-divider"></div>
        <a href="/" class="bn-back"><i class="fas fa-arrow-left"></i><span>All Tools</span></a>
        ${usageText ? `<div class="bn-usage"><i class="fas fa-bolt"></i>${usageText}</div>` : ''}
      </div>
      <div class="bn-right">
        <div class="bn-theme">
          <button class="bn-tbt" id="bnDark" onclick="bnSetTheme('dark')"><i class="fas fa-moon"></i><span>Dark</span></button>
          <button class="bn-tbt" id="bnLight" onclick="bnSetTheme('light')"><i class="fas fa-sun"></i><span>Light</span></button>
        </div>
        <div class="bn-auth-wrap" id="bnAuthWrap">
          <button class="bn-login-btn" id="bnLoginBtn" onclick="bnOpenLogin()"><i class="fas fa-user"></i>Sign In</button>
          <div style="display:none" id="bnUserArea">
            <div class="bn-avatar" id="bnAvatar" onclick="bnToggleMenu()">U</div>
            <div class="bn-avatar-menu" id="bnAvatarMenu">
              <div class="bn-av-info">
                <div class="bn-av-name" id="bnAvName">User</div>
                <div class="bn-av-email" id="bnAvEmail"></div>
              </div>
              <a href="/" class="bn-av-item"><i class="fas fa-th-large"></i>All Tools</a>
              <div class="bn-av-item" id="bnAdminItem" style="display:none" onclick="location.href='/admin'"><i class="fas fa-shield-halved"></i>Admin Panel</div>
              <div class="bn-av-item danger" onclick="bnLogout()"><i class="fas fa-sign-out-alt"></i>Sign Out</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ── THEME ─────────────────────────────────────────────────────────────────
  window.bnSetTheme = function(t) {
    document.body.classList.toggle('light', t === 'light');
    const d = document.getElementById('bnDark');
    const l = document.getElementById('bnLight');
    if (d) d.classList.toggle('active', t === 'dark');
    if (l) l.classList.toggle('active', t === 'light');
    localStorage.setItem('bxt-theme', t);
    // sync with page's own theme toggle if present
    const bd = document.getElementById('btnDark');
    const bl = document.getElementById('btnLight');
    if (bd) bd.classList.toggle('active', t === 'dark');
    if (bl) bl.classList.toggle('active', t === 'light');
  };

  function applyTheme() {
    const t = localStorage.getItem('bxt-theme') || 'dark';
    bnSetTheme(t);
  }

  // ── AUTH ──────────────────────────────────────────────────────────────────
  function bnTok() { return localStorage.getItem('bxt_token') || ''; }

  window.bnToggleMenu = function() {
    document.getElementById('bnAvatarMenu').classList.toggle('open');
  };

  document.addEventListener('click', function(e) {
    const wrap = document.getElementById('bnAuthWrap');
    if (wrap && !wrap.contains(e.target)) {
      const m = document.getElementById('bnAvatarMenu');
      if (m) m.classList.remove('open');
    }
  });

  window.bnOpenLogin = function() {
    // Try to open the page's own auth modal if it exists, else redirect home
    if (typeof openModal === 'function') {
      openModal();
    } else {
      window.location.href = '/?login=1';
    }
  };

  window.bnLogout = async function() {
    try { await fetch('/api/auth/logout', { method: 'POST', headers: { Authorization: 'Bearer ' + bnTok() } }); } catch {}
    localStorage.removeItem('bxt_token');
    window.location.reload();
  };

  async function bnInitAuth() {
    const token = bnTok();
    if (!token) return;
    try {
      const r = await fetch('/api/auth/me', { headers: { Authorization: 'Bearer ' + token } });
      const d = await r.json();
      if (d.ok && d.user) {
        const u = d.user;
        const loginBtn = document.getElementById('bnLoginBtn');
        const userArea = document.getElementById('bnUserArea');
        const avatar = document.getElementById('bnAvatar');
        if (loginBtn) loginBtn.style.display = 'none';
        if (userArea) userArea.style.display = 'block';
        if (avatar) avatar.textContent = (u.displayName || u.username)[0].toUpperCase();
        const nameEl = document.getElementById('bnAvName');
        const emailEl = document.getElementById('bnAvEmail');
        if (nameEl) nameEl.textContent = u.displayName + ' (@' + u.username + ')';
        if (emailEl) emailEl.textContent = u.email;
        if (u.role === 'admin' || u.username === 'nethindu') {
          const adminItem = document.getElementById('bnAdminItem');
          if (adminItem) adminItem.style.display = 'flex';
        }
      }
    } catch {}
  }

  // ── INIT ──────────────────────────────────────────────────────────────────
  function initNav() {
    // Inject CSS
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    // Find mount point
    const mount = document.getElementById('site-nav');
    if (!mount) return;

    // Get usage text from attribute or data-usage
    const usageText = mount.getAttribute('data-usage') || '';

    // Create nav element
    const nav = document.createElement('nav');
    nav.id = 'bxt-nav';
    nav.innerHTML = buildNav(usageText);
    mount.replaceWith(nav);

    // Apply theme
    applyTheme();

    // Init auth
    bnInitAuth();
  }

  // Auto-init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNav);
  } else {
    initNav();
  }
})();
