const API_BASE = "http://127.0.0.1:3000";

let ALL_BOOKS = []; // cache for reset / client filter

document.addEventListener("DOMContentLoaded", () => {
  loadBooks();

  document.getElementById("searchBtn").addEventListener("click", () => {
    const q = document.getElementById("searchInput").value.trim();
    loadBooks(q); // server-side search
  });

  document.getElementById("resetBtn").addEventListener("click", () => {
    document.getElementById("searchInput").value = "";
    renderBooks(ALL_BOOKS);
  });

  // Optional: live filter on typing (client-side, uses cached ALL_BOOKS)
  document.getElementById("searchInput").addEventListener("keyup", () => {
    const q = document.getElementById("searchInput").value.trim().toLowerCase();
    if (!q) return renderBooks(ALL_BOOKS);

    const filtered = ALL_BOOKS.filter(b => {
      const hay = `${b.TITLE} ${b.ISBN} ${b.AUTHOR_NAME}`.toLowerCase();
      return hay.includes(q);
    });

    renderBooks(filtered);
  });
});

async function loadBooks(search = "") {
  try {
    const url = new URL(`${API_BASE}/api/admin/books`);
    if (search) url.searchParams.set("search", search);

    const res = await fetch(url.toString(), { credentials: "include" });
    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Failed to load books");
      return;
    }

    ALL_BOOKS = data;
    renderBooks(data);

  } catch (err) {
    console.error("Load books failed:", err);
    alert("Server error loading books");
  }
}

function renderBooks(books) {
  const tbody = document.getElementById("bookTbody");
  tbody.innerHTML = "";

  if (!books || books.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-muted py-4">
          No books found.
        </td>
      </tr>
    `;
    return;
  }

  books.forEach(b => {
    const statusClass = (b.BOOK_STATUS || "").toLowerCase() === "available"
      ? "status-badge status-available"
      : "status-badge status-unavailable";

    const coverSrc = resolveCover(b.BOOK_IMAGE);

    const tr = document.createElement("tr");
    const fallbackCover = `${API_BASE}/assets/images/no_cover.jpg`;
    tr.innerHTML = `
      <td class="align-middle">${escapeHtml(b.ISBN || "-")}</td>

      <td class="align-middle img-cell">
        <img class="cover-img"
            src="${coverSrc}"
            alt="${escapeHtml(b.TITLE || "Book cover")}"
            onerror="this.onerror=null;this.src='${fallbackCover}'">
      </td>

      <td class="align-middle">${escapeHtml(b.TITLE || "-")}</td>
      <td class="align-middle">${escapeHtml(b.AUTHOR_NAME || "-")}</td>

      <td class="align-middle">
        <span class="${statusClass}">${escapeHtml(b.BOOK_STATUS || "-")}</span>
      </td>

      <td class="align-middle">
        <button class="btn btn-sm btn-info mr-1" onclick="goEdit('${b.BOOK_ID}')">
          Edit
        </button>
        <button class="btn btn-sm btn-danger" onclick="deleteBook('${b.BOOK_ID}', this)">
          Delete
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

function goEdit(bookId) {
  // If your editBook.html uses query string:
  window.location.href = `editBook.html?id=${encodeURIComponent(bookId)}`;
}

async function deleteBook(bookId, btn) {
  if (!confirm(`Are you sure you want to PERMANENTLY DELETE this book?\n\nBook ID: ${bookId}`)) return;

  try {
    const res = await fetch(`${API_BASE}/api/admin/books/${encodeURIComponent(bookId)}`, {
      method: "DELETE",
      credentials: "include"
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Delete failed");
      return;
    }

    // nice UI remove
    const row = btn.closest("tr");
    row.style.transition = "all 0.35s ease";
    row.style.opacity = "0";
    row.style.transform = "translateX(15px)";
    setTimeout(() => row.remove(), 350);

    // refresh cache
    ALL_BOOKS = ALL_BOOKS.filter(b => b.BOOK_ID !== bookId);

  } catch (err) {
    console.error("Delete failed:", err);
    alert("Server error deleting book");
  }
}

/* ---------- helpers ---------- */

function resolveCover(bookImage) {
  // Fallback image (served by server)
  const fallback = `${API_BASE}/assets/images/no_cover.jpg`;

  // If DB empty/null
  if (!bookImage) return fallback;

  // If already a full URL
  if (bookImage.startsWith("http://") || bookImage.startsWith("https://")) return bookImage;

  // If DB stored "/assets/images/xxx.jpg"
  if (bookImage.startsWith("/assets/images/")) return `${API_BASE}${bookImage}`;

  // If DB stored old "/uploads/xxx.jpg"
  if (bookImage.startsWith("/uploads/")) {
    const filename = bookImage.split("/").pop();
    return `${API_BASE}/assets/images/${encodeURIComponent(filename)}`;
  }

  // Normal: filename only
  return `${API_BASE}/assets/images/${encodeURIComponent(bookImage)}`;
}



function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
