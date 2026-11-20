const API_BASE = "http://127.0.0.1:3000"; // ✅ use ONE host consistently

let ALL_REQUESTS = []; // ✅ keep original data for filtering

document.addEventListener("DOMContentLoaded", () => {
  loadRequests();

  // ✅ wire date filters
  document.getElementById("dateFrom")?.addEventListener("change", applyDateFilter);
  document.getElementById("dateTo")?.addEventListener("change", applyDateFilter);

  document.getElementById("clearDateBtn")?.addEventListener("click", () => {
    const from = document.getElementById("dateFrom");
    const to = document.getElementById("dateTo");
    if (from) from.value = "";
    if (to) to.value = "";
    renderTable(ALL_REQUESTS);
  });
});

function loadRequests() {
  fetch(`${API_BASE}/api/admin/borrow-requests`, {
    credentials: "include",
  })
    .then((res) => res.json())
    .then((data) => {
      ALL_REQUESTS = Array.isArray(data) ? data : [];
      renderTable(ALL_REQUESTS);
    })
    .catch((err) => console.error("Fetch error:", err));
}

function applyDateFilter() {
  const fromVal = document.getElementById("dateFrom")?.value; // "YYYY-MM-DD"
  const toVal = document.getElementById("dateTo")?.value;

  // if no filters, show all
  if (!fromVal && !toVal) {
    return renderTable(ALL_REQUESTS);
  }

  // Build date bounds (inclusive)
  const fromDate = fromVal ? new Date(fromVal + "T00:00:00") : null;
  const toDate = toVal ? new Date(toVal + "T23:59:59") : null;

  const filtered = ALL_REQUESTS.filter((r) => {
    if (!r.REQUEST_DATE) return false;

    // REQUEST_DATE might be "YYYY-MM-DD" or full datetime; Date() handles both
    const d = new Date(r.REQUEST_DATE);
    if (isNaN(d.getTime())) return false;

    if (fromDate && d < fromDate) return false;
    if (toDate && d > toDate) return false;
    return true;
  });

  renderTable(filtered);
}

function renderTable(requests) {
  const tbody = document.getElementById("requestTableBody");
  tbody.innerHTML = "";

  if (!requests || requests.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-muted">
          No pending requests
        </td>
      </tr>`;
    return;
  }

  requests.forEach((req) => {
    const tr = document.createElement("tr");
    tr.style.backgroundColor = "rgba(255,255,255,0.1)";
    tr.style.borderBottom = "1px solid #ccc";

    tr.innerHTML = `
      <td class="align-middle">${formatDate(req.REQUEST_DATE)}</td>
      <td class="align-middle">
        <a href="userInfo.html?userId=${req.USER_ID}" class="text-dark font-weight-bold">
          <u>${req.USER_ID}</u>
        </a>
      </td>
      <td class="align-middle">${req.ISBN || "-"}</td>
      <td class="align-middle">${req.TITLE || "-"}</td>
      <td class="align-middle">
        <button class="btn btn-sm btn-success badge-pill px-3"
          onclick="processRequest('${req.REQUEST_ID}', 'approve')">
          Approve
        </button>
        <button class="btn btn-sm btn-danger badge-pill px-3"
          onclick="processRequest('${req.REQUEST_ID}', 'reject')">
          Decline
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

function processRequest(requestId, action) {
  const confirmMsg =
    action === "approve"
      ? "Approve this borrow request?"
      : "Decline this borrow request?";

  if (!confirm(confirmMsg)) return;

  fetch(`${API_BASE}/api/admin/process-request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // ✅ keep this
    body: JSON.stringify({ requestId, action }),
  })
    .then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Request failed");
      return data;
    })
    .then((data) => {
      alert(data.message);
      loadRequests(); // refresh table
    })
    .catch((err) => {
      console.error(err);
      alert(err.message || "Error processing request");
    });
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? "-" : d.toLocaleDateString("en-GB");
}
