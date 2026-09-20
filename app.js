/* ============================================================
   YOUR LIFE, IN RECEIPTS — app.js
   Reads the embedded #lifeData JSON blob and wires up:
   - hero type-on reveal
   - Chapter 1: Spotify month scrubber + line chart
   - Chapter 2: household bar chart + category filter + notes
   - Chapter 3: transaction trail bar chart + city grid + flagged list
   - Life Arc: overlaid normalized timeline across all three sources
   - Explorer: client-side search/filter across 5,294 combined receipts
   ============================================================ */

(function () {
  "use strict";

  const DATA = JSON.parse(document.getElementById("lifeData").textContent);
  const { spMonths, hhMonths, itMonths, itCities, itFlagged, receipts, stats } = DATA;

  const fmtINR = (n) => "\u20B9" + Math.round(n).toLocaleString("en-IN");
  const fmtNum = (n) => Math.round(n).toLocaleString("en-IN");
  const monthLabel = (m) => {
    const [y, mo] = m.split("-");
    return new Date(+y, +mo - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };

  const inkColors = { sp: "#40507a", hh: "#a3701f", it: "#2c6b5c" };

  Chart.defaults.font.family = "'Space Mono', monospace";
  Chart.defaults.font.size = 11;
  Chart.defaults.color = "#4a453c";

  /* ---------------------------------------------------------
     HERO — typewriter reveal, respects reduced motion
  --------------------------------------------------------- */
  (function hero() {
    const hero = document.getElementById("hero");
    const printEl = document.getElementById("heroPrint");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const line = "printing 11 years of digital exhaust...";
    if (reduced) {
      printEl.textContent = line;
      hero.classList.add("revealed");
      return;
    }
    let i = 0;
    const cursor = document.createElement("span");
    cursor.className = "cursor";
    function type() {
      if (i <= line.length) {
        printEl.textContent = line.slice(0, i);
        printEl.appendChild(cursor);
        i++;
        setTimeout(type, 28);
      } else {
        hero.classList.add("revealed");
      }
    }
    setTimeout(type, 300);
  })();

  /* ---------------------------------------------------------
     Scroll reveal for panels/sections
  --------------------------------------------------------- */
  (function scrollReveal() {
    const els = document.querySelectorAll(".panel, .stat-row, .source-grid");
    els.forEach((el) => el.classList.add("reveal"));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
  })();

  /* ===========================================================
     CHAPTER 1 — SPOTIFY
  =========================================================== */
  (function chapter1() {
    document.getElementById("spStatHours").textContent = fmtNum(stats.spTotalHours);
    document.getElementById("spStatPlays").textContent = fmtNum(stats.spTotalPlays);
    document.getElementById("spStatArtist").textContent = stats.spTopArtist;
    const peakNight = spMonths.reduce((a, b) => (b.late_night_pct > a.late_night_pct ? b : a));
    document.getElementById("spStatNight").textContent = monthLabel(peakNight.month);

    const ctx = document.getElementById("spChart");
    const chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: spMonths.map((m) => monthLabel(m.month)),
        datasets: [
          {
            label: "Late-night listening %",
            data: spMonths.map((m) => m.late_night_pct),
            borderColor: inkColors.sp,
            backgroundColor: inkColors.sp + "22",
            fill: true,
            tension: 0.25,
            pointRadius: 0,
            borderWidth: 2,
          },
          {
            label: "Skip rate %",
            data: spMonths.map((m) => m.skip_rate),
            borderColor: "#b98a2e",
            borderDash: [3, 3],
            fill: false,
            tension: 0.25,
            pointRadius: 0,
            borderWidth: 1.5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: { legend: { position: "bottom", labels: { boxWidth: 10, boxHeight: 10 } } },
        scales: {
          x: { ticks: { maxTicksLimit: 8 }, grid: { display: false } },
          y: { ticks: { callback: (v) => v + "%" }, grid: { color: "#c9bfa933" } },
        },
      },
    });

    const scrub = document.getElementById("spScrub");
    const scrubMonth = document.getElementById("spScrubMonth");
    const scrubStat = document.getElementById("spScrubStat");
    const slip = document.getElementById("spSlip");
    scrub.max = spMonths.length - 1;

    function renderSlip(idx) {
      const m = spMonths[idx];
      scrubMonth.textContent = monthLabel(m.month);
      scrubStat.textContent = `${m.plays} plays · ${m.hours}h`;
      slip.innerHTML = `
        <div class="row"><span>top artist</span><span>${escapeHtml(m.top_artist || "—")}</span></div>
        <div class="row"><span>top track</span><span>${escapeHtml(m.top_track || "—")}</span></div>
        <div class="row"><span>unique artists</span><span>${m.unique_artists}</span></div>
        <div class="row"><span>late-night plays</span><span>${m.late_night_pct}%</span></div>
        <div class="row"><span>skip rate</span><span>${m.skip_rate}%</span></div>
      `;
      chart.setActiveElements([{ datasetIndex: 0, index: idx }]);
      chart.update();
    }
    scrub.addEventListener("input", () => renderSlip(+scrub.value));
    renderSlip(0);
  })();

  /* ===========================================================
     CHAPTER 2 — HOUSEHOLD LEDGER
  =========================================================== */
  (function chapter2() {
    const totalExpense = hhMonths.reduce((s, m) => s + m.expense, 0);
    const totalIncome = hhMonths.reduce((s, m) => s + m.income, 0);
    const catCount = {};
    hhMonths.forEach((m) => {
      if (m.top_category) catCount[m.top_category] = (catCount[m.top_category] || 0) + 1;
    });
    const topCat = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0];

    document.getElementById("hhStatExpense").textContent = fmtINR(totalExpense);
    document.getElementById("hhStatIncome").textContent = fmtINR(totalIncome);
    document.getElementById("hhStatTop").textContent = topCat ? topCat[0] : "—";
    document.getElementById("hhStatTxns").textContent = fmtNum(hhMonths.reduce((s, m) => s + m.txns, 0));

    const ctx = document.getElementById("hhChart");
    const chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: hhMonths.map((m) => monthLabel(m.month)),
        datasets: [
          { label: "Expense", data: hhMonths.map((m) => m.expense), backgroundColor: inkColors.hh },
          { label: "Income", data: hhMonths.map((m) => m.income), backgroundColor: "#d9b15c" },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "bottom", labels: { boxWidth: 10, boxHeight: 10 } } },
        scales: {
          x: { ticks: { maxTicksLimit: 8 }, grid: { display: false } },
          y: { ticks: { callback: (v) => "\u20B9" + v }, grid: { color: "#c9bfa933" } },
        },
      },
    });

    // category pills
    const cats = Array.from(new Set(hhMonths.map((m) => m.top_category).filter(Boolean))).sort();
    const pillWrap = document.getElementById("hhPills");
    const allPill = mkPill("all months", true);
    pillWrap.appendChild(allPill);
    allPill.addEventListener("click", () => setFilter(null, allPill));
    cats.forEach((c) => {
      const p = mkPill(c, false);
      pillWrap.appendChild(p);
      p.addEventListener("click", () => setFilter(c, p));
    });

    function mkPill(text, active) {
      const b = document.createElement("button");
      b.className = "pill" + (active ? " active" : "");
      b.textContent = text;
      return b;
    }

    function setFilter(cat, activeBtn) {
      Array.from(pillWrap.children).forEach((c) => c.classList.remove("active"));
      activeBtn.classList.add("active");
      const idxs = hhMonths.map((m, i) => (!cat || m.top_category === cat ? i : -1)).filter((i) => i >= 0);
      chart.data.datasets[0].data = hhMonths.map((m, i) => (idxs.includes(i) ? m.expense : null));
      chart.data.datasets[1].data = hhMonths.map((m, i) => (idxs.includes(i) ? m.income : null));
      chart.update();
    }

    // rotating notes
    const notesPool = [];
    hhMonths.forEach((m) => {
      (m.sample_notes || []).forEach((n) => notesPool.push({ note: n, cat: m.top_category, month: m.month }));
    });
    shuffle(notesPool);
    const list = document.getElementById("hhNotes");
    notesPool.slice(0, 8).forEach((n) => {
      const li = document.createElement("li");
      li.innerHTML = `<b>${monthLabel(n.month)}</b> — ${escapeHtml(n.note)}`;
      list.appendChild(li);
    });
  })();

  /* ===========================================================
     CHAPTER 3 — INDIA TRANSACT TRAIL
  =========================================================== */
  (function chapter3() {
    document.getElementById("itStatAmt").textContent = fmtINR(stats.itTotalAmt);
    document.getElementById("itStatCities").textContent = fmtNum(stats.itUniqueCities);
    document.getElementById("itStatFlag").textContent = fmtNum(stats.itTotalFlagged);
    const catCount = {};
    itMonths.forEach((m) => {
      if (m.top_category) catCount[m.top_category] = (catCount[m.top_category] || 0) + 1;
    });
    const topCat = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0];
    document.getElementById("itStatCat").textContent = topCat ? topCat[0].replace(/_/g, " ") : "—";

    const ctx = document.getElementById("itChart");
    new Chart(ctx, {
      type: "bar",
      data: {
        labels: itMonths.map((m) => monthLabel(m.month)),
        datasets: [
          {
            label: "Spend",
            data: itMonths.map((m) => m.total_amt),
            backgroundColor: itMonths.map((m) => {
              const ratio = m.flagged / Math.max(1, m.txns);
              return ratio > 0.4 ? "#9c3626" : inkColors.it;
            }),
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              afterLabel: (ctxItem) => {
                const m = itMonths[ctxItem.dataIndex];
                return `${m.flagged} of ${m.txns} flagged unusual`;
              },
            },
          },
        },
        scales: {
          x: { ticks: { maxTicksLimit: 8 }, grid: { display: false } },
          y: { ticks: { callback: (v) => "\u20B9" + v }, grid: { color: "#c9bfa933" } },
        },
      },
    });

    const grid = document.getElementById("cityGrid");
    itCities.slice(0, 16).forEach((c, i) => {
      const div = document.createElement("div");
      div.className = "city-chip";
      if (i === 0) div.setAttribute("data-size", "lg");
      div.innerHTML = `<span class="name">${escapeHtml(c.city)}</span><span class="amt">${fmtINR(c.total)}</span><span class="cat">${escapeHtml((c.top_category || "").replace(/_/g, " "))}</span>`;
      grid.appendChild(div);
    });

    const flagWrap = document.getElementById("flagList");
    itFlagged.slice(0, 8).forEach((f) => {
      const div = document.createElement("div");
      div.className = "flag-item";
      const date = f.trans_date_trans_time.split(" ")[0];
      div.innerHTML = `
        <span class="stamp">FLAGGED</span>
        <span class="desc">${escapeHtml(f.merchant.replace("fraud_", ""))} <span class="city">— ${escapeHtml(f.city)}, ${date}</span></span>
        <span class="amt">${fmtINR(f.amt)}</span>
      `;
      flagWrap.appendChild(div);
    });
  })();

  /* ===========================================================
     LIFE ARC — normalized overlay
  =========================================================== */
  (function arc() {
    // build unified month axis 2013-01 .. 2024-12
    const months = [];
    for (let y = 2013; y <= 2024; y++) {
      for (let mo = 1; mo <= 12; mo++) {
        if (y === 2013 && mo < 7) continue;
        if (y === 2024 && mo > 12) continue;
        months.push(`${y}-${String(mo).padStart(2, "0")}`);
      }
    }
    const spMap = Object.fromEntries(spMonths.map((m) => [m.month, m.hours]));
    const hhMap = Object.fromEntries(hhMonths.map((m) => [m.month, m.expense]));
    const itMap = Object.fromEntries(itMonths.map((m) => [m.month, m.total_amt]));

    const norm = (map) => {
      const vals = Object.values(map);
      const max = Math.max(...vals);
      return months.map((m) => (m in map ? +(map[m] / max).toFixed(3) : null));
    };

    const spData = norm(spMap);
    const hhData = norm(hhMap);
    const itData = norm(itMap);

    const ctx = document.getElementById("arcChart");
    const chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: months.map(monthLabel),
        datasets: [
          { label: "Playlist Years (hours, normalized)", data: spData, borderColor: "#8b9bd0", pointRadius: 0, borderWidth: 2, tension: 0.2, spanGaps: false, key: "sp" },
          { label: "The Ledger (expense, normalized)", data: hhData, borderColor: "#d9b15c", pointRadius: 0, borderWidth: 2, tension: 0.2, spanGaps: false, key: "hh" },
          { label: "The Wanderer (spend, normalized)", data: itData, borderColor: "#6bbfa6", pointRadius: 0, borderWidth: 2, tension: 0.2, spanGaps: false, key: "it" },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { maxTicksLimit: 10, color: "#948c78" }, grid: { color: "#3a362b" } },
          y: { display: false, min: 0, max: 1.05 },
        },
      },
    });

    document.querySelectorAll(".arc-toggle").forEach((btn) => {
      btn.addEventListener("click", () => {
        btn.classList.toggle("off");
        const layer = btn.dataset.layer;
        const ds = chart.data.datasets.find((d) => d.key === layer);
        ds.hidden = btn.classList.contains("off");
        chart.update();
      });
    });

    const insight = document.getElementById("arcInsight");
    const direction = stats.corrSkipExpense < 0 ? "fell" : "rose";
    insight.innerHTML = `Between <b>${monthLabel(stats.sharedMonths[0])}</b> and <b>${monthLabel(stats.sharedMonths[1])}</b> — the only 39 months where the playlist and the ledger overlap — her Spotify skip-rate and her monthly spend move together with a correlation of <b>${stats.corrSkipExpense}</b>: in months she logged more expense, she ${direction} less likely to skip a track mid-play. It's a modest correlation, not a proof of anything — but it's the kind of pattern that only shows up once you stop reading the two files separately.`;
  })();

  /* ===========================================================
     EXPLORER — search across all 5,294 receipts
  =========================================================== */
  (function explorer() {
    const input = document.getElementById("searchInput");
    const body = document.getElementById("receiptBody");
    const countEl = document.getElementById("explorerCount");
    const pills = document.querySelectorAll("#typePills .pill");
    let activeType = "all";
    let query = "";

    const typeLabel = { sound: "playlist", ledger: "ledger", trail: "trail" };

    function render() {
      const q = query.trim().toLowerCase();
      let filtered = receipts;
      if (activeType !== "all") filtered = filtered.filter((r) => r.t === activeType);
      if (q) {
        filtered = filtered.filter((r) => {
          return (
            r.d.includes(q) ||
            (r.c && r.c.toLowerCase().includes(q)) ||
            (r.x && r.x.toLowerCase().includes(q)) ||
            (r.f && q === "fraud") ||
            (r.f && q === "flagged")
          );
        });
      }
      countEl.textContent = `showing ${fmtNum(filtered.length)} of ${fmtNum(receipts.length)} receipts`;

      const slice = filtered.slice(0, 400);
      body.innerHTML = "";
      if (slice.length === 0) {
        body.innerHTML = `<tr class="empty-row"><td colspan="5">no receipts match that search</td></tr>`;
        return;
      }
      const frag = document.createDocumentFragment();
      slice.forEach((r) => {
        const tr = document.createElement("tr");
        const amtStr = r.t === "sound" ? r.a + " min" : fmtINR(Math.abs(r.a));
        tr.innerHTML = `
          <td>${r.d}</td>
          <td><span class="type-tag ${r.t}">${typeLabel[r.t]}</span></td>
          <td>${escapeHtml(r.c || "")}</td>
          <td>${escapeHtml(r.x || "")}${r.f ? " ⚑" : ""}</td>
          <td>${amtStr}</td>
        `;
        frag.appendChild(tr);
      });
      body.appendChild(frag);
    }

    let debounceTimer;
    input.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        query = input.value;
        render();
      }, 120);
    });

    pills.forEach((p) => {
      p.addEventListener("click", () => {
        pills.forEach((x) => x.classList.remove("active"));
        p.classList.add("active");
        activeType = p.dataset.type;
        render();
      });
    });

    render();
  })();

  /* ---------------------------------------------------------
     utils
  --------------------------------------------------------- */
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
})();
