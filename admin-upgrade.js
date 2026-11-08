/* admin-upgrade.js — অ্যাডমিন প্যানেলের সাজসজ্জা + "ডিভাইস" ট্যাব (সংশোধিত সংস্করণ)
   admin.html-এ admin-modules.js-এর পরে যোগ করুন:
   <script src="https://admin-woad-five-84.vercel.app/admin-upgrade.js"></script>
   এই সংস্করণ নিজে থেকেই "ডিভাইস" বাটন তৈরি করে এবং go() ফাংশনের ওপর নির্ভর করে না। */
(function () {
  if (window.__uxDevicesLoaded) return;
  window.__uxDevicesLoaded = true;

  // ---------- সাজসজ্জা ----------
  var st = document.createElement("style");
  st.textContent =
    "#nav{gap:8px;flex-wrap:wrap}#nav button{border-radius:999px;transition:all .15s}#nav button:hover{transform:translateY(-1px)}" +
    ".tw{border-radius:12px;box-shadow:0 2px 10px rgba(27,58,75,.10);overflow:auto;background:#fff}" +
    ".tw th{position:sticky;top:0;z-index:1}.tw tr:hover td{background:rgba(47,111,78,.05)}" +
    ".btn{border-radius:8px;transition:transform .1s,box-shadow .1s}.btn:hover{transform:translateY(-1px);box-shadow:0 3px 8px rgba(0,0,0,.15)}" +
    ".tag{border-radius:999px;padding:2px 10px;font-size:12px;font-weight:700}" +
    ".f{border-radius:8px}.hint{border-radius:10px}" +
    ".ux-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:14px}" +
    ".ux-card{background:#fff;border-radius:12px;padding:12px 14px;box-shadow:0 2px 10px rgba(27,58,75,.10);border-left:5px solid #1B3A4B}" +
    ".ux-card b{display:block;font-size:26px}.ux-card span{font-size:13px;color:#6b7f8b}" +
    ".ux-card.p{border-color:#D9A21B}.ux-card.a{border-color:#2F6F4E}.ux-card.r{border-color:#9C3B32}" +
    ".ux-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px}" +
    ".ux-chip{border:1px solid #D8D2C0;background:#fff;border-radius:999px;padding:6px 14px;cursor:pointer;font:inherit}" +
    ".ux-chip.on{background:#1B3A4B;color:#fff;border-color:#1B3A4B}" +
    ".ux-user{background:#fff;border-radius:12px;box-shadow:0 2px 10px rgba(27,58,75,.10);margin-bottom:12px;overflow:hidden}" +
    ".ux-uh{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px;padding:10px 14px;background:#F7F1DF}" +
    ".ux-dev{display:flex;flex-wrap:wrap;align-items:center;gap:12px;padding:10px 14px;border-top:1px solid #eee}" +
    ".ux-ic{font-size:26px}.ux-info{flex:1;min-width:200px}.ux-info small{display:block;color:#6b7f8b}" +
    ".ux-acts{display:flex;gap:6px;flex-wrap:wrap}";
  document.head.appendChild(st);

  // ---------- সাহায্যকারী (মূল ফাংশন না থাকলে নিজেরা কাজ চালায়) ----------
  var $ = function (id) { return document.getElementById(id); };
  var E = function (s) {
    s = String(s == null ? "" : s);
    if (typeof esc === "function") return esc(s);
    return s.replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  };
  var T = function (m) { if (typeof toast === "function") toast(m); else alert(m); };
  var tok = function () { return typeof TOKEN !== "undefined" ? TOKEN : ""; };
  var call = function () {
    if (typeof api !== "function") throw new Error("api() ফাংশন পাওয়া যায়নি। admin-upgrade.js অবশ্যই মূল স্ক্রিপ্টগুলোর পরে যোগ করুন।");
    return api.apply(null, arguments);
  };
  var R = function (btn, fn) {
    if (typeof run === "function") return run(btn, fn);
    btn.disabled = true;
    return Promise.resolve().then(fn).catch(function (e) { T("❌ " + ((e && e.message) || e)); }).then(function () { btn.disabled = false; });
  };

  // ---------- ডিভাইস ট্যাব ----------
  var STL = { pending: "অপেক্ষায়", approved: "অনুমোদিত", rejected: "বাতিল" };
  var TAG = { pending: "pending", approved: "active", rejected: "blocked" };
  var all = [], flt = "", q = "", active = false;
  var icon = function (l) { return /Android|iOS|iPhone/i.test(l) ? "📱" : "💻"; };
  var devName = function (ua) {
    ua = String(ua || ""); if (!ua) return "অজানা ডিভাইস";
    var os = /Android/i.test(ua) ? "Android" : /iPhone|iPad|iOS/i.test(ua) ? "iOS" : /Windows/i.test(ua) ? "Windows" : /Mac OS/i.test(ua) ? "Mac" : /Linux/i.test(ua) ? "Linux" : "";
    var br = /Edg\//i.test(ua) ? "Edge" : /OPR\/|Opera/i.test(ua) ? "Opera" : /Chrome\//i.test(ua) ? "Chrome" : /Firefox\//i.test(ua) ? "Firefox" : /Safari\//i.test(ua) ? "Safari" : "";
    return [br, os].filter(Boolean).join(" · ") || ua.slice(0, 40);
  };

  // "ডিভাইস" বাটন না থাকলে নিজে তৈরি করে (লগইনের পরে নেভ তৈরি হলেও ধরে ফেলে)
  function ensureBtn() {
    var nav = $("nav"); if (!nav) return;
    if (nav.querySelector('[data-t="devices"]')) return;
    var b = document.createElement("button");
    var first = nav.querySelector("button");
    b.className = first ? first.className.replace(/\bon\b/g, "").trim() : "";
    b.setAttribute("data-t", "devices");
    b.id = "navDevices";
    b.textContent = "ডিভাইস";
    nav.appendChild(b);
  }
  var timer = null;
  function schedule() { if (timer) return; timer = setTimeout(function () { timer = null; ensureBtn(); }, 150); }
  ensureBtn();
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });

  // ক্লিক ধরা: মূল go() ফাংশনের ওপর নির্ভর করে না
  document.addEventListener("click", function (e) {
    var nb = e.target.closest ? e.target.closest("#nav button") : null;
    if (!nb) return;
    if (nb.getAttribute("data-t") === "devices") {
      e.preventDefault(); e.stopPropagation();
      openDevices();
    } else {
      active = false;
    }
  }, true);

  // অন্য কোড go("devices") ডাকলেও যেন কাজ করে
  if (typeof window.go === "function" && !window.go.__ux) {
    var _go = window.go;
    window.go = function (t) { if (t === "devices") return openDevices(); active = false; return _go.apply(this, arguments); };
    window.go.__ux = true;
  }

  function openDevices() {
    active = true;
    try { tab = "devices"; } catch (e) {}
    document.querySelectorAll("#nav button").forEach(function (x) { x.classList.toggle("on", x.getAttribute("data-t") === "devices"); });
    var main = $("main");
    if (!main) { T("❌ #main এলাকা পাওয়া যায়নি"); return; }
    main.innerHTML = '<div class="empty">লোড হচ্ছে...</div>';
    load().catch(function (e) {
      if (active) main.innerHTML = '<div class="empty">❌ ' + E((e && e.message) || e) + "</div>";
    });
  }

  async function load() {
    var data = await call("adminListDevices", tok(), "");
    if (!active) return;
    all = Array.isArray(data) ? data : [];
    var c = { pending: 0, approved: 0, rejected: 0 };
    all.forEach(function (d) { if (c[d.status] !== undefined) c[d.status]++; });
    var nb = document.querySelector('#nav [data-t="devices"]');
    if (nb) nb.textContent = "ডিভাইস" + (c.pending ? " (" + c.pending + ")" : "");
    var main = $("main");
    main.innerHTML =
      '<div class="ux-cards">' +
      '<div class="ux-card"><b>' + all.length + '</b><span>মোট নিবন্ধিত</span></div>' +
      '<div class="ux-card p"><b>' + c.pending + '</b><span>অনুমোদনের অপেক্ষায়</span></div>' +
      '<div class="ux-card a"><b>' + c.approved + '</b><span>অনুমোদিত</span></div>' +
      '<div class="ux-card r"><b>' + c.rejected + '</b><span>বাতিল</span></div></div>' +
      '<div class="ux-bar"><input class="f" id="uxQ" placeholder="ইউজার বা ডিভাইস খুঁজুন" style="min-width:220px" value="' + E(q) + '">' +
      [["", "সব"], ["pending", "অপেক্ষায়"], ["approved", "অনুমোদিত"], ["rejected", "বাতিল"]].map(function (x) {
        return '<button class="ux-chip' + (flt === x[0] ? " on" : "") + '" data-f="' + x[0] + '">' + x[1] + "</button>";
      }).join("") + '<button class="btn ghost sm" id="uxR">🔄 রিফ্রেশ</button></div><div id="uxList"></div>' +
      '<p class="hint">কেউ OTP দিয়ে লগইন করলে ডিভাইসটি এখানে নিবন্ধিত হয়। <b>নিবন্ধন মুছুন</b> দিলে ওই ডিভাইসে আবার OTP লাগবে। অনুমোদন-ব্যবস্থা চালু করতে সার্ভারে <b>DEVICE_APPROVAL=on</b> দিন।</p>';
    $("uxQ").oninput = function () { q = this.value; list(); };
    $("uxR").onclick = openDevices;
    main.querySelectorAll("[data-f]").forEach(function (b) {
      b.onclick = function () {
        flt = b.getAttribute("data-f");
        main.querySelectorAll("[data-f]").forEach(function (x) { x.classList.toggle("on", x === b); });
        list();
      };
    });
    list();
  }

  function list() {
    var s = q.trim().toLowerCase();
    var rows = all.filter(function (d) {
      return (!flt || d.status === flt) && (!s || ((d.email || "") + " " + (d.name || "") + " " + (d.label || "")).toLowerCase().indexOf(s) >= 0);
    });
    var box = $("uxList"); if (!box) return;
    if (!rows.length) { box.innerHTML = '<div class="empty">কোনো ডিভাইস নেই</div>'; return; }
    var by = {};
    rows.forEach(function (d) { (by[d.email] = by[d.email] || []).push(d); });
    box.innerHTML = Object.keys(by).map(function (em) {
      var ds = by[em];
      return '<div class="ux-user"><div class="ux-uh"><div><b>' + E(ds[0].name || em) + '</b> <small>' + E(em) + ' · ' + ds.length + 'টি ডিভাইস</small></div>' +
        '<button class="btn bad sm" data-all="' + E(em) + '">সব ডিভাইসের নিবন্ধন মুছুন</button></div>' +
        ds.map(function (d) {
          return '<div class="ux-dev" data-id="' + E(d.id) + '"><span class="ux-ic">' + icon(d.label) + '</span>' +
            '<div class="ux-info"><b title="' + E(d.label) + '">' + E(devName(d.label)) + '</b> <span class="tag ' + (TAG[d.status] || "") + '">' + E(STL[d.status] || d.status) + '</span>' +
            '<small>নিবন্ধন: ' + E(d.created) + ' · শেষ ব্যবহার: ' + E(d.lastUsed || "—") + ' · মেয়াদ: ' + E(d.expires) + '</small></div>' +
            '<div class="ux-acts">' +
            (d.status !== "approved" ? '<button class="btn ok sm" data-a="approved">অনুমোদন</button>' : "") +
            (d.status !== "rejected" ? '<button class="btn ghost sm" data-a="rejected">বাতিল</button>' : "") +
            '<button class="btn bad sm" data-a="del">নিবন্ধন মুছুন</button></div></div>';
        }).join("") + "</div>";
    }).join("");

    box.querySelectorAll("[data-a]").forEach(function (b) {
      b.onclick = function () {
        var id = b.closest("[data-id]").getAttribute("data-id"), a = b.getAttribute("data-a");
        if (a === "del" && !confirm("এই ডিভাইসের নিবন্ধন মুছবেন? ইউজারকে আবার OTP দিতে হবে।")) return;
        R(b, async function () {
          if (a === "del") await call("adminDeleteDevice", tok(), id);
          else await call("adminSetDeviceStatus", tok(), id, a);
          T("✅ সম্পন্ন"); openDevices();
        });
      };
    });
    box.querySelectorAll("[data-all]").forEach(function (b) {
      b.onclick = function () {
        var em = b.getAttribute("data-all");
        if (!confirm(em + " এর সব ডিভাইসের নিবন্ধন মুছবেন? পরের লগইনে সব ডিভাইসে আবার OTP লাগবে।")) return;
        R(b, async function () {
          var r = await call("adminUnregisterUserDevices", tok(), em);
          T("✅ " + ((r && r.removed) || 0) + "টি ডিভাইসের নিবন্ধন মোছা হয়েছে"); openDevices();
        });
      };
    });
  }
})();
