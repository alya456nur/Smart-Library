/* ============================================================
   manageFine.js
============================================================ */

const API = "http://127.0.0.1:3000";

let allFinesCache = [];
let borrowCache = [];           // list of borrow rows for modal
let pendingPayFineId = null;    // used by Pay modal

document.addEventListener("DOMContentLoaded", () => {
  const tbody = document.getElementById("fineTbody");

  tbody.addEventListener("click", async (e) => {
    const printBtn = e.target.closest(".btn-print");
    const payBtn = e.target.closest(".btn-pay");
    const removeBtn = e.target.closest(".btn-remove"); // ✅ NEW

    if (printBtn) {
      const row = printBtn.closest("tr");
      await openPrintModalFromRow(row);
    }

    if (payBtn) {
      const row = payBtn.closest("tr");
      openPayModalFromRow(row);
    }

    if (removeBtn) {
      const row = removeBtn.closest("tr");
      await removeFineFromRow(row);
    }
  });

  // Filters
  document.getElementById("confirmIssueBtn")?.addEventListener("click", issueFineFromModal);
  document.getElementById("applyFilterBtn")?.addEventListener("click", applyFiltersAndRender);
  document.getElementById("reasonFilter")?.addEventListener("change", applyFiltersAndRender);
  document.getElementById("resetFilterBtn")?.addEventListener("click", resetFilters);
  document.getElementById("refreshBtn")?.addEventListener("click", () => loadFines(true));
  document.getElementById("statusFilter")?.addEventListener("change", applyFiltersAndRender);

  // Pay modal confirm
  document.getElementById("confirmPayBtn")?.addEventListener("click", confirmPayFromModal);

  // When issue modal opens -> load borrow list + init select2
  $("#issueFineModal").on("shown.bs.modal", async () => {
    await loadBorrowListForIssueModal();
    initBorrowSelect2();
  });

  // Borrow selection change -> load user ID
  $("#issueBorrowId").on("change", async function () {
    const borrowId = $(this).val();
    await loadUserFromBorrow(borrowId);
  });

  // initial load
  loadFines(false);
});

/* ======================================================
   FINES TABLE
====================================================== */
async function loadFines() {
  const tbody = document.getElementById("fineTbody");
  tbody.innerHTML = `<tr><td colspan="8" class="text-center">Loading fines...</td></tr>`;
  document.getElementById("resultCount").innerText = "Loading...";

  try {
    // ✅ Always load all, filter in JS
    const res = await fetch(`${API}/api/admin/fines?status=All`, { credentials: "include" });
    const data = await res.json().catch(() => []);
    if (!res.ok) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">${escapeHtml(data.message || "Failed to load fines")}</td></tr>`;
      document.getElementById("resultCount").innerText = "0 results";
      return;
    }

    allFinesCache = Array.isArray(data) ? data : [];
    applyFiltersAndRender();
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Server error while loading fines.</td></tr>`;
    document.getElementById("resultCount").innerText = "0 results";
  }
}

function applyFiltersAndRender() {
  const selectedStatus = (document.getElementById("statusFilter").value || "All").trim().toLowerCase();
  const selectedReason = (document.getElementById("reasonFilter").value || "All").trim().toLowerCase();

  const dateFrom = document.getElementById("dateFrom").value;
  const dateTo = document.getElementById("dateTo").value;

  const fromTime = dateFrom ? toDateStart(dateFrom).getTime() : null;
  const toTime = dateTo ? toDateEnd(dateTo).getTime() : null;

  const filtered = allFinesCache.filter(f => {
    // status filter
    const rowStatus = (f.FINE_STATUS || "").trim().toLowerCase();
    if (selectedStatus !== "all" && rowStatus !== selectedStatus) return false;

    // reason filter
    const rowReason = (f.FINE_TYPE || "").trim().toLowerCase();
    if (selectedReason !== "all" && rowReason !== selectedReason) return false;

    // date filter
    const issued = parseServerDate(f.ISSUED_DATE);
    const t = issued ? issued.getTime() : null;

    if (fromTime !== null && (t === null || t < fromTime)) return false;
    if (toTime !== null && (t === null || t > toTime)) return false;

    return true;
  });

  renderFineTable(filtered);
  document.getElementById("resultCount").innerText = `${filtered.length} result(s)`;
}

function resetFilters() {
  document.getElementById("statusFilter").value = "All";
  document.getElementById("reasonFilter").value = "All";
  document.getElementById("dateFrom").value = "";
  document.getElementById("dateTo").value = "";
  loadFines(true);
}

function renderFineTable(rows) {
  const tbody = document.getElementById("fineTbody");

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center">No fines found.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(f => {
    const fineId = f.FINE_ID;
    const userName = f.USER_NAME || f.USER_ID || "-";
    const bookTitle = f.BOOK_TITLE || "-";
    const reason = f.FINE_TYPE || "-";
    const amount = formatRM(f.AMOUNT);
    const status = (f.FINE_STATUS || "Unpaid").trim();
    const issuedDate = formatDateDisplay(f.ISSUED_DATE);

    const isPaid = status.toLowerCase() === "paid";
    const badgeClass = isPaid ? "badge badge-success" : "badge badge-warning";

    // Print only when Paid
    const printBtnHtml = isPaid
      ? `<button class="btn btn-sm btn-info btn-print">
           <i class="fas fa-print"></i> Print
         </button>`
      : "";

    // Pay only when Unpaid
    const payBtnHtml = !isPaid
      ? `<button class="btn btn-sm btn-success ml-1 btn-pay">Pay</button>`
      : "";

    const removeBtnHtml = !isPaid
      ? `<button class="btn btn-sm btn-danger ml-1 btn-remove">
           <i class="fas fa-trash"></i> Remove
         </button>`
      : "";

    return `
      <tr data-fine-id="${escapeAttr(fineId)}" data-status="${escapeAttr(status)}">
        <td class="fine-id">${escapeHtml(fineId)}</td>
        <td class="user-name">${escapeHtml(userName)}</td>
        <td class="book-title">${escapeHtml(bookTitle)}</td>
        <td class="reason">${escapeHtml(reason)}</td>
        <td class="amount font-weight-bold text-danger">${escapeHtml(amount)}</td>
        <td class="status"><span class="${badgeClass}">${escapeHtml(status)}</span></td>
        <td class="issued-date">${escapeHtml(issuedDate)}</td>
        <td class="text-center">
          ${printBtnHtml}
          ${payBtnHtml}
          ${removeBtnHtml}
        </td>
      </tr>
    `;
  }).join("");
}

/* ======================================================
   REMOVE UNPAID FINE
====================================================== */
async function removeFineFromRow(row) {
  const fineId = row?.dataset?.fineId || row?.querySelector(".fine-id")?.innerText?.trim();
  const status = (row?.dataset?.status || row?.querySelector(".status")?.innerText || "").trim().toLowerCase();

  if (!fineId) return alert("Fine ID not found.");

  // Safety: frontend check
  if (status === "paid") {
    alert("Cannot remove a PAID fine.");
    return;
  }

  const ok = confirm(`Remove fine ${fineId}?\n\nThis will delete the fine record (only if Unpaid).`);
  if (!ok) return;

  try {
    const res = await fetch(`${API}/api/admin/fines/remove`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ fineId })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.message || "Failed to remove fine.");
      return;
    }

    alert(`Fine removed: ${fineId}`);
    await loadFines(true);
  } catch (err) {
    console.error(err);
    alert("Server error while removing fine.");
  }
}

/* ======================================================
   ISSUE MODAL: BORROW_ID searchable + auto user_id
====================================================== */
async function loadBorrowListForIssueModal() {
  try {
    const res = await fetch(`${API}/api/admin/borrows/borrowed`, { credentials: "include" });
    const data = await res.json().catch(() => []);
    if (!res.ok) {
      alert(data.message || "Failed to load BORROW_ID list.");
      return;
    }

    borrowCache = Array.isArray(data) ? data : [];

    const $borrow = $("#issueBorrowId");
    $borrow.empty();
    $borrow.append(`<option value="">-- Select BORROW_ID --</option>`);

    borrowCache.forEach(b => {
      const label = `${b.BORROW_ID}  |  ${b.USER_ID}  |  ${b.BOOK_TITLE || "-"}  |  ${b.BORROW_STATUS}`;
      $borrow.append(`<option value="${escapeAttr(b.BORROW_ID)}">${escapeHtml(label)}</option>`);
    });

    $("#issueUserId").empty().append(`<option value="">-- Auto --</option>`);
  } catch (err) {
    console.error(err);
    alert("Server error while loading BORROW_ID list.");
  }
}

function initBorrowSelect2() {
  if ($("#issueBorrowId").hasClass("select2-hidden-accessible")) return;

  $("#issueBorrowId").select2({
    dropdownParent: $("#issueFineModal"),
    width: "100%",
    placeholder: "Search BORROW_ID...",
    allowClear: true
  });
}

async function loadUserFromBorrow(borrowId) {
  const $user = $("#issueUserId");
  $user.empty().append(`<option value="">-- Auto --</option>`);
  if (!borrowId) return;

  const found = borrowCache.find(x => x.BORROW_ID === borrowId);
  if (found && found.USER_ID) {
    $user.append(`<option value="${escapeAttr(found.USER_ID)}" selected>${escapeHtml(found.USER_ID)}</option>`);
    return;
  }

  try {
    const res = await fetch(`${API}/api/admin/borrows/${encodeURIComponent(borrowId)}`, { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.message || "Failed to load user from BORROW_ID.");
      return;
    }
    $user.append(`<option value="${escapeAttr(data.USER_ID)}" selected>${escapeHtml(data.USER_ID)}</option>`);
  } catch (err) {
    console.error(err);
    alert("Server error while loading user from BORROW_ID.");
  }
}

async function issueFineFromModal() {
  const borrowId = ($("#issueBorrowId").val() || "").trim();
  const reason = document.getElementById("issueReason").value;
  const amount = document.getElementById("issueAmount").value;

  if (!borrowId) return alert("Please select BORROW_ID.");
  if (!reason) return alert("Please select a reason.");

  // If you want LOST to auto amount 50, your server already handles it,
  // but keeping this check for general reasons:
  if (amount === "" || amount === null) return alert("Please enter fine amount.");

  try {
    const res = await fetch(`${API}/api/admin/fines/issue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        borrowId,
        reason,
        amount: Number(amount)
      })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.message || "Failed to issue fine.");
      return;
    }

    alert(`Fine issued successfully! Fine ID: ${data.fineId}`);

    $("#issueBorrowId").val("").trigger("change");
    document.getElementById("issueAmount").value = "";

    $("#issueFineModal").modal("hide");
    await loadFines(true);
  } catch (err) {
    console.error(err);
    alert("Server error while issuing fine.");
  }
}

/* ======================================================
   PAY MODAL
====================================================== */
function openPayModalFromRow(row) {
  const fineId = row.dataset.fineId || row.querySelector(".fine-id")?.innerText?.trim();
  if (!fineId) return alert("Fine ID not found.");

  pendingPayFineId = fineId;
  document.getElementById("payFineIdLabel").innerText = fineId;

  document.getElementById("payMethodSelect").value = "Cash";
  $("#payModal").modal("show");
}

async function confirmPayFromModal() {
  if (!pendingPayFineId) return alert("Fine ID missing.");
  const payMethod = document.getElementById("payMethodSelect").value || "Cash";

  try {
    const res = await fetch(`${API}/api/admin/fines/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ fineId: pendingPayFineId, payMethod })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.message || "Failed to pay fine.");
      return;
    }

    $("#payModal").modal("hide");
    alert(`Payment recorded! Receipt: ${data.receiptId || "-"}`);

    pendingPayFineId = null;
    await loadFines(true);
  } catch (err) {
    console.error(err);
    alert("Server error while paying fine.");
  }
}

/* ======================================================
   PRINT
====================================================== */
async function openPrintModalFromRow(row) {
  const fineId = row.dataset.fineId || row.querySelector(".fine-id")?.innerText?.trim();
  if (!fineId) return alert("Fine ID not found.");

  try {
    const res = await fetch(`${API}/api/admin/receipt/${encodeURIComponent(fineId)}`, {
      credentials: "include"
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.message || "Failed to load receipt data.");
      return;
    }

    document.getElementById("receiptSubtitle").innerText = "Official Fine Receipt";
    document.getElementById("r_receiptId").innerText = data.RECEIPT_ID || "-";
    document.getElementById("r_fineId").innerText = data.FINE_ID || fineId;
    document.getElementById("r_paidDate").innerText = data.PAY_DATE ? formatDateDisplay(data.PAY_DATE) : "-";
    document.getElementById("r_payMethod").innerText = data.PAY_METHOD || "-";

    document.getElementById("r_user").innerText = data.USER_NAME || data.USER_ID || "-";
    document.getElementById("r_book").innerText = data.BOOK_TITLE || "-";
    document.getElementById("r_reason").innerText = data.FINE_TYPE || "-";
    document.getElementById("r_issuedDate").innerText = data.ISSUED_DATE ? formatDateDisplay(data.ISSUED_DATE) : "-";
    document.getElementById("r_amount").innerText = formatRM(data.AMOUNT);

    $("#printModal").modal("show");
  } catch (err) {
    console.error(err);
    alert("Server error while loading receipt.");
  }
}

/* ======================================================
   Helpers
====================================================== */
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
