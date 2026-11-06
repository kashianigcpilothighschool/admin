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
  if (nav && !nav.querySelector('[data-t="homelinks"]')) {
    var b2 = document.createElement("button");
    b2.setAttribute("data-t", "homelinks"); b2.textContent = "হোম পেজ লিংক";
    nav.appendChild(b2);
  }

  var _go = window.go;
  window.go = function (t) {
    if (t !== "modules" && t !== "homelinks") return _go(t);
    tab = t;
    document.querySelectorAll("#nav button").forEach(function (x) { x.classList.toggle("on", x.dataset.t === t); });
    document.getElementById("main").innerHTML = '<div class="empty">লোড হচ্ছে...</div>';
    (t === "modules" ? vModules() : vHomeLinks()).catch(function (e) { document.getElementById("main").innerHTML = '<div class="empty">' + esc(e.message) + "</div>"; });
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
