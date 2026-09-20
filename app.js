/* ============================================================
   YOUR LIFE, IN RECEIPTS — app.js
   Reads the embedded #lifeData JSON blob and wires up:
   - hero type-on reveal
   - Chapter 1: Spotify month scrubber + line chart
   - Chapter 2: household bar chart + category filter + notes
   - Chapter 3: transaction trail bar chart + city grid + flagged list
   - Life Arc: overlaid normalized timeline across all three sources
   - Explorer: client-side search/filter across 5,294 combined receipts

   Performance notes:
   - Cheap text (stats, lists, search table) renders immediately.
   - Chart.js canvases are built one-per-idle-callback afterwards, so no
     single long task blocks the main thread.
   - Every section is isolated in try/catch: one failure can't take the
     rest of the page down.
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
  const $ = (id) => document.getElementById(id);

  const inkColors = { sp: "#40507a", hh: "#a3701f", it: "#2c6b5c" };

  // Chart.js is loaded (deferred) from a CDN. If it fails to load, `Chart`
  // is undefined; every section degrades gracefully (stats, lists and
  // search still work, only the canvas charts are skipped).
  const hasChart = typeof Chart !== "undefined";
  if (hasChart) {
    Chart.defaults.font.family = "'Space Mono', monospace";
    Chart.defaults.font.size = 11;
    Chart.defaults.color = "#4a453c";
    Chart.defaults.animation = false; // no animation work on load
  } else {
    console.warn("Chart.js did not load — charts are skipped; stats and search still run.");
  }

  function safe(name, fn) {
    try {
      fn();
    } catch (err) {
      console.error(`"${name}" section failed:`, err);
    }
  }

  function noopChart() {
    return { update() {}, setActiveElements() {}, data: { datasets: [] } };
  }
  function makeChart(ctx, config) {
    if (!hasChart || !ctx) return noopChart();
    return new Chart(ctx, config);
  }

  // run a function in an idle slot (own task), with a timeout safety net
  const idle = (fn) =>
    "requestIdleCallback" in window ? window.requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 30);

  /* ---------------------------------------------------------
     HERO — typewriter line, respects reduced motion
     (headline itself is visible immediately for fast LCP)
  --------------------------------------------------------- */
  safe("hero", function hero() {
    const heroEl = $("hero");
    const printEl = $("heroPrint");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const line = "printing 11 years of digital exhaust...";
    heroEl.classList.add("revealed");
    if (reduced) {
      printEl.textContent = line;
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
      }
    }
    setTimeout(type, 300);
  });

  /* ---------------------------------------------------------
     Scroll reveal for panels/sections (transform-only entrance)
  --------------------------------------------------------- */
  safe("scrollReveal", function scrollReveal() {
    const els = document.querySelectorAll(".panel, .stat-row, .source-grid");
    if (!("IntersectionObserver" in window)) return;
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
  });

  /* ===========================================================
     CHAPTER 1 — SPOTIFY
  =========================================================== */
  let spChart = noopChart();
  let spIndex = 0;

  safe("chapter1", function chapter1() {
    $("spStatHours").textContent = fmtNum(stats.spTotalHours);
    $("spStatPlays").textContent = fmtNum(stats.spTotalPlays);
    $("spStatArtist").textContent = stats.spTopArtist;
    const peakNight = spMonths.reduce((a, b) => (b.late_night_pct > a.late_night_pct ? b : a));
    $("spStatNight").textContent = monthLabel(peakNight.month);

    const scrub = $("spScrub");
    const scrubMonth = $("spScrubMonth");
    const scrubStat = $("spScrubStat");
    const slip = $("spSlip");
    scrub.max = spMonths.length - 1;

    function renderSlip(idx) {
      spIndex = idx;
      const m = spMonths[idx];
      scrubMonth.textContent = monthLabel(m.month);
      scrubStat.textContent = `${m.plays} plays · ${m.hours}h`;
      scrub.setAttribute("aria-valuetext", `${monthLabel(m.month)}, ${m.plays} plays`);
      slip.innerHTML = `
        <div class="row"><span>top artist</span><span>${escapeHtml(m.top_artist || "—")}</span></div>
        <div class="row"><span>top track</span><span>${escapeHtml(m.top_track || "—")}</span></div>
        <div class="row"><span>unique artists</span><span>${m.unique_artists}</span></div>
        <div class="row"><span>late-night plays</span><span>${m.late_night_pct}%</span></div>
        <div class="row"><span>skip rate</span><span>${m.skip_rate}%</span></div>
      `;
      spChart.setActiveElements([{ datasetIndex: 0, index: idx }]);
      spChart.update();
    }
    scrub.addEventListener("input", () => renderSlip(+scrub.value));
    renderSlip(0);
  });

  function chapter1Chart() {
    spChart = makeChart($("spChart"), {
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
    spChart.setActiveElements([{ datasetIndex: 0, index: spIndex }]);
    spChart.update();
  }

  /* ===========================================================
     CHAPTER 2 — HOUSEHOLD LEDGER
  =========================================================== */
  let hhChart = noopChart();
  let hhCategory = null;

  function applyHhFilter() {
    if (hhChart.data.datasets.length < 2) return; // chart not built (yet)
    const idxs = new Set(hhMonths.map((m, i) => (!hhCategory || m.top_category === hhCategory ? i : -1)).filter((i) => i >= 0));
    hhChart.data.datasets[0].data = hhMonths.map((m, i) => (idxs.has(i) ? m.expense : null));
    hhChart.data.datasets[1].data = hhMonths.map((m, i) => (idxs.has(i) ? m.income : null));
    hhChart.update();
  }

  safe("chapter2", function chapter2() {
    const totalExpense = hhMonths.reduce((s, m) => s + m.expense, 0);
    const totalIncome = hhMonths.reduce((s, m) => s + m.income, 0);
    const catCount = {};
    hhMonths.forEach((m) => {
      if (m.top_category) catCount[m.top_category] = (catCount[m.top_category] || 0) + 1;
    });
    const topCat = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0];

    $("hhStatExpense").textContent = fmtINR(totalExpense);
    $("hhStatIncome").textContent = fmtINR(totalIncome);
    $("hhStatTop").textContent = topCat ? topCat[0] : "—";
    $("hhStatTxns").textContent = fmtNum(hhMonths.reduce((s, m) => s + m.txns, 0));

    // category pills
    const cats = Array.from(new Set(hhMonths.map((m) => m.top_category).filter(Boolean))).sort();
    const pillWrap = $("hhPills");
    pillWrap.setAttribute("role", "group");
    pillWrap.setAttribute("aria-label", "Filter ledger by category");

    function mkPill(text, active) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "pill" + (active ? " active" : "");
      b.setAttribute("aria-pressed", active ? "true" : "false");
      b.textContent = text;
      return b;
    }
    function setFilter(cat, activeBtn) {
      Array.from(pillWrap.children).forEach((c) => {
        c.classList.remove("active");
        c.setAttribute("aria-pressed", "false");
      });
      activeBtn.classList.add("active");
      activeBtn.setAttribute("aria-pressed", "true");
      hhCategory = cat;
      applyHhFilter();
    }

    const allPill = mkPill("all months", true);
    pillWrap.appendChild(allPill);
    allPill.addEventListener("click", () => setFilter(null, allPill));
    cats.forEach((c) => {
      const p = mkPill(c, false);
      pillWrap.appendChild(p);
      p.addEventListener("click", () => setFilter(c, p));
    });

    // rotating notes
    const notesPool = [];
    hhMonths.forEach((m) => {
      (m.sample_notes || []).forEach((n) => notesPool.push({ note: n, cat: m.top_category, month: m.month }));
    });
    shuffle(notesPool);
    const list = $("hhNotes");
    notesPool.slice(0, 8).forEach((n) => {
      const li = document.createElement("li");
      li.innerHTML = `<b>${monthLabel(n.month)}</b> — ${escapeHtml(n.note)}`;
      list.appendChild(li);
    });
  });

  function chapter2Chart() {
    hhChart = makeChart($("hhChart"), {
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
    if (hhCategory) applyHhFilter(); // user clicked a pill before the chart existed
  }

  /* ===========================================================
     CHAPTER 3 — INDIA TRANSACT TRAIL
  =========================================================== */
  safe("chapter3", function chapter3() {
    $("itStatAmt").textContent = fmtINR(stats.itTotalAmt);
    $("itStatCities").textContent = fmtNum(stats.itUniqueCities);
    $("itStatFlag").textContent = fmtNum(stats.itTotalFlagged);
    const catCount = {};
    itMonths.forEach((m) => {
      if (m.top_category) catCount[m.top_category] = (catCount[m.top_category] || 0) + 1;
    });
    const topCat = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0];
    $("itStatCat").textContent = topCat ? topCat[0].replace(/_/g, " ") : "—";

    const grid = $("cityGrid");
    itCities.slice(0, 16).forEach((c, i) => {
      const div = document.createElement("div");
      div.className = "city-chip";
      if (i === 0) div.setAttribute("data-size", "lg");
      div.innerHTML = `<span class="name">${escapeHtml(c.city)}</span><span class="amt">${fmtINR(c.total)}</span><span class="cat">${escapeHtml((c.top_category || "").replace(/_/g, " "))}</span>`;
      grid.appendChild(div);
    });

    const flagWrap = $("flagList");
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
  });

  function chapter3Chart() {
    makeChart($("itChart"), {
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
  }

  /* ===========================================================
     LIFE ARC — normalized overlay
  =========================================================== */
  let arcChart = noopChart();
  const arcHidden = {}; // layer -> boolean

  function applyArcVisibility() {
    (arcChart.data.datasets || []).forEach((d) => {
      d.hidden = !!arcHidden[d.key];
    });
    arcChart.update();
  }

  safe("arc", function arc() {
    document.querySelectorAll(".arc-toggle").forEach((btn) => {
      btn.setAttribute("aria-pressed", "true");
      btn.addEventListener("click", () => {
        btn.classList.toggle("off");
        const off = btn.classList.contains("off");
        btn.setAttribute("aria-pressed", off ? "false" : "true");
        arcHidden[btn.dataset.layer] = off;
        applyArcVisibility();
      });
    });

    const insight = $("arcInsight");
    const direction = stats.corrSkipExpense < 0 ? "fell" : "rose";
    insight.innerHTML = `Between <b>${monthLabel(stats.sharedMonths[0])}</b> and <b>${monthLabel(stats.sharedMonths[1])}</b> — the only 39 months where the playlist and the ledger overlap — her Spotify skip-rate and her monthly spend move together with a correlation of <b>${stats.corrSkipExpense}</b>: in months she logged more expense, she ${direction} less likely to skip a track mid-play. It's a modest correlation, not a proof of anything — but it's the kind of pattern that only shows up once you stop reading the two files separately.`;
  });

  function arcChartBuild() {
    // unified month axis 2013-07 .. 2024-12
    const months = [];
    for (let y = 2013; y <= 2024; y++) {
      for (let mo = 1; mo <= 12; mo++) {
        if (y === 2013 && mo < 7) continue;
        months.push(`${y}-${String(mo).padStart(2, "0")}`);
      }
    }
    const spMap = Object.fromEntries(spMonths.map((m) => [m.month, m.hours]));
    const hhMap = Object.fromEntries(hhMonths.map((m) => [m.month, m.expense]));
    const itMap = Object.fromEntries(itMonths.map((m) => [m.month, m.total_amt]));

    const norm = (map) => {
      const max = Math.max(...Object.values(map));
      return months.map((m) => (m in map ? +(map[m] / max).toFixed(3) : null));
    };

    arcChart = makeChart($("arcChart"), {
      type: "line",
      data: {
        labels: months.map(monthLabel),
        datasets: [
          { label: "Playlist Years (hours, normalized)", data: norm(spMap), borderColor: "#8b9bd0", pointRadius: 0, borderWidth: 2, tension: 0.2, spanGaps: false, key: "sp" },
          { label: "The Ledger (expense, normalized)", data: norm(hhMap), borderColor: "#d9b15c", pointRadius: 0, borderWidth: 2, tension: 0.2, spanGaps: false, key: "hh" },
          { label: "The Wanderer (spend, normalized)", data: norm(itMap), borderColor: "#6bbfa6", pointRadius: 0, borderWidth: 2, tension: 0.2, spanGaps: false, key: "it" },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { maxTicksLimit: 10, color: "#a39b86" }, grid: { color: "#3a362b" } },
          y: { display: false, min: 0, max: 1.05 },
        },
      },
    });
    applyArcVisibility(); // honour toggles clicked before the chart existed
  }

  /* ===========================================================
     EXPLORER — search across all 5,294 receipts
  =========================================================== */
  safe("explorer", function explorer() {
    const input = $("searchInput");
    const body = $("receiptBody");
    const countEl = $("explorerCount");
    const pills = document.querySelectorAll("#typePills .pill");
    const PAGE = 200;
    let activeType = "all";
    let query = "";
    let shown = PAGE;
    let filtered = receipts;

    const typeLabel = { sound: "playlist", ledger: "ledger", trail: "trail" };

    // accessibility: announce result count, caption the table
    countEl.setAttribute("aria-live", "polite");
    const table = body.closest("table");
    if (table && !table.querySelector("caption")) {
      const cap = document.createElement("caption");
      cap.className = "sr-only";
      cap.textContent = "Combined receipts from the playlist, ledger and card trail";
      table.insertBefore(cap, table.firstChild);
    }
    pills.forEach((p) => p.setAttribute("aria-pressed", p.classList.contains("active") ? "true" : "false"));

    // "show more" button under the table
    const moreWrap = document.createElement("div");
    moreWrap.className = "more-wrap";
    const moreBtn = document.createElement("button");
    moreBtn.type = "button";
    moreBtn.className = "more-btn";
    moreBtn.addEventListener("click", () => {
      shown += PAGE;
      draw();
    });
    moreWrap.appendChild(moreBtn);
    const tableWrap = body.closest(".receipt-table-wrap");
    if (tableWrap && tableWrap.parentNode) tableWrap.parentNode.insertBefore(moreWrap, tableWrap.nextSibling);

    function applyFilter() {
      const q = query.trim().toLowerCase();
      filtered = receipts;
      if (activeType !== "all") filtered = filtered.filter((r) => r.t === activeType);
      if (q) {
        filtered = filtered.filter(
          (r) =>
            r.d.includes(q) ||
            (r.c && r.c.toLowerCase().includes(q)) ||
            (r.x && r.x.toLowerCase().includes(q)) ||
            (r.f && (q === "fraud" || q === "flagged"))
        );
      }
      shown = PAGE;
      draw();
    }

    function draw() {
      const slice = filtered.slice(0, shown);
      countEl.textContent = `showing ${fmtNum(slice.length)} of ${fmtNum(filtered.length)} matching receipts (${fmtNum(receipts.length)} total)`;
      body.innerHTML = "";
      if (slice.length === 0) {
        body.innerHTML = `<tr class="empty-row"><td colspan="5">no receipts match that search</td></tr>`;
      } else {
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
      const remaining = filtered.length - slice.length;
      moreWrap.hidden = remaining <= 0;
      if (remaining > 0) moreBtn.textContent = `show ${Math.min(PAGE, remaining)} more`;
    }

    let debounceTimer;
    input.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        query = input.value;
        applyFilter();
      }, 120);
    });

    pills.forEach((p) => {
      p.addEventListener("click", () => {
        pills.forEach((x) => {
          x.classList.remove("active");
          x.setAttribute("aria-pressed", "false");
        });
        p.classList.add("active");
        p.setAttribute("aria-pressed", "true");
        activeType = p.dataset.type;
        applyFilter();
      });
    });

    applyFilter();
  });

  /* ---------------------------------------------------------
     Build the charts one at a time, each in its own idle slot,
     so no single task is long enough to block interaction.
  --------------------------------------------------------- */
  const chartJobs = [chapter1Chart, chapter2Chart, chapter3Chart, arcChartBuild];
  (function next() {
    const job = chartJobs.shift();
    if (!job) return;
    idle(function () {
      safe(job.name, job);
      next();
    });
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
