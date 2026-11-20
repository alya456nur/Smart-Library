const API = "http://127.0.0.1:3000";

let allBorrowsCache = [];

document.addEventListener("DOMContentLoaded", () => {
  const tbody = document.getElementById("borrowTbody");

  // table click (Edit buttons)
  tbody.addEventListener("click", async (e) => {
    const editBtn = e.target.closest(".btn-edit-borrow");
    if (!editBtn) return;

    const borrowId = editBtn.dataset.borrowId;
    if (!borrowId) return;

    await openEditBorrowModal(borrowId);
  });

  document.getElementById("applyFilterBtn").addEventListener("click", applyFiltersAndRender);
  document.getElementById("resetFilterBtn").addEventListener("click", resetFilters);
  document.getElementById("refreshBtn").addEventListener("click", () => loadBorrows());

  document.getElementById("statusFilter").addEventListener("change", applyFiltersAndRender);

  document.getElementById("saveBorrowBtn").addEventListener("click", saveBorrowStatus);

  loadBorrows();
});

async function loadBorrows() {
  const tbody = document.getElementById("borrowTbody");
  tbody.innerHTML = `<tr><td colspan="10" class="text-center">Loading borrows...</td></tr>`;
  document.getElementById("resultCount").innerText = "Loading...";

  try {
    // load everything once, filter on client
    const res = await fetch(`${API}/api/admin/borrows`, { credentials: "include" });
    const data = await res.json().catch(() => []);
    if (!res.ok) {
      tbody.innerHTML = `<tr><td colspan="10" class="text-center text-danger">${escapeHtml(data.message || "Failed to load borrows")}</td></tr>`;
      document.getElementById("resultCount").innerText = "0 result(s)";
      return;
    }

    allBorrowsCache = Array.isArray(data) ? data : [];
    applyFiltersAndRender();

  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="10" class="text-center text-danger">Server error while loading borrows.</td></tr>`;
    document.getElementById("resultCount").innerText = "0 result(s)";
  }
}

function applyFiltersAndRender() {
  const selectedStatus = (document.getElementById("statusFilter").value || "All").trim().toLowerCase();
  const dateFrom = document.getElementById("dateFrom").value;
  const dateTo = document.getElementById("dateTo").value;

  const fromTime = dateFrom ? toDateStart(dateFrom).getTime() : null;
  const toTime = dateTo ? toDateEnd(dateTo).getTime() : null;

  const filtered = allBorrowsCache.filter(b => {
    // status filter
    const rowStatus = (b.BORROW_STATUS || "").trim().toLowerCase();
    if (selectedStatus !== "all" && rowStatus !== selectedStatus) return false;

    // borrow date filter
    const borrowed = parseServerDate(b.DATE_BORROWED);
    const t = borrowed ? borrowed.getTime() : null;

    if (fromTime !== null && (t === null || t < fromTime)) return false;
    if (toTime !== null && (t === null || t > toTime)) return false;

    return true;
  });

  renderBorrowTable(filtered);
  document.getElementById("resultCount").innerText = `${filtered.length} result(s)`;
}

function resetFilters() {
  document.getElementById("statusFilter").value = "All";
  document.getElementById("dateFrom").value = "";
  document.getElementById("dateTo").value = "";
  applyFiltersAndRender();
}

function renderBorrowTable(rows) {
  const tbody = document.getElementById("borrowTbody");

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="10" class="text-center">No borrows found.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(b => {
    const borrowId = b.BORROW_ID || "-";
    const userId = b.USER_ID || "-";
    const userName = b.USER_NAME || userId;
    const bookTitle = b.BOOK_TITLE || "-";

    const borrowDate = formatDateDisplay(b.DATE_BORROWED);
    const dueDate = formatDateDisplay(b.DUE_DATE);
    const returnDate = formatDateDisplay(b.DATE_RETURN);

    const status = (b.BORROW_STATUS || "-").trim();
    const isOverdue = Number(b.IS_OVERDUE || 0) === 1;

    const fineStatus = (b.FINE_STATUS || "").trim();
    const fineAmount = b.FINE_AMOUNT != null ? formatRM(b.FINE_AMOUNT) : "-";

    const statusBadge = badgeForStatus(status);
    const overdueBadge = isOverdue
      ? `<span class="badge badge-soft-danger">Overdue</span>`
      : `<span class="badge badge-soft-success">OK</span>`;

    const fineBadge = fineStatus
      ? `<span class="badge ${fineStatus.toLowerCase() === "unpaid" ? "badge-soft-warning" : "badge-soft-info"}">
            ${escapeHtml(fineStatus)} ${fineAmount !== "-" ? `(${escapeHtml(fineAmount)})` : ""}
         </span>`
      : `<span class="text-muted">-</span>`;

    return `
      <tr class="fade-in">
        <td class="align-middle">${escapeHtml(borrowId)}</td>

        <td class="align-middle">
          <a href="userInfo.html?userId=${encodeURIComponent(userId)}" class="text-dark font-weight-bold">
            <u>${escapeHtml(userName)}</u>
          </a>
          <div class="text-muted small">${escapeHtml(userId)}</div>
        </td>

        <td class="align-middle">${escapeHtml(bookTitle)}</td>
        <td class="align-middle">${escapeHtml(borrowDate)}</td>
        <td class="align-middle">${escapeHtml(dueDate)}</td>
        <td class="align-middle">${escapeHtml(returnDate)}</td>

        <td class="align-middle">${statusBadge}</td>
        <td class="align-middle">${overdueBadge}</td>
        <td class="align-middle">${fineBadge}</td>

        <td class="align-middle text-center">
          <button class="btn btn-sm btn-info btn-edit-borrow" data-borrow-id="${escapeAttr(borrowId)}">
            <i class="fas fa-edit"></i> Edit
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

function badgeForStatus(status) {
  const s = (status || "").toLowerCase();
  if (s === "borrowed") return `<span class="badge badge-soft-info">Borrowed</span>`;
  if (s === "ready for pickup") return `<span class="badge badge-soft-success">Ready For Pickup</span>`;
  if (s === "not picked up") return `<span class="badge badge-soft-warning">Not Picked Up</span>`;
  if (s === "returned") return `<span class="badge badge-secondary">Returned</span>`;
  if (s === "lost") return `<span class="badge badge-danger">Lost</span>`;
  return `<span class="badge badge-light">${escapeHtml(status || "-")}</span>`;
}

async function openEditBorrowModal(borrowId) {
  clearEditBorrowAlerts();

  try {
    const res = await fetch(`${API}/api/admin/borrows/${encodeURIComponent(borrowId)}`, {
      credentials: "include"
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showEditBorrowError(data.message || "Failed to load borrow details.");
      $("#editBorrowModal").modal("show");
      return;
    }

    document.getElementById("editBorrowId").value = data.BORROW_ID || borrowId;
    document.getElementById("editBorrowIdText").innerText = data.BORROW_ID || borrowId;

    const userLine = `${data.USER_NAME || data.USER_ID || "-"} (${data.USER_ID || "-"})`;
    document.getElementById("editBorrowUserText").innerText = userLine;

    document.getElementById("editBorrowBookText").innerText = data.BOOK_TITLE || "-";

    document.getElementById("editBorrowStatus").value = data.BORROW_STATUS || "Borrowed";

    $("#editBorrowModal").modal("show");

  } catch (err) {
    console.error(err);
    showEditBorrowError("Server error while loading borrow details.");
    $("#editBorrowModal").modal("show");
  }
}

async function saveBorrowStatus() {
  clearEditBorrowAlerts();

  const borrowId = document.getElementById("editBorrowId").value;
  const newStatus = document.getElementById("editBorrowStatus").value;

  if (!borrowId) return showEditBorrowError("Borrow ID missing.");
  if (!newStatus) return showEditBorrowError("Please choose a status.");

  try {
    const res = await fetch(`${API}/api/admin/borrows/${encodeURIComponent(borrowId)}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: newStatus })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showEditBorrowError(data.message || "Failed to update borrow.");
      return;
    }

    showEditBorrowOk("Borrow status updated.");
    await loadBorrows();

    setTimeout(() => $("#editBorrowModal").modal("hide"), 600);

  } catch (err) {
    console.error(err);
    showEditBorrowError("Server error while updating borrow.");
  }
}

function clearEditBorrowAlerts() {
  const err = document.getElementById("editBorrowErr");
  const ok = document.getElementById("editBorrowOk");
  err.classList.add("d-none"); err.innerText = "";
  ok.classList.add("d-none"); ok.innerText = "";
}
function showEditBorrowError(msg) {
  const el = document.getElementById("editBorrowErr");
  el.classList.remove("d-none");
  el.innerText = msg;
}
function showEditBorrowOk(msg) {
  const el = document.getElementById("editBorrowOk");
  el.classList.remove("d-none");
  el.innerText = msg;
}

/* Helpers */
function formatRM(value) {
  const num = Number(value || 0);
  return `RM${num.toFixed(2)}`;
}

function parseServerDate(d) {
  if (!d) return null;
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

function toDateStart(yyyyMmDd) {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function toDateEnd(yyyyMmDd) {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999);
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(str) {
  return escapeHtml(str).replaceAll("`", "&#096;");
}
