/* =====================================================================
   home-links.js — স্কুলের হোম পেজের লিংক অ্যাডমিন প্যানেল থেকে নিয়ন্ত্রণ
   হোম পেজের মূল কোড অপরিবর্তিত; </body>-এর আগে শুধু এই লাইন যোগ করুন:
       <script src="home-links.js"></script>
   অ্যাডমিন প্যানেলের "হোম পেজ লিংক" ট্যাবে বদলালে এখানে নিজে থেকেই প্রয়োগ হয়।
   লিংক মেলানো হয় "জায়গা|লিংকের (বাংলা) লেখা" দিয়ে (মেনু, সাইডবার, মূল সেকশন, ফুটার)। সার্ভার না পেলে আগের সংরক্ষিত/মূল লিংকই থাকে।
   ===================================================================== */
(function () {
  var API_URL  = "https://xemvwhqqpbxsdkqcscrg.supabase.co/functions/v1/attendance";
  var ANON_KEY = "sb_publishable_Ecayyqfsteeio6zjLzHAZw_F6I3h_F0";
  var LS = "home_links_cache_v1";

  function safe(u) {  // বাড়তি সুরক্ষা: javascript: ইত্যাদি কখনো বসবে না
    u = String(u || "").trim();
    return /^(https?:\/\/|tel:|mailto:)/i.test(u) || (!/^[a-z][a-z0-9+.-]*:/i.test(u) && u.indexOf("//") !== 0 && !/[\s<>"']/.test(u));
  }
  function areaOf(a) {
    if (a.closest("nav.main-nav")) return "মেনু";
    if (a.closest("footer")) return "ফুটার";
    if (a.closest("aside")) return "সাইডবার";
    if (a.closest(".panel")) return "মূল সেকশন";
    return "";
  }
  function nameOf(a) {
    var n = (a.getAttribute("data-bn") || "").trim();
    if (!n) { var inner = a.querySelector("[data-bn]"); if (inner) n = (inner.getAttribute("data-bn") || "").trim(); }
    if (!n) n = (a.textContent || "").trim();
    return n.replace(/\s+/g, " ");
  }
  function apply(list) {
    if (!Array.isArray(list) || !list.length) return;
    var map = {};
    list.forEach(function (m) { if (m && m.name && safe(m.url)) map[String(m.name).trim()] = String(m.url).trim(); });
    var links = document.querySelectorAll("a[href]");
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      if (a.classList.contains("notice-open") || a.classList.contains("notice-download")) continue;
      if (a.id === "marqLink" || a.id === "lang-bn" || a.id === "lang-en") continue;
      var area = areaOf(a), name = nameOf(a);
      if (!area || !name) continue;
      var u = map[area + "|" + name];
      if (u && a.getAttribute("href") !== u) a.setAttribute("href", u);
    }
  }
  function run() {
    try { apply(JSON.parse(localStorage.getItem(LS) || "null")); } catch (e) {}   // আগের সংরক্ষিত লিংক সঙ্গে সঙ্গে
    var h = { "Content-Type": "application/json", apikey: ANON_KEY, Authorization: "Bearer " + ANON_KEY };
    fetch(API_URL, { method: "POST", headers: h, body: JSON.stringify({ fn: "getHomeLinks", args: [] }) })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j || !j.ok || !Array.isArray(j.data)) return;
        try { localStorage.setItem(LS, JSON.stringify(j.data)); } catch (e) {}
        apply(j.data);
      }).catch(function () {});
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run); else run();
})();
