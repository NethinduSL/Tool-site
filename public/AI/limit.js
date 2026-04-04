/* ═══════════════════════════════════════════════
   Bit X Tools — Limit Guard (UNLIMITED MODE)
   All users: Unlimited access, no daily limit
   ═══════════════════════════════════════════════ */

(function(){
  // ── Core: always allow, no limit check needed ──
  // Returns true → allowed to proceed (always)
  window.bxtCheckLimit = async function(){
    return true; // Everyone is unlimited
  };

  // ── No limit bar shown — everyone is unlimited ──
  // window.addEventListener('DOMContentLoaded', ...) removed
})();
