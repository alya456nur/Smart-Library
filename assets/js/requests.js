document.addEventListener("DOMContentLoaded", async function () {
  const listEl = document.getElementById("requestList");
  const emptyEl = document.getElementById("emptyState");

  const boxPending = document.getElementById("boxPending");
  const boxApproved = document.getElementById("boxApproved");
  const boxRejected = document.getElementById("boxRejected");

  const cPending = document.getElementById("cPending");
  const cApproved = document.getElementById("cApproved");
  const cRejected = document.getElementById("cRejected");

  const tabReqCount = document.getElementById("tabReqCount");
  const filterLabel = document.getElementById("filterLabel");

  const btnShowAll = document.getElementById("btnShowAll");

  if (!listEl || !emptyEl) return;

  let currentFilter = "PENDING";
  let allRequests = [];

  user = await window.getSessionUser();
  if (!user) return;

  async function fetchRequests() {
    try {
      const res = await fetch(`http://127.0.0.1:3000/api/requests/${user.id}`);
      const data = await res.json();

      allRequests = data.map(r => ({
        requestId: r.REQUEST_ID,
        status: r.REQUEST_STATUS.toUpperCase(),
        requestedAt: r.REQUEST_DATE,
        dueDate: r.DUE_DATE, // ✅ ADD THIS
        book: {
          title: r.TITLE,
          genre: r.GENRE,
          cover: r.cover,
          author: r.author
        }
      }));

      render();
    } catch (err) {
      console.error(err);
      allRequests = [];
      render();
    }
  }

  function formatDate(date) {
    return new Date(date).toLocaleDateString("en-MY", {
      day: "numeric",
      month: "numeric",
      year: "numeric"
    });
  }

  function isOverdue(dueDate) {
    return new Date(dueDate) < new Date();
  }

  function updateCountsUI() {
    cPending.textContent = allRequests.filter(r => r.status === "PENDING").length;
    cApproved.textContent = allRequests.filter(r => r.status === "APPROVED").length;
    cRejected.textContent = allRequests.filter(r => r.status === "REJECTED").length;
    tabReqCount.textContent = allRequests.length;
  }

  function setSelectedBox() {
    [boxPending, boxApproved, boxRejected].forEach(b => b.classList.remove("selected"));
    if (currentFilter === "PENDING") boxPending.classList.add("selected");
    if (currentFilter === "APPROVED") boxApproved.classList.add("selected");
    if (currentFilter === "REJECTED") boxRejected.classList.add("selected");
  }

  function setFilterLabel() {
    filterLabel.textContent =
      currentFilter === "ALL"
        ? "Showing: All"
        : `Showing: ${currentFilter.charAt(0)}${currentFilter.slice(1).toLowerCase()}`;
  }

  function render() {
    updateCountsUI();
    setSelectedBox();
    setFilterLabel();

    const view =
      currentFilter === "ALL"
        ? allRequests
        : allRequests.filter(r => r.status === currentFilter);

    listEl.innerHTML = "";
    if (!view.length) {
      emptyEl.classList.remove("d-none");
      return;
    }
    emptyEl.classList.add("d-none");

    view.forEach(req => {
      const requestedDate = req.requestedAt ? new Date(req.requestedAt) : null;

      const badge =
        req.status === "APPROVED" ? "bg-success" :
        req.status === "REJECTED" ? "bg-danger" :
        "bg-warning text-dark";

      const card = document.createElement("div");
      card.className = "book-card p-3 mb-3";
      card.innerHTML = `
        <div class="d-flex align-items-start">
          <div class="book-cover me-3">
            <img src="../assets/images/${req.book.cover || ''}" class="book-image">
          </div>
          <div class="flex-grow-1">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <div class="fw-semibold">${req.book.title || '-'}</div>
                <div class="text-muted small mb-0">${req.book.author || '-'}</div>
                <div class="text-muted small mb-2">${req.book.genre || '-'}</div>
              </div>
              <span class="badge ${badge}">${req.status}</span>
            </div>
            <div class="small text-muted">
              Request Date: <strong>${requestedDate ? formatDate(requestedDate) : '-'}</strong>
            </div>
          </div>
        </div>
      `;
      listEl.appendChild(card);
    });
  }

  boxPending.onclick = () => { currentFilter = "PENDING"; render(); };
  boxApproved.onclick = () => { currentFilter = "APPROVED"; render(); };
  boxRejected.onclick = () => { currentFilter = "REJECTED"; render(); };
  btnShowAll.onclick = () => { currentFilter = "ALL"; render(); };

  fetchRequests();
});
