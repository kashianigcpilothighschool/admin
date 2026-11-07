/* admin-upgrade.js — অ্যাডমিন প্যানেলের সাজসজ্জা + নতুন "ডিভাইস" ট্যাব
   admin.html-এ admin-modules.js-এর পরে যোগ করুন:  <script src="admin-upgrade.js"></script> */
(function () {
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

  // ---------- ডিভাইস ট্যাব ----------
  var STL = { pending: "অপেক্ষায়", approved: "অনুমোদিত", rejected: "বাতিল" };
  var TAG = { pending: "pending", approved: "active", rejected: "blocked" };
  var all = [], flt = "", q = "";
  var icon = function (l) { return /Android|iOS|iPhone/i.test(l) ? "📱" : "💻"; };
  // userAgent থেকে সংক্ষিপ্ত নাম (পুরো লেখা হোভার করলে দেখা যায়)
  var devName = function (ua) {
    ua = String(ua || ""); if (!ua) return "অজানা ডিভাইস";
    var os = /Android/i.test(ua) ? "Android" : /iPhone|iPad|iOS/i.test(ua) ? "iOS" : /Windows/i.test(ua) ? "Windows" : /Mac OS/i.test(ua) ? "Mac" : /Linux/i.test(ua) ? "Linux" : "";
    var br = /Edg\//i.test(ua) ? "Edge" : /OPR\/|Opera/i.test(ua) ? "Opera" : /Chrome\//i.test(ua) ? "Chrome" : /Firefox\//i.test(ua) ? "Firefox" : /Safari\//i.test(ua) ? "Safari" : "";
    return [br, os].filter(Boolean).join(" · ") || ua.slice(0, 40);
  };

  var _go = window.go;
  window.go = function (t) {
    if (t !== "devices") return _go(t);
    tab = t;
    document.querySelectorAll("#nav button").forEach(function (x) { x.classList.toggle("on", x.dataset.t === t); });
    document.getElementById("main").innerHTML = '<div class="empty">লোড হচ্ছে...</div>';
    load().catch(function (e) { document.getElementById("main").innerHTML = '<div class="empty">' + esc(e.message) + "</div>"; });
  };

  async function load() {
    all = await api("adminListDevices", TOKEN, "");
    var c = { pending: 0, approved: 0, rejected: 0 };
    all.forEach(function (d) { if (c[d.status] !== undefined) c[d.status]++; });
    var nb = document.getElementById("navDevices");
    if (nb) nb.textContent = "ডিভাইস" + (c.pending ? " (" + c.pending + ")" : "");
    var main = document.getElementById("main");
    main.innerHTML =
      '<div class="ux-cards">' +
      '<div class="ux-card"><b>' + all.length + '</b><span>মোট নিবন্ধিত</span></div>' +
      '<div class="ux-card p"><b>' + c.pending + '</b><span>অনুমোদনের অপেক্ষায়</span></div>' +
      '<div class="ux-card a"><b>' + c.approved + '</b><span>অনুমোদিত</span></div>' +
      '<div class="ux-card r"><b>' + c.rejected + '</b><span>বাতিল</span></div></div>' +
      '<div class="ux-bar"><input class="f" id="uxQ" placeholder="ইউজার বা ডিভাইস খুঁজুন" style="min-width:220px" value="' + esc(q) + '">' +
      [["", "সব"], ["pending", "অপেক্ষায়"], ["approved", "অনুমোদিত"], ["rejected", "বাতিল"]].map(function (x) {
        return '<button class="ux-chip' + (flt === x[0] ? " on" : "") + '" data-f="' + x[0] + '">' + x[1] + "</button>";
      }).join("") + '<button class="btn ghost sm" id="uxR">🔄 রিফ্রেশ</button></div><div id="uxList"></div>' +
      '<p class="hint">কেউ OTP দিয়ে লগইন করলে ডিভাইসটি এখানে নিবন্ধিত হয়। <b>নিবন্ধন মুছুন</b> দিলে ওই ডিভাইসে আবার OTP লাগবে। অনুমোদন-ব্যবস্থা চালু করতে সার্ভারে <b>DEVICE_APPROVAL=on</b> দিন।</p>';
    document.getElementById("uxQ").oninput = function () { q = this.value; list(); };
    document.getElementById("uxR").onclick = function () { go("devices"); };
    main.querySelectorAll("[data-f]").forEach(function (b) {
      b.onclick = function () { flt = b.dataset.f; main.querySelectorAll("[data-f]").forEach(function (x) { x.classList.toggle("on", x === b); }); list(); };
    });
    list();
  }

  function list() {
    var s = q.trim().toLowerCase();
    var rows = all.filter(function (d) {
      return (!flt || d.status === flt) && (!s || (d.email + " " + d.name + " " + d.label).toLowerCase().indexOf(s) >= 0);
    });
    var box = document.getElementById("uxList");
    if (!rows.length) { box.innerHTML = '<div class="empty">কোনো ডিভাইস নেই</div>'; return; }
    var by = {};
    rows.forEach(function (d) { (by[d.email] = by[d.email] || []).push(d); });
    box.innerHTML = Object.keys(by).map(function (em) {
      var ds = by[em];
      return '<div class="ux-user"><div class="ux-uh"><div><b>' + esc(ds[0].name || em) + '</b> <small>' + esc(em) + ' · ' + ds.length + 'টি ডিভাইস</small></div>' +
        '<button class="btn bad sm" data-all="' + esc(em) + '">সব ডিভাইসের নিবন্ধন মুছুন</button></div>' +
        ds.map(function (d) {
          return '<div class="ux-dev" data-id="' + esc(d.id) + '"><span class="ux-ic">' + icon(d.label) + '</span>' +
            '<div class="ux-info"><b title="' + esc(d.label) + '">' + esc(devName(d.label)) + '</b> <span class="tag ' + (TAG[d.status] || "") + '">' + esc(STL[d.status] || d.status) + '</span>' +
            '<small>নিবন্ধন: ' + esc(d.created) + ' · শেষ ব্যবহার: ' + esc(d.lastUsed || "—") + ' · মেয়াদ: ' + esc(d.expires) + '</small></div>' +
            '<div class="ux-acts">' +
            (d.status !== "approved" ? '<button class="btn ok sm" data-a="approved">অনুমোদন</button>' : "") +
            (d.status !== "rejected" ? '<button class="btn ghost sm" data-a="rejected">বাতিল</button>' : "") +
            '<button class="btn bad sm" data-a="del">নিবন্ধন মুছুন</button></div></div>';
        }).join("") + "</div>";
    }).join("");

    box.querySelectorAll("[data-a]").forEach(function (b) {
      b.onclick = function () {
        var id = b.closest("[data-id]").dataset.id, a = b.dataset.a;
        if (a === "del" && !confirm("এই ডিভাইসের নিবন্ধন মুছবেন? ইউজারকে আবার OTP দিতে হবে।")) return;
        run(b, async function () {
          if (a === "del") await api("adminDeleteDevice", TOKEN, id);
          else await api("adminSetDeviceStatus", TOKEN, id, a);
          toast("✅ সম্পন্ন"); go("devices");
        });
      };
    });
    box.querySelectorAll("[data-all]").forEach(function (b) {
      b.onclick = function () {
        var em = b.dataset.all;
        if (!confirm(em + " এর সব ডিভাইসের নিবন্ধন মুছবেন? পরের লগইনে সব ডিভাইসে আবার OTP লাগবে।")) return;
        run(b, async function () { var r = await api("adminUnregisterUserDevices", TOKEN, em); toast("✅ " + (r.removed || 0) + "টি ডিভাইসের নিবন্ধন মোছা হয়েছে"); go("devices"); });
      };
    });
  }
})();
