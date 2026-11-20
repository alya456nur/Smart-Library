const API = "http://127.0.0.1:3000";

document.addEventListener("DOMContentLoaded", () => {
  // Fade-in animation
  requestAnimationFrame(() => {
    document.getElementById("cardsRow")?.classList.add("show");
    document.getElementById("dashboardBox")?.classList.add("show");
  });

  // Welcome title (from session if possible)
  loadAdminSession();

  // Load dashboard data
  loadDashboard();

  // Refresh button
  document.getElementById("refreshDashBtn")?.addEventListener("click", loadDashboard);
});

async function loadAdminSession() {
  const pill = document.getElementById("adminSessionPill");
  const title = document.getElementById("welcomeTitle");

  try {
    const res = await fetch(`${API}/admin-session`, { credentials: "include" });
    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.loggedIn) {
      if (pill) pill.innerText = "Not logged in";
      if (title) title.innerText = "SMART Library System";
      return;
    }

    const name = data.librarian?.name || "Librarian";
    if (pill) pill.innerText = `Logged in: ${name}`;
    if (title) title.innerText = `Welcome, Librarian ${name}`;
  } catch (e) {
    if (pill) pill.innerText = "Session error";
    console.error(e);
  }
}

async function loadDashboard() {
  setLoadingState(true);

  try {
    const res = await fetch(`${API}/api/admin/dashboard`, { credentials: "include" });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data.message || "Failed to load dashboard.");
      setLoadingState(false);
      return;
    }

    const s = data.summary || {};
    animateCount("countTotal", Number(s.totalBooks || 0));
    animateCount("countBorrow", Number(s.borrowedToday || 0));
    animateCount("countDue", Number(s.overdueBooks || 0));
    animateCount("countReserve", Number(s.pendingRequests || 0));

    // tables
    renderRecentBorrowings(data.recentBorrowings || []);
    renderOverdueList(data.overdueBooks || []);

    // updated time
    const now = new Date();
    const lastUpdated = document.getElementById("lastUpdated");
    if (lastUpdated) lastUpdated.innerText = `Last updated: ${now.toLocaleString()}`;

  } catch (e) {
    console.error(e);
    alert("Server error while loading dashboard.");
  } finally {
    setLoadingState(false);
  }
}

function setLoadingState(isLoading) {
  const skIds = ["skTotal", "skBorrow", "skDue", "skReserve"];
  skIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = isLoading ? "block" : "none";
  });

  // If loading, show dashes so count-up restarts cleanly
  if (isLoading) {
    setText("countTotal", "—");
    setText("countBorrow", "—");
    setText("countDue", "—");
    setText("countReserve", "—");
  }
}

function renderRecentBorrowings(rows) {
  const tbody = document.getElementById("recentBorrowTbody");
  const badge = document.getElementById("recentBorrowCount");
  if (badge) badge.innerText = `${rows.length} shown`;

  if (!tbody) return;

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="3" class="text-muted">No active borrowings.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(r => {
    return `
      <tr>
        <td>${escapeHtml(r.USER_NAME || r.USER_ID || "-")}</td>
        <td>${escapeHtml(r.BOOK_TITLE || "-")}</td>
        <td>${escapeHtml(formatDateDisplay(r.DUE_DATE))}</td>
      </tr>
    `;
  }).join("");
}

function renderOverdueList(rows) {
  const tbody = document.getElementById("overdueTbody");
  const badge = document.getElementById("overdueListCount");
  if (badge) badge.innerText = `${rows.length} shown`;

  if (!tbody) return;

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="3" class="text-muted">No overdue books 🎉</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(r => {
    return `
      <tr class="text-danger">
        <td>${escapeHtml(r.USER_NAME || r.USER_ID || "-")}</td>
        <td>${escapeHtml(r.BOOK_TITLE || "-")}</td>
        <td>${escapeHtml(formatDateDisplay(r.DUE_DATE))}</td>
      </tr>
    `;
  }).join("");
}

/* =========================
   Animations: Count up
========================= */
function animateCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;

  const start = 0;
  const duration = 650; // ms
  const startTime = performance.now();

  function tick(now) {
    const p = Math.min(1, (now - startTime) / duration);
    const eased = easeOutCubic(p);
    const value = Math.round(start + (target - start) * eased);
    el.innerText = value.toLocaleString();

    if (p < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

/* =========================
   Helpers
========================= */
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.innerText = text;
}

function parseServerDate(d) {
  if (!d) return null;

  // "YYYY-MM-DD"
  if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}/.test(d)) {
    const [y, m, day] = d.substring(0, 10).split("-").map(Number);
    return new Date(y, m - 1, day);
  }

  const dt = new Date(d);
  return isNaN(dt.getTime()) ? null : dt;
}

function formatDateDisplay(d) {
  const dt = parseServerDate(d);
  if (!dt) return "-";
  return dt.toLocaleDateString();
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
