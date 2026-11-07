/* =====================================================================
   admin-modules.js — অ্যাডমিন প্যানেল থেকে সিস্টেম (মডিউল) লিংক বদলানোর অ্যাড-অন
   মূল index.html-এ কোনো লাইন বদলাতে হবে না।
   ব্যবহার: index.html-এর মূল <script> ব্লকের পরে, </body>-এর আগে যোগ করুন:
       <script src="admin-modules.js"></script>

   এটি যা করে:
   • অ্যাডমিন নেভিগেশনে "সিস্টেম লিংক" ট্যাব যোগ করে (নাম, আইকন, বিবরণ, URL, অফিস-অনুমতি সম্পাদনা/নতুন/মোছা)
   • সংরক্ষিত তালিকা হাব-এ (শিক্ষক/অফিস/অ্যাডমিন সবার জন্য) প্রয়োগ করে

   সার্ভারে দুটি ফাংশন দরকার (Edge Function-এ যোগ করতে হবে):
       getModules(token)               -> তালিকা (যেকোনো লগইন করা ইউজার পাবে)
       adminSaveModules(token, list)   -> শুধু অ্যাডমিন; তালিকা সংরক্ষণ
   সার্ভারে ফাংশন না থাকলে এই ব্রাউজারের localStorage-এ সংরক্ষিত হবে (শুধু এই ডিভাইসে কাজ করবে)।
   ===================================================================== */
(function () {
  var LS = "modules_override_v1";

  function clean(list) {
    return (Array.isArray(list) ? list : []).map(function (m) {
      return {
        icon: String(m.icon || "📄"), title: String(m.title || "").trim(),
        desc: String(m.desc || ""), url: String(m.url || "").trim(), officeOk: !!m.officeOk
      };
    }).filter(function (m) { return m.title && m.url; });
  }
  function apply(list) {
    list = clean(list);
    if (!list.length) return;
    MODULES.splice(0, MODULES.length);
    list.forEach(function (m) { MODULES.push(m); });
  }
  function fromLocal() { try { return JSON.parse(localStorage.getItem(LS) || "null"); } catch (e) { return null; } }

  async function loadFromServer() {
    try { var l = await api("getModules", TOKEN); if (Array.isArray(l) && l.length) return l; }
    catch (e) { /* সার্ভারে ফাংশন নেই বা সেশন সমস্যা */ }
    return fromLocal();
  }

  // ---- হাব দেখানোর আগে সংরক্ষিত তালিকা প্রয়োগ ----
  var _showHub = window.showHub;
  window.showHub = async function (me) {
    try { var l = await loadFromServer(); if (l) apply(l); } catch (e) {}
    return _showHub.call(this, me);
  };

  // ---- অ্যাডমিন ট্যাব ----
  var nav = document.getElementById("nav");
  if (nav && !nav.querySelector('[data-t="modules"]')) {
    var b = document.createElement("button");
    b.setAttribute("data-t", "modules"); b.textContent = "সিস্টেম লিংক";
    nav.appendChild(b);
  }
  if (nav && !nav.querySelector('[data-t="devices"]')) {
    var b3 = document.createElement("button");
    b3.setAttribute("data-t", "devices"); b3.id = "navDevices"; b3.textContent = "ডিভাইস";
    nav.appendChild(b3);
  }
  if (nav && !nav.querySelector('[data-t="events"]')) {
    var b4 = document.createElement("button");
    b4.setAttribute("data-t", "events"); b4.textContent = "ছুটির ইভেন্ট";
    nav.appendChild(b4);
  }
  if (nav && !nav.querySelector('[data-t="homelinks"]')) {
    var b2 = document.createElement("button");
    b2.setAttribute("data-t", "homelinks"); b2.textContent = "হোম পেজ লিংক";
    nav.appendChild(b2);
  }

  var _go = window.go;
  window.go = function (t) {
    if (t !== "modules" && t !== "homelinks" && t !== "devices" && t !== "events") return _go(t);
    tab = t;
    document.querySelectorAll("#nav button").forEach(function (x) { x.classList.toggle("on", x.dataset.t === t); });
    document.getElementById("main").innerHTML = '<div class="empty">লোড হচ্ছে...</div>';
    (t === "modules" ? vModules() : t === "devices" ? vDevices() : t === "events" ? vEvents() : vHomeLinks()).catch(function (e) { document.getElementById("main").innerHTML = '<div class="empty">' + esc(e.message) + "</div>"; });
  };

  var rows = [];
  async function vModules() {
    var l = await loadFromServer();
    rows = clean(l && l.length ? l : MODULES).map(function (m) { return Object.assign({}, m); });
    draw();
  }
  function draw() {
    var h = '<p class="hint" style="margin:0 0 12px">এখানে পেজের ফাইলের নাম বদলালে (যেমন <b>attendance.html</b>) শিক্ষক/অফিস/অ্যাডমিন সবার হাবে নতুন লিংক দেখাবে। <b>?token=</b> আলাদা দিতে হবে না, সিস্টেম নিজেই যোগ করবে। বাইরের সাইটের লিংক (https://...) নিরাপত্তার কারণে চলবে না।</p><div class="tw"><table><tr><th>আইকন</th><th>নাম</th><th>বিবরণ</th><th>URL</th><th>অফিস দেখবে</th><th></th></tr>';
    rows.forEach(function (m, i) {
      h += '<tr data-i="' + i + '">' +
        '<td><input class="f" data-k="icon" style="width:60px" value="' + esc(m.icon) + '"></td>' +
        '<td><input class="f" data-k="title" style="min-width:130px" value="' + esc(m.title) + '"></td>' +
        '<td><input class="f" data-k="desc" style="min-width:150px" value="' + esc(m.desc) + '"></td>' +
        '<td><input class="f" data-k="url" style="min-width:220px" value="' + esc(m.url) + '"></td>' +
        '<td style="text-align:center"><input type="checkbox" data-k="officeOk"' + (m.officeOk ? " checked" : "") + '></td>' +
        '<td><button class="btn bad sm" data-del="' + i + '">মুছুন</button></td></tr>';
    });
    h += '</table></div><div class="bar" style="margin-top:14px"><button class="btn ghost" id="mAdd">+ নতুন সিস্টেম</button><button class="btn ok" id="mSave">সংরক্ষণ করুন</button></div>';
    var main = document.getElementById("main"); main.innerHTML = h;

    main.querySelectorAll("[data-k]").forEach(function (el) {
      var f = function () {
        var i = +el.closest("tr").dataset.i, k = el.dataset.k;
        rows[i][k] = el.type === "checkbox" ? el.checked : el.value;
      };
      el.addEventListener("input", f); el.addEventListener("change", f);
    });
    main.querySelectorAll("[data-del]").forEach(function (bt) {
      bt.onclick = function () {
        var i = +bt.dataset.del;
        if (!confirm('"' + rows[i].title + '" মুছবেন?')) return;
        rows.splice(i, 1); draw();
      };
    });
    document.getElementById("mAdd").onclick = function () { rows.push({ icon: "📄", title: "নতুন সিস্টেম", desc: "", url: "", officeOk: false }); draw(); };
    document.getElementById("mSave").onclick = function () {
      var btn = this;
      run(btn, async function () {
        var list = clean(rows);
        if (!list.length) throw new Error("অন্তত একটি সিস্টেম (নাম ও URL সহ) থাকতে হবে।");
        list.forEach(function (m) {
          if (/^[a-z][a-z0-9+.-]*:/i.test(m.url) || m.url.indexOf("//") === 0 || /[\s<>"']/.test(m.url))
            throw new Error('URL শুধু নিজের সাইটের পেজের নাম হতে পারবে (যেমন attendance.html): ' + m.url);
        });
        try {
          await api("adminSaveModules", TOKEN, list);
          try { localStorage.removeItem(LS); } catch (e) {}
          toast("✅ সংরক্ষিত হয়েছে (সবার জন্য)");
        } catch (e) {
          if (/SESSION_EXPIRED|সেশন/.test(e.message)) throw e;
          try { localStorage.setItem(LS, JSON.stringify(list)); } catch (x) {}
          toast("⚠️ সার্ভারে সংরক্ষণ হয়নি (" + e.message + ")। শুধু এই ডিভাইসে সংরক্ষিত।", true);
        }
        apply(list); rows = list.map(function (m) { return Object.assign({}, m); }); draw();
      });
    };
  }


  // ================= ডিভাইস অনুমোদন =================
  function deviceLabel() {
    var u = navigator.userAgent || "", br = "ব্রাউজার", os = "";
    if (/Edg\//.test(u)) br = "Edge"; else if (/OPR\/|Opera/.test(u)) br = "Opera"; else if (/Firefox\//.test(u)) br = "Firefox";
    else if (/Chrome\//.test(u)) br = "Chrome"; else if (/Safari\//.test(u)) br = "Safari";
    if (/Android/.test(u)) os = "Android"; else if (/iPhone|iPad|iPod/.test(u)) os = "iOS"; else if (/Windows/.test(u)) os = "Windows";
    else if (/Mac OS X/.test(u)) os = "macOS"; else if (/Linux/.test(u)) os = "Linux";
    return br + (os ? " · " + os : "");
  }
  var PEND_MSG = "⏳ এই ডিভাইসটি অ্যাডমিনের অনুমোদনের অপেক্ষায় আছে। অনুমোদন পেলে আবার লগইন করুন।";
  // লগইনের সময় ডিভাইসের নাম পাঠানো + "অনুমোদনের অপেক্ষায়" উত্তর সামলানো (মূল কোড অপরিবর্তিত)
  var _api = window.api;
  window.api = async function (fn) {
    var args = Array.prototype.slice.call(arguments, 1);
    if (fn === "loginVerify" && args.length < 3) args[2] = deviceLabel();
    var r = await _api.apply(this, [fn].concat(args));
    if (r && r.pending && (fn === "loginStart" || fn === "loginVerify")) {
      if (r.deviceToken) { try { setDev(args[0], r.deviceToken); } catch (e) {} }
      throw new Error(PEND_MSG);
    }
    return r;
  };
  // অ্যাডমিন প্যানেল খুললে Pending ডিভাইসের সংখ্যা ট্যাবে দেখানো
  function devBadge() {
    return api("adminOverview", TOKEN).then(function (o) {
      var bt = document.getElementById("navDevices");
      if (bt) bt.textContent = "ডিভাইস" + (o.pendingDevices ? " (" + o.pendingDevices + ")" : "");
    }).catch(function () {});
  }
  var _showApp = window.showApp;
  window.showApp = function () { var r = _showApp.apply(this, arguments); devBadge(); return r; };

  var dFilter = "pending";
  async function vDevices() {
    var list = await api("adminListDevices", TOKEN, dFilter);
    var st = { pending: "অপেক্ষায়", approved: "অনুমোদিত", rejected: "বাতিল" };
    var cls = { pending: "pending", approved: "active", rejected: "blocked" };
    var h = '<p class="hint" style="margin:0 0 12px">নতুন ডিভাইস থেকে লগইন করলে (শিক্ষক/অফিস) ডিভাইসটি <b>অপেক্ষায়</b> থাকে; এখানে অনুমোদন দিলে তবেই ঢুকতে পারবে। অ্যাডমিনের ডিভাইস নিজে থেকেই অনুমোদিত। অনুমোদিত ডিভাইসে ৩০ দিন OTP লাগে না। <br>ব্যবস্থাটি চালু থাকতে সার্ভারে <b>DEVICE_APPROVAL=on</b> সেট থাকতে হবে।</p>' +
      '<div class="bar"><select class="f" id="dSt"><option value="pending">অপেক্ষায়</option><option value="approved">অনুমোদিত</option><option value="rejected">বাতিল</option><option value="">সব</option></select></div>' +
      '<div class="tw">' + (list.length ? '<table><tr><th>ইউজার</th><th>ডিভাইস</th><th>নিবন্ধন</th><th>শেষ ব্যবহার</th><th>মেয়াদ</th><th>অবস্থা</th><th>কাজ</th></tr>' +
      list.map(function (d) {
        return '<tr data-d="' + esc(d.id) + '"><td><b>' + esc(d.name) + '</b><br><span class="sub">' + esc(d.email) + '</span></td>' +
          '<td>' + esc(d.label || "অজানা") + '</td><td>' + esc(d.created) + '</td><td>' + esc(d.lastUsed || "—") + '</td><td>' + esc(d.expires) + '</td>' +
          '<td><span class="tag ' + (cls[d.status] || "") + '">' + esc(st[d.status] || d.status) + '</span></td>' +
          '<td><div class="acts">' +
          (d.status !== "approved" ? '<button class="btn ok sm" data-da="approved">অনুমোদন</button>' : "") +
          (d.status !== "rejected" ? '<button class="btn ghost sm" data-da="rejected">বাতিল</button>' : "") +
          '<button class="btn bad sm" data-da="del">মুছুন</button></div></td></tr>';
      }).join("") + '</table>' : '<div class="empty">কোনো ডিভাইস নেই</div>') + '</div>';
    var main = document.getElementById("main"); main.innerHTML = h;
    var sel = document.getElementById("dSt"); sel.value = dFilter;
    sel.onchange = function () { dFilter = sel.value; go("devices"); };
    main.querySelectorAll("[data-da]").forEach(function (bt) {
      bt.onclick = function () {
        var id = bt.closest("tr").dataset.d, a = bt.dataset.da;
        if (a === "del" && !confirm("এই ডিভাইসটি মুছবেন? ইউজারকে আবার OTP দিয়ে নতুন করে নিবন্ধন করতে হবে।")) return;
        run(bt, async function () {
          if (a === "del") await api("adminDeleteDevice", TOKEN, id);
          else await api("adminSetDeviceStatus", TOKEN, id, a);
          toast("✅ সম্পন্ন হয়েছে"); devBadge(); go("devices");
        });
      };
    });
  }

  // ---- CSV সহায়ক ----
  function bnToEn(s) { return String(s || "").replace(/[০-৯]/g, function (d) { return "০১২৩৪৫৬৭৮৯".indexOf(d); }); }
  function parseCsv(text) {
    text = String(text || "").replace(/^﻿/, "");
    var rows = [], row = [], f = "", q = false;
    function endRow() { row.push(f); f = ""; if (row.some(function (x) { return String(x).trim() !== ""; })) rows.push(row); row = []; }
    for (var i = 0; i < text.length; i++) {
      var c = text.charAt(i);
      if (q) { if (c === '"') { if (text.charAt(i + 1) === '"') { f += '"'; i++; } else q = false; } else f += c; }
      else if (c === '"') q = true;
      else if (c === ",") { row.push(f); f = ""; }
      else if (c === "\n" || c === "\r") { if (c === "\r" && text.charAt(i + 1) === "\n") i++; endRow(); }
      else f += c;
    }
    endRow();
    return rows;
  }
  function csvDate(s) {
    s = bnToEn(s).trim(); var m, y, mo, d;
    if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) { y = +m[1]; mo = +m[2]; d = +m[3]; }
    else if ((m = s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/))) { d = +m[1]; mo = +m[2]; y = +m[3]; }
    else return "";
    var t = new Date(Date.UTC(y, mo - 1, d));
    if (t.getUTCFullYear() !== y || t.getUTCMonth() !== mo - 1 || t.getUTCDate() !== d) return "";
    return t.toISOString().slice(0, 10);
  }
  function csvToEvents(rows) {
    var map = { start: 0, end: 1, name: 2, cat: 3, status: 5 }, first = 0;
    if (rows.length && /start|শুরু|date|তারিখ/i.test(String(rows[0][0]))) {
      first = 1; var m2 = {};
      rows[0].forEach(function (h, i) {
        h = String(h).trim().toLowerCase();
        if (m2.start === undefined && /start|শুরু/.test(h)) m2.start = i;
        else if (m2.end === undefined && /(^|\s)end|শেষ/.test(h)) m2.end = i;
        else if (m2.cat === undefined && /categ|ধরন/.test(h)) m2.cat = i;
        else if (m2.status === undefined && /status|অবস্থা/.test(h)) m2.status = i;
        else if (m2.name === undefined && /name|নাম|event|ছুটি/.test(h)) m2.name = i;
      });
      if (m2.start !== undefined && m2.name !== undefined) map = { start: m2.start, end: m2.end, name: m2.name, cat: m2.cat, status: m2.status };
    }
    var cell = function (r, i) { return i === undefined ? "" : String(r[i] === undefined ? "" : r[i]).trim(); };
    var out = [];
    for (var k = first; k < rows.length; k++) {
      var r = rows[k], e = { line: k + 1, start: csvDate(cell(r, map.start)), name: cell(r, map.name), category: cell(r, map.cat), err: "" };
      var rawEnd = cell(r, map.end);
      e.end = rawEnd ? csvDate(rawEnd) : e.start;
      e.status = /inactive|বন্ধ/i.test(cell(r, map.status)) ? "Inactive" : "Active";
      if (!e.start) e.err = "শুরুর তারিখ সঠিক নয়";
      else if (!e.end) e.err = "শেষ তারিখ সঠিক নয়";
      else if (e.end < e.start) e.err = "শেষ তারিখ শুরুর আগে";
      else if (!e.name) e.err = "নাম নেই";
      out.push(e);
    }
    return out;
  }
  function csvQuote(v) { v = String(v == null ? "" : v); return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function ddmmyyyy(d) { return String(d).slice(8, 10) + "-" + String(d).slice(5, 7) + "-" + String(d).slice(0, 4); }
  function downloadCsv(name, text) {
    var blob = new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  // ================= ছুটির ইভেন্ট (হাজিরা + নোটিশ + গুগল ক্যালেন্ডার) =================
  function syncMsg(r) {
    var x = (r && r.sync) || r || {}, n = x.notices || {};
    return "✅ সম্পন্ন — হাজিরায় " + (x.days || 0) + " দিন, নোটিশ " + (n.generated || 0) + "টি হালনাগাদ";
  }
  async function vEvents() {
    var list = await api("adminListHolidayEvents", TOKEN);
    var feed = String(API_URL).replace(/\/attendance\/?$/, "/holiday-calendar");
    var h = '<p class="hint" style="margin:0 0 12px">এখানে একবার ছুটি দিলে তিন জায়গায় যায়: <b>হাজিরা</b> (সাপ্তাহিক ছুটি বাদে প্রতিটি দিন), <b>হোম পেজের নোটিশ</b> (ছুটির ২ কার্যদিবস আগে সকাল ৬টায়) এবং <b>গুগল ক্যালেন্ডার</b> (নিচের লিংক দিয়ে)। হাতে "ছুটির দিন" ট্যাবে বসানো ছুটি অপরিবর্তিত থাকে।</p>' +
      '<div class="bar" style="flex-wrap:wrap"><input class="f" type="date" id="eStart" title="শুরু"><input class="f" type="date" id="eEnd" title="শেষ (এক দিন হলে ফাঁকা)">' +
      '<input class="f" id="eName" placeholder="ছুটির নাম (যেমন: শুভ দোলযাত্রা)" style="min-width:220px"><input class="f" id="eCat" list="eCats" placeholder="ধরন (ঐচ্ছিক)">' +
      '<datalist id="eCats"><option>ধর্মীয় ছুটি</option><option>জাতীয় দিবস</option><option>উৎসব</option><option>অবকাশ ও ধর্মীয় ছুটি</option></datalist>' +
      '<button class="btn" id="eAdd">+ যোগ করুন</button><button class="btn ghost" id="eSync">সব সিঙ্ক করুন</button></div>' +
      '<div class="tw">' + (list.length ? '<table><tr><th>তারিখ</th><th>ছুটি</th><th>ধরন</th><th>অবস্থা</th><th>কাজ</th></tr>' +
      list.map(function (e) {
        var d = e.start === e.end ? e.start : e.start + " → " + e.end;
        return '<tr data-id="' + esc(e.id) + '"><td style="white-space:nowrap">' + esc(d) + '</td><td style="min-width:240px">' + esc(e.name) + '</td><td>' + esc(e.category) + '</td>' +
          '<td><span class="tag ' + (e.status === "Active" ? "active" : "inactive") + '">' + (e.status === "Active" ? "চালু" : "বন্ধ") + '</span></td>' +
          '<td><div class="acts"><button class="btn ghost sm" data-ea="toggle">' + (e.status === "Active" ? "বন্ধ করুন" : "চালু করুন") + '</button><button class="btn bad sm" data-ea="del">মুছুন</button></div></td></tr>';
      }).join("") + '</table>' : '<div class="empty">কোনো ছুটির ইভেন্ট নেই</div>') + '</div>' +
      '<details class="hint" id="eImp" style="margin-top:14px"><summary style="cursor:pointer;font-weight:700">📥 CSV থেকে একসাথে অনেক ছুটি যোগ (বাল্ক ইমপোর্ট)</summary>' +
      '<p style="margin:8px 0">কলামের ক্রম: <b>Start Date, End Date, Event Name, Category, Description, Status</b>। তারিখ <b>দিন-মাস-বছর</b> (17-01-2026) বা 2026-01-17 ধরনে; এক দিনের ছুটিতে End Date ফাঁকা রাখা যায়। আগে থেকে থাকা একই ছুটি (তারিখ ও নাম এক) শুধু হালনাগাদ হয়, দুইবার যোগ হয় না।</p>' +
      '<div class="bar" style="flex-wrap:wrap"><input type="file" id="eFile" accept=".csv,text/csv,text/plain"><button class="btn ghost sm" id="eSample">নমুনা CSV</button><button class="btn ghost sm" id="eExport">বর্তমান তালিকা CSV</button></div>' +
      '<textarea class="f" id="eText" rows="4" style="width:100%;max-width:760px;margin-top:8px" placeholder="অথবা CSV এখানে পেস্ট করুন"></textarea>' +
      '<div class="bar"><button class="btn ghost" id="ePrev">প্রিভিউ দেখুন</button></div><div id="ePreview"></div></details>' +
      '<div class="hint" style="margin-top:14px"><b>গুগল ক্যালেন্ডারে যোগ করার লিংক:</b><br><input class="f" id="eFeed" readonly style="width:100%;max-width:560px" value="' + esc(feed) + '"> <button class="btn ghost sm" id="eCopy">কপি</button><br>' +
      'গুগল ক্যালেন্ডার (কম্পিউটারে) → বাঁ পাশে "অন্যান্য ক্যালেন্ডার"-এর পাশে + → <b>URL থেকে</b> → লিংকটি বসিয়ে যোগ করুন। এরপর ছুটি বদলালে গুগল নিজেই হালনাগাদ করে নেয় (সাধারণত কয়েক ঘণ্টা থেকে এক দিনের মধ্যে)।</div>';
    var main = document.getElementById("main"); main.innerHTML = h;

    document.getElementById("eCopy").onclick = function () {
      var i = document.getElementById("eFeed"); i.select();
      try { navigator.clipboard.writeText(i.value); toast("✅ লিংক কপি হয়েছে"); } catch (e) { document.execCommand("copy"); toast("✅ কপি হয়েছে"); }
    };
    var impRows = [];
    function showPreview() {
      impRows = csvToEvents(parseCsv(document.getElementById("eText").value));
      var box = document.getElementById("ePreview");
      if (!impRows.length) { box.innerHTML = '<div class="empty">কোনো সারি পাওয়া যায়নি।</div>'; return; }
      var have = {}; list.forEach(function (x) { have[x.start + "|" + x.end + "|" + x.name] = 1; });
      var ok = 0, bad = 0, upd = 0, seen = {};
      var tr = impRows.map(function (e) {
        var k = e.start + "|" + e.end + "|" + e.name, tag;
        if (e.err) { bad++; tag = '<span class="tag blocked">' + esc(e.err) + '</span>'; }
        else if (seen[k]) { e.err = "একই সারি আবার"; bad++; tag = '<span class="tag blocked">দ্বিতীয়বার</span>'; }
        else { seen[k] = 1; ok++; if (have[k]) { upd++; tag = '<span class="tag pending">আছে (হালনাগাদ)</span>'; } else tag = '<span class="tag active">নতুন</span>'; }
        return '<tr><td>' + e.line + '</td><td style="white-space:nowrap">' + esc(e.start || "?") + (e.end && e.end !== e.start ? " → " + esc(e.end) : "") + '</td><td style="min-width:220px">' + esc(e.name) + '</td><td>' + esc(e.category) + '</td><td>' + tag + '</td></tr>';
      }).join("");
      box.innerHTML = '<p style="margin:10px 0"><b>' + ok + '</b>টি ইমপোর্ট হবে (নতুন ' + (ok - upd) + ', হালনাগাদ ' + upd + ')' + (bad ? ' · <b style="color:var(--brick)">' + bad + 'টি বাদ যাবে</b>' : '') + '</p>' +
        '<div class="tw"><table><tr><th>সারি</th><th>তারিখ</th><th>ছুটি</th><th>ধরন</th><th>ফলাফল</th></tr>' + tr + '</table></div>' +
        '<div class="bar" style="margin-top:10px"><button class="btn ok" id="eGo"' + (ok ? "" : " disabled") + '>' + ok + 'টি ইমপোর্ট করুন</button></div>';
      var go2 = document.getElementById("eGo");
      if (go2) go2.onclick = function () {
        var btn = this;
        run(btn, async function () {
          var good = impRows.filter(function (e) { return !e.err; }).map(function (e) { return { start: e.start, end: e.end, name: e.name, category: e.category, status: e.status }; });
          var r = await api("adminImportHolidayEvents", TOKEN, good);
          toast("✅ নতুন " + r.added + ", হালনাগাদ " + r.updated + " — " + syncMsg(r).replace("✅ সম্পন্ন — ", ""));
          go("events");
        });
      };
    }
    document.getElementById("eFile").onchange = function () {
      var f = this.files && this.files[0]; if (!f) return;
      var rd = new FileReader();
      rd.onload = function () { document.getElementById("eText").value = String(rd.result || ""); showPreview(); };
      rd.onerror = function () { toast("ফাইল পড়া যায়নি।", true); };
      rd.readAsText(f, "UTF-8");
    };
    document.getElementById("ePrev").onclick = showPreview;
    document.getElementById("eSample").onclick = function () {
      downloadCsv("holidays-sample.csv", "Start Date,End Date,Event Name,Category,Description,Status\r\n17-01-2026,17-01-2026,শব-ই-মিরাজ,ধর্মীয় ছুটি,,Active\r\n18-10-2026,22-10-2026,দুর্গাপূজা (বিজয়া দশমী ২১ অক্টোবর),ধর্মীয় ছুটি,,Active\r\n");
    };
    document.getElementById("eExport").onclick = function () {
      var lines = ["Start Date,End Date,Event Name,Category,Description,Status"];
      list.slice().sort(function (a, b) { return a.start < b.start ? -1 : 1; }).forEach(function (x) {
        lines.push([ddmmyyyy(x.start), ddmmyyyy(x.end), x.name, x.category, "", x.status].map(csvQuote).join(","));
      });
      downloadCsv("holidays.csv", lines.join("\r\n") + "\r\n");
    };
    document.getElementById("eAdd").onclick = function () {
      var btn = this;
      run(btn, async function () {
        var st = document.getElementById("eStart").value;
        if (!st) throw new Error("শুরুর তারিখ বাছাই করুন।");
        var r = await api("adminSaveHolidayEvent", TOKEN, {
          start: st, end: document.getElementById("eEnd").value || st,
          name: document.getElementById("eName").value, category: document.getElementById("eCat").value
        });
        toast(syncMsg(r)); go("events");
      });
    };
    document.getElementById("eSync").onclick = function () {
      var btn = this;
      run(btn, async function () { toast(syncMsg(await api("adminSyncHolidays", TOKEN))); });
    };
    main.querySelectorAll("[data-ea]").forEach(function (bt) {
      bt.onclick = function () {
        var id = +bt.closest("tr").dataset.id, a = bt.dataset.ea;
        var ev = list.filter(function (x) { return x.id === id; })[0];
        if (a === "del" && !confirm('"' + ev.name.substring(0, 40) + '" মুছবেন? হাজিরা ও নোটিশ থেকেও সরে যাবে।')) return;
        run(bt, async function () {
          var r = a === "del" ? await api("adminDeleteHolidayEvent", TOKEN, id)
            : await api("adminSaveHolidayEvent", TOKEN, { id: id, start: ev.start, end: ev.end, name: ev.name, category: ev.category, status: ev.status === "Active" ? "Inactive" : "Active" });
          toast(syncMsg(r)); go("events");
        });
      };
    });
  }

  // ================= হোম পেজ লিংক (হোম পেজের সব লিংক) =================
  // [ "জায়গা|লিংকের লেখা", মূল URL ] — হোম পেজের মূল কোড থেকে নেওয়া
  var HOME_DEFAULTS = [["মেনু|হোম পেজ","index.html"],["মেনু|বিদ্যালয় সম্পর্কে","#"],["মেনু|ইতিহাস","#"],["মেনু|শিক্ষক তালিকা","https://deb109487.dhakaeducationboard.gov.bd/index.php/content/manpower"],["মেনু|নাগরিক সনদ","https://dshe.gov.bd/pages/office-citizen-charters/691996df933eb65569ddc45c"],["মেনু|প্রতিষ্ঠার নথি","#"],["মেনু|পরিচালনা কমিটি","#"],["মেনু|তথ্য অধিকার আইনে দায়িত্বপ্রাপ্ত কর্মকর্তা","#"],["মেনু|ফরম","#"],["মেনু|ছাত্র ভর্তি ফরম","#"],["মেনু|নাম ও বয়স সংশোধন ফরম","#"],["মেনু|টিসি (স্থানান্তর সনদ) ফরম","#"],["মেনু|প্রত্যয়নপত্র আবেদন ফরম","#"],["মেনু|ফলাফল আর্কাইভ","#"],["মেনু|রেজাল্ট দেখুন","https://sites.google.com/view/reult/resul_helper"],["মেনু|PDF ডাউনলোড","export/pdf.html"],["মেনু|Excel রপ্তানি","export/excel.html"],["মেনু|রেজাল্ট ইম্পোর্ট","import.html"],["মেনু|ছাত্র নিবন্ধন","https://edu-kashianigcpilothighschool.vercel.app/e-SIF"],["মেনু|শিক্ষক কর্ণার","https://emis.gov.bd/EMIS/portalone"],["মেনু|যোগাযোগ","contact.html"],["মেনু|লগইন","https://signin-lime-six.vercel.app/"],["সাইডবার|On-line Application","https://edu-kashianigcpilothighschool.vercel.app/e-SIF"],["সাইডবার|ই-সিএল এপ্লিকেশন","https://edu-kashianigcpilothighschool.vercel.app/casual_leave"],["সাইডবার|ই-টিসি","https://erp.dhakaeducationboard.gov.bd/index.php/tc"],["সাইডবার|ই-সিআইএফ","https://kashianigcpilothighschool-e-attenda.vercel.app/"],["সাইডবার|ই-এসআইএফ","https://edu-kashianigcpilothighschool.vercel.app/e-SIF"],["সাইডবার|ই-এফএফ","https://erp.dhakaeducationboard.gov.bd/"],["সাইডবার|e-সার্টিফিকেট","http://efile.dhakaeducationboard.gov.bd/index.php/document"],["সাইডবার|eCV","https://www.canva.com/resumes/templates/"],["সাইডবার|GIS তালিকা","https://banbeis.gov.bd/"],["সাইডবার|কলেজ/স্কুল অনুসন্ধান","https://dhakaeducationboard.gov.bd/"],["সাইডবার|বোর্ড অনুসন্ধান","https://dhakaeducationboard.gov.bd/"],["সাইডবার|EIIN সার্ভার","https://banbeis.gov.bd/"],["সাইডবার|Result Search","https://edu-kashianigcpilothighschool.vercel.app/academic-transcript-v2"],["সাইডবার|Board Result Search","https://www.educationboardresults.gov.bd/"],["সাইডবার|সেন্টার তথ্য","https://dhakaeducationboard.gov.bd/index.php/site/center_info"],["সাইডবার|যোগাযোগ করুন","contact.html"],["সাইডবার|সাহায্য ও গাইড","help.html"],["সাইডবার|সিস্টেম সেটিংস","settings.html"],["সাইডবার|রেজাল্ট ইম্পোর্ট","import.html"],["সাইডবার|শিক্ষা মন্ত্রণালয়","https://moedu.gov.bd/"],["সাইডবার|অধিদপ্তর","https://dshe.gov.bd/"],["সাইডবার|শিক্ষা বোর্ড","https://dhakaeducationboard.gov.bd/"],["সাইডবার|EMIS","https://emis.gov.bd/emis"],["সাইডবার|BANBEIS","https://banbeis.gov.bd/"],["সাইডবার|Admission Result","https://gsa.teletalk.com.bd/"],["সাইডবার|সরকারি তথ্য ও সেবা","tel:333"],["সাইডবার|জরুরি সেবা","tel:999"],["সাইডবার|নারী ও শিশু নির্যাতন প্রতিরোধ","tel:109"],["মূল সেকশন|একাডেমিক কর্ণার","https://ssc-phi-seven.vercel.app/academic_corner"],["মূল সেকশন|জুনিয়র বৃত্তি","https://ssc-phi-seven.vercel.app/junior_scholarship"],["মূল সেকশন|এসএসসি কর্নার","https://ssc-phi-seven.vercel.app/"],["মূল সেকশন|প্রশাসনিক আদেশ","#"],["মূল সেকশন|বিদ্যালয় সংক্রান্ত আদেশ","#"],["মূল সেকশন|নিয়োগ সংক্রান্ত আদেশ","#"],["মূল সেকশন|সেবা প্রদান প্রতিশ্রুতি","#"],["মূল সেকশন|জাতীয় শুদ্ধাচার কৌশল","#"],["মূল সেকশন|অভিযোগ প্রতিকার","#"],["মূল সেকশন|বার্ষিক কর্মসম্পাদন চুক্তি","#"],["মূল সেকশন|তথ্য অধিকার","#"],["মূল সেকশন|উদ্ভাবনী কার্যক্রম","#"],["মূল সেকশন|নাগরিক সনদ","https://dshe.gov.bd/pages/office-citizen-charters/691996df933eb65569ddc45c"],["মূল সেকশন|বাজেট ও চলমান পরিকল্পনা","budget-plan.html"],["মূল সেকশন|প্রতিষ্ঠার নথি","#"],["ফুটার|শিক্ষা মন্ত্রণালয়","https://moedu.gov.bd/"],["ফুটার|মাধ্যমিক ও উচ্চশিক্ষা অধিদপ্তর","https://dshe.gov.bd/"],["ফুটার|ঢাকা শিক্ষা বোর্ড","https://dhakaeducationboard.gov.bd/"],["ফুটার|ছাত্র নিবন্ধন","https://sites.google.com/view/citizen-kgcphs/form/"],["ফুটার|শিক্ষক কর্ণার","https://emis.gov.bd/EMIS/portalone"],["ফুটার|ট্রান্সক্রিপ্ট","Transcript.html"],["ফুটার|সার্টিফিকেট","certificate.html"],["ফুটার|বিশ্লেষণ","analytics.html"],["ফুটার|Facebook","#"],["ফুটার|YouTube","#"],["ফুটার|অনলাইন ক্লাস","#"],["ফুটার|ঘোষণা","#"]];
  var hCur = {}, hQuery = "";
  async function vHomeLinks() {
    var l = [];
    try { l = await api("getHomeLinks"); } catch (e) { throw new Error("সার্ভারে getHomeLinks নেই বা ত্রুটি: " + e.message); }
    hCur = {}; (Array.isArray(l) ? l : []).forEach(function (m) { hCur[m.name] = m.url; });
    HOME_DEFAULTS.forEach(function (d) { if (hCur[d[0]] === undefined) hCur[d[0]] = d[1]; });
    hQuery = ""; hdraw();
  }
  function hdraw() {
    var changed = HOME_DEFAULTS.filter(function (d) { return (hCur[d[0]] || "") !== d[1]; }).length;
    var h = '<p class="hint" style="margin:0 0 12px">হোম পেজের <b>সব ' + HOME_DEFAULTS.length + 'টি লিংক</b> এখানে আছে (মেনু, সাইডবার, মূল সেকশন, ফুটার)। যেটির URL বদলাতে চান তার ঘরে নতুন URL লিখে সংরক্ষণ করুন। ফাঁকা রাখলে বা "মূল" চাপলে আগের লিংকই থাকবে। বাইরের সাইট <b>https://</b> দিয়ে, নিজের পেজ <b>contact.html</b> ধরনে লিখুন। এখন বদলানো: <b>' + changed + '</b>টি।</p>' +
      '<div class="bar"><input class="f" id="hSearch" placeholder="লিংক খুঁজুন (নাম বা URL)" value="' + esc(hQuery) + '"></div><div class="tw"><table><tr><th>লিংক</th><th>বর্তমান / নতুন URL</th><th></th></tr>';
    var last = "", q = hQuery.toLowerCase();
    HOME_DEFAULTS.forEach(function (d, i) {
      var parts = d[0].split("|"), area = parts[0], name = parts.slice(1).join("|"), cur = hCur[d[0]] || "";
      if (q && (name + " " + cur + " " + d[1]).toLowerCase().indexOf(q) < 0) return;
      if (area !== last) { h += '<tr><td colspan="3" style="background:#F7F1DF;font-weight:700;color:var(--ink-soft)">' + esc(area) + '</td></tr>'; last = area; }
      var ch = cur !== d[1];
      h += '<tr data-i="' + i + '"><td style="min-width:170px"><b>' + esc(name) + '</b>' + (ch ? ' <span class="tag pending">বদলানো</span>' : '') + '</td>' +
        '<td><input class="f" data-hk="' + i + '" style="min-width:300px" value="' + esc(cur) + '">' +
        (ch ? '<div class="hint">মূল: ' + esc(d[1]) + '</div>' : '') + '</td>' +
        '<td>' + (ch ? '<button class="btn ghost sm" data-hreset="' + i + '">মূল</button>' : '') + '</td></tr>';
    });
    h += '</table></div><div class="bar" style="margin-top:14px"><button class="btn ok" id="hSaveAll">সংরক্ষণ করুন</button></div>';
    var main = document.getElementById("main"); main.innerHTML = h;
    var sb = document.getElementById("hSearch");
    sb.addEventListener("input", function () { hQuery = sb.value; var pos = sb.selectionStart; hdraw(); var n = document.getElementById("hSearch"); n.focus(); n.setSelectionRange(pos, pos); });
    main.querySelectorAll("[data-hk]").forEach(function (el) {
      el.addEventListener("input", function () { hCur[HOME_DEFAULTS[+el.dataset.hk][0]] = el.value.trim(); });
    });
    main.querySelectorAll("[data-hreset]").forEach(function (bt) {
      bt.onclick = function () { var d = HOME_DEFAULTS[+bt.dataset.hreset]; hCur[d[0]] = d[1]; hdraw(); };
    });
    document.getElementById("hSaveAll").onclick = function () {
      var btn = this;
      run(btn, async function () {
        // শুধু বদলানো লিংক সংরক্ষিত হয়; ফাঁকা/মূলের সমান হলে বাদ (মূল লিংকই থাকে)
        var list = [];
        HOME_DEFAULTS.forEach(function (d) { var u = (hCur[d[0]] || "").trim(); if (u && u !== d[1]) list.push({ name: d[0], url: u }); });
        await api("adminSaveHomeLinks", TOKEN, list);
        HOME_DEFAULTS.forEach(function (d) { if (!(hCur[d[0]] || "").trim()) hCur[d[0]] = d[1]; });
        toast("✅ সংরক্ষিত হয়েছে (" + list.length + "টি বদলানো লিংক)");
        hdraw();
      });
    };
  }
})();
