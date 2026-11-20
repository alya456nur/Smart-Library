// borrow.js (your file name shows "borrows.js" in message, but script loads borrow.js)
// Keep BOTH parts: modal logic + my books page logic

/*-----------------------------------------
  BORROW MODAL LOGIC (user-home.html)
------------------------------------------*/
document.addEventListener("DOMContentLoaded", async () => {
  const modalEl = document.getElementById("borrowModal");
  if (!modalEl) return;

  const borrowModal = new bootstrap.Modal(modalEl);

  const modalBookCover = document.getElementById("modalBookCover");
  const modalBookTitle = document.getElementById("modalBookTitle");
  const modalBookAuthor = document.getElementById("modalBookAuthor");
  const modalGenreTag = document.getElementById("modalGenreTag");
  const modalPublisher = document.getElementById("modalPublisher");
  const modalIsbn = document.getElementById("modalIsbn");
  const modalDescription = document.getElementById("modalDescription");
  const modalAvailable = document.getElementById("modalAvailable");
  const borrowPeriodSelect = document.getElementById("borrowPeriodSelect");
  const modalDueDate = document.getElementById("modalDueDate");
  const borrowConfirmBtn = document.getElementById("borrowConfirmBtn");

  let currentBookId = null;

  document.body.addEventListener("click", async e => {
    const btn = e.target.closest(".book-borrow-btn");
    if (!btn) return;

    currentBookId = btn.dataset.id;

    const user = await window.getSessionUser();
    if (!user) return;

    const [bookRes, pendingRes] = await Promise.all([
      fetch(`http://127.0.0.1:3000/api/books/${currentBookId}`),
      fetch(`http://127.0.0.1:3000/api/requests/pending/${user.id}/${currentBookId}`)
    ]);

    const book = await bookRes.json();
    const pendingData = await pendingRes.json();

    modalBookCover.src = "../assets/images/" + book.BOOK_IMAGE;
    modalBookTitle.textContent = book.TITLE;
    modalBookAuthor.textContent = book.AUTHOR_NAME;
    modalGenreTag.textContent = book.GENRE;
    modalPublisher.textContent = book.PUBLISHER;
    modalIsbn.textContent = book.ISBN;
    modalDescription.textContent = book.DESCRIPTION;
    modalAvailable.textContent = book.BOOK_STATUS;

    borrowPeriodSelect.value = "14";

    if (pendingData.pending) {
      borrowConfirmBtn.disabled = true;
      borrowConfirmBtn.textContent = "Request Pending";
    } else {
      borrowConfirmBtn.disabled = false;
      borrowConfirmBtn.textContent = "Confirm Borrow";
    }

    borrowModal.show();
  });

  borrowConfirmBtn.addEventListener("click", async () => {
    const user = await window.getSessionUser();
    if (!user) return;

    const borrowDays = parseInt(borrowPeriodSelect.value, 10);

    const res = await fetch("http://127.0.0.1:3000/api/request-borrow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.id,
        bookId: currentBookId,
        borrowDays
      })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.msg || "Borrow failed");
      return;
    }

    alert("Borrow request submitted!");
    borrowModal.hide();
  });
});


/*======================
  My Books page logic in borrow.html
======================== */
document.addEventListener("DOMContentLoaded", async () => {
  const user = await window.getSessionUser();
  if (!user) return;

  const listEl = document.getElementById("myBooksList");
  const emptyEl = document.getElementById("emptyState");
  const tabBookCount = document.getElementById("tabBookCount");
  const statusFilterEl = document.getElementById("borrowStatusFilter"); // ✅ ADDED

  if (!listEl || !emptyEl) return;

  let allBooks = []; // ✅ ADDED: store fetched books for client filtering

  function formatDate(dateStr) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-MY");
  }

  // Normalize helper
  function norm(s) {
    return String(s || "").trim().toLowerCase();
  }

  // Determine display status (including overdue override) so filter matches UI
  function computeDisplayStatus(book) {
    const rawStatus = String(book.BORROW_STATUS || "").trim();
    const n = norm(rawStatus);

    const today = new Date();
    const due = book.DUE_DATE ? new Date(book.DUE_DATE) : null;

    // If borrowed and overdue -> treat as "overdue" (same as your UI)
    if (n === "borrowed" && due && !isNaN(due.getTime()) && due < today) {
      return "overdue";
    }

    // Normalize small variations
    if (n === "ready for pickup") return "ready for pickup";
    if (n === "not picked up") return "not picked up";
    return n; // borrowed/returned/lost/etc.
  }

  function renderBooks(books) {
    listEl.innerHTML = "";
    tabBookCount.textContent = `(${books.length})`;

    if (!books.length) {
      emptyEl.style.display = "block";
      return;
    }

    emptyEl.style.display = "none";
    const today = new Date();

    books.forEach(book => {
      const rawStatus = String(book.BORROW_STATUS || "").trim();
      const n = norm(rawStatus);

      const isReadyForPickup = n === "ready for pickup";
      const isNotPickedUp = n === "not picked up";

      const due = book.DUE_DATE ? new Date(book.DUE_DATE) : null;

      let overdueDays = 0;
      let fine = 0;
      let statusClass = "";
      let statusText = rawStatus;

      if (n === "borrowed" && due && !isNaN(due.getTime()) && due < today) {
        overdueDays = Math.ceil((today - due) / (1000 * 60 * 60 * 24));
        fine = overdueDays * 1;
        statusClass = "overdue";
        statusText = "Overdue";
      } else {
        switch (n) {
          case "borrowed": statusClass = "borrowed"; break;
          case "returned": statusClass = "returned"; break;
          case "lost": statusClass = "lost"; break;
          case "ready for pickup": statusClass = "ready"; break;
          case "not picked up": statusClass = "not-picked"; break;
          default: statusClass = ""; break;
        }
      }

      const shouldHideDates = isReadyForPickup || isNotPickedUp;

      const datesHtml = shouldHideDates
        ? ""
        : `
          <div class="small mt-2">
            Borrowed: <strong>${formatDate(book.DATE_BORROWED)}</strong><br>
            Due: <strong>${formatDate(book.DUE_DATE)}</strong>
          </div>
        `;

      listEl.innerHTML += `
        <div class="book-card p-3">
          <div class="d-flex">
            <img src="../assets/images/${book.BOOK_IMAGE}" class="book-image me-3">

            <div class="flex-grow-1">
              <div class="fw-semibold">${book.TITLE}</div>
              <div class="text-muted small">${book.AUTHOR_NAME}</div>

              ${datesHtml}

              <span class="borrow-status ${statusClass} mt-2">
                ${statusText}
              </span>

              ${
                overdueDays
                  ? `<div class="alert alert-danger py-1 mt-2">
                      Overdue ${overdueDays} day(s) – Fine RM${fine.toFixed(2)}
                    </div>`
                  : ""
              }
            </div>
          </div>
        </div>
      `;
    });
  }

  function applyFilterAndRender() {
    const selected = norm(statusFilterEl?.value || "all");
    if (selected === "all") return renderBooks(allBooks);

    const filtered = allBooks.filter(b => computeDisplayStatus(b) === selected);
    renderBooks(filtered);
  }

  async function loadMyBooks() {
    const res = await fetch(`http://127.0.0.1:3000/api/my-books/${user.id}`);
    const books = await res.json();

    allBooks = Array.isArray(books) ? books : [];
    applyFilterAndRender();
  }

  // ✅ ADDED: filter listener
  if (statusFilterEl) {
    statusFilterEl.addEventListener("change", applyFilterAndRender);
  }

  loadMyBooks();
});
