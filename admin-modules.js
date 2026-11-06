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

  var _go = window.go;
  window.go = function (t) {
    if (t !== "modules") return _go(t);
    tab = t;
    document.querySelectorAll("#nav button").forEach(function (x) { x.classList.toggle("on", x.dataset.t === t); });
    document.getElementById("main").innerHTML = '<div class="empty">লোড হচ্ছে...</div>';
    vModules().catch(function (e) { document.getElementById("main").innerHTML = '<div class="empty">' + esc(e.message) + "</div>"; });
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
})();
