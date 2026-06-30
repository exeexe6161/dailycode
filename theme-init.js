/* ============================================================
   dailycode  Theme Init
   Blockierend im <head>, laeuft synchron VOR dem ersten Paint,
   damit das gewaehlte Theme nicht von hell nach dunkel blitzt.
   Setzt nur data-theme am Wurzelelement und die theme-color Meta.
   Alles defensiv: Storage Ausfall faellt auf auto zurueck, nie
   blockieren. Keine externen Ressourcen, CSP konform (self).
   ============================================================ */
(function () {
  'use strict';
  try {
    var root = document.documentElement;
    var theme = 'auto';
    try {
      var v = window.localStorage.getItem('dailycode:theme');
      if (v === 'auto' || v === 'light' || v === 'dark') theme = v;
    } catch (e) { /* kein Storage: bleibt auto, nur Sitzung */ }

    root.setAttribute('data-theme', theme);

    if (theme !== 'auto') {
      var color = (theme === 'dark') ? '#16181B' : '#FFFFFF';
      var metas = document.querySelectorAll('meta[name="theme-color"]');
      for (var i = 0; i < metas.length; i++) { metas[i].setAttribute('content', color); }
    }
  } catch (e) { /* niemals den Seitenaufbau aufhalten */ }
})();
