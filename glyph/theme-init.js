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

    var dark = (theme === 'dark') ||
      (theme === 'auto' && window.matchMedia &&
       window.matchMedia('(prefers-color-scheme: dark)').matches);

    var meta = document.getElementById('themeColor');
    if (meta) meta.setAttribute('content', dark ? '#0a0c11' : '#f4f5f7');
  } catch (e) { /* niemals den Seitenaufbau aufhalten */ }
})();
