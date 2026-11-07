/* home-links.js — অ্যাডমিনের সংরক্ষিত হোম পেজ লিংক প্রয়োগ করে।
   হোম পেজে </body>-এর আগে দিন:  <script src="home-links.js"></script>
   নিচের FN_URL বদলান (আপনার মূল Edge Function-এর URL)। */
(function () {
  var FN_URL = "https://YOUR-PROJECT.supabase.co/functions/v1/attendance";
  var ANON = ""; // Function-এ JWT যাচাই চালু থাকলে anon key দিন

  // লিংক কোন জায়গার, তা কাছের ট্যাগ দেখে আন্দাজ করা (পেজের গঠন অনুযায়ী বদলাতে পারেন)
  var AREAS = [["ফুটার", "footer"], ["সাইডবার", "aside,.sidebar,[class*=side]"], ["মেনু", "nav,header,.navbar,[class*=menu]"]];
  function area(a) {
    for (var i = 0; i < AREAS.length; i++) if (a.closest(AREAS[i][1])) return AREAS[i][0];
    return "মূল সেকশন";
  }
  function safe(u) {
    return /^https?:\/\/[^\s<>"']+$/i.test(u) || /^(tel|mailto):[^\s<>"']+$/i.test(u) ||
      (!/^[a-z][a-z0-9+.-]*:/i.test(u) && u.indexOf("//") !== 0 && !/[\s<>"']/.test(u));
  }
  function txt(a) { return a.textContent.replace(/\s+/g, " ").trim(); }

  function apply(list) {
    var links = [].slice.call(document.querySelectorAll("a"));
    list.forEach(function (m) {
      if (!m || !m.name || !safe(String(m.url))) return;
      var p = m.name.split("|"), ar = p[0], tx = p.slice(1).join("|").trim();
      var hit = links.filter(function (a) { var t = txt(a); return t.indexOf(tx) >= 0 && t.length <= tx.length + 4; });
      var exact = hit.filter(function (a) { return area(a) === ar; });
      (exact.length ? exact : hit).forEach(function (a) {
        a.setAttribute("href", m.url);
        if (/^https?:/i.test(m.url)) { a.target = "_blank"; a.rel = "noopener"; } else a.removeAttribute("target");
      });
    });
  }

  var headers = { "Content-Type": "application/json" };
  if (ANON) { headers.Authorization = "Bearer " + ANON; headers.apikey = ANON; }
  fetch(FN_URL, { method: "POST", headers: headers, body: JSON.stringify({ fn: "getHomeLinks", args: [] }) })
    .then(function (r) { return r.json(); })
    .then(function (j) {
      if (!j.ok || !Array.isArray(j.data) || !j.data.length) return;
      var run = function () { apply(j.data); };
      if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run); else run();
      setTimeout(run, 1500); // পরে JS দিয়ে আঁকা লিংকের জন্য
    })
    .catch(function () { /* ব্যর্থ হলে মূল লিংকই থাকবে */ });
})();
