/*============================================================
  SMART LIBRARY | recommendation.js (AI Picks)
==============================================================*/

const API_BASE = "http://127.0.0.1:3000";

let user = null;
let favouriteBookIds = []; // used to show correct heart icons
let reasonsMap = {};       // reasons from backend keyed by BOOK_ID

document.addEventListener("DOMContentLoaded", async () => {
  user = await window.getSessionUser(); // your public.js session helper
  if (!user) return;

  // Navbar
  const navName = document.getElementById("navUserName");
  const navEmail = document.getElementById("navUserEmail");
  if (navName) navName.textContent = user.name || "";
  if (navEmail) navEmail.textContent = user.email || "";

  // Logout
  document.getElementById("logoutBtn")?.addEventListener("click", async (e) => {
    e.preventDefault();
    await fetch(`${API_BASE}/logout`, { credentials: "include" });
    window.location.href = "index.html";
  });

  // Load favourites first (for hearts)
  await loadFavourites();

  // Load recommendations
  await loadRecommendations();

  // Refresh button
  document.getElementById("refreshBtn")?.addEventListener("click", async () => {
    await loadRecommendations(true);
  });
});

/*============================================================
  LOAD USER FAVOURITES (book IDs only)
==============================================================*/
async function loadFavourites() {
  try {
    const res = await fetch(`${API_BASE}/api/favourite/${user.id}`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to load favourites");
    favouriteBookIds = await res.json(); // ["B001","B010",...]
  } catch (err) {
    console.error("loadFavourites error:", err);
    favouriteBookIds = [];
  }
}

/*============================================================
  LOAD RECOMMENDATIONS (calls backend AI route)
==============================================================*/
async function loadRecommendations(isRefresh = false) {
  const list = document.getElementById("recList");
  const subtitle = document.getElementById("recSubtitle");
  if (!list) return;

  list.innerHTML = `
    <div class="text-muted small">
      <i class="bi bi-stars me-1"></i> Generating your AI picks...
    </div>
  `;
  if (subtitle)
    subtitle.textContent = isRefresh
      ? "Refreshing picks..."
      : "Loading recommendations...";

  try {
    const res = await fetch(`${API_BASE}/api/recommendations/${user.id}`, {
      credentials: "include",
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data?.message || "Failed to fetch recommendations");
    }

    const ids = data.recommendedBookIds || [];
    reasonsMap = data.reasons || {};

    if (!ids.length) {
      list.innerHTML = `
        <div class="alert alert-secondary">
          No recommendations found right now.
        </div>
      `;
      if (subtitle) subtitle.textContent = data.message || "No recommendations available.";
      return;
    }

    // Fetch full book details for those IDs
    const books = await fetchBooksByIds(ids);

    renderRecommendations(books, ids);

    if (subtitle) {
      subtitle.textContent = "Here are 10 picks selected for you.";
    }
  } catch (err) {
    console.error("loadRecommendations error:", err);
    list.innerHTML = `
      <div class="alert alert-danger">
        Failed to generate AI recommendations. Please try again.
      </div>
    `;
    if (subtitle) subtitle.textContent = "Error loading recommendations.";
  }
}

/*============================================================
  FETCH BOOKS BY IDS (preserve AI order)
==============================================================*/
async function fetchBooksByIds(ids) {
  const res = await fetch(`${API_BASE}/api/books`, { credentials: "include" });
  const all = await res.json();

  const map = new Map(all.map((b) => [b.BOOK_ID, b]));
  return ids.map((id) => map.get(id)).filter(Boolean);
}

/*============================================================
  Format date to "DD Month YYYY"
==============================================================*/
function formatDateDDMonthYYYY(dateValue) {
  if (!dateValue) return "-";
  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return "-";

  const day = String(d.getDate()).padStart(2, "0");
  const monthNames = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

/*============================================================
  RENDER RECOMMENDATIONS
==============================================================*/
function renderRecommendations(books) {
  const list = document.getElementById("recList");
  if (!list) return;

  list.innerHTML = "";

  if (!books.length) {
    list.innerHTML = `<div class="alert alert-secondary">No books data returned.</div>`;
    return;
  }

  books.forEach((book, idx) => {
    const available = book.BOOK_STATUS === "Available";
    const isFavourite = favouriteBookIds.includes(book.BOOK_ID);

    const published = formatDateDDMonthYYYY(book.PUBLICATION_DATE);
    const reason = reasonsMap[book.BOOK_ID] || "Recommended for you.";

    list.innerHTML += `
      <article class="book-card">
        <div class="book-cover">
          <img src="../assets/images/${book.BOOK_IMAGE || "default-book.jpg"}"
               class="book-image"
               alt="cover">
        </div>

        <div class="book-info">
          <div class="book-header">
            <h5>${idx + 1}. ${book.TITLE}</h5>
            <button class="btn btn-like" data-book-id="${book.BOOK_ID}" type="button">
              <i class="bi ${isFavourite ? "bi-heart-fill" : "bi-heart"}"></i>
            </button>
          </div>

          <div class="book-author">${book.AUTHOR_NAME || "-"}</div>

          <div class="small text-muted mb-2">
            <div><b>Genre:</b> ${book.GENRE || "-"}</div>
            <div><b>Publisher:</b> ${book.PUBLISHER || "-"}</div>
            <div><b>ISBN:</b> ${book.ISBN || "-"}</div>
            <div><b>Published:</b> ${published}</div>
          </div>

          <div class="alert alert-info py-2 small mb-2">
            <i class="bi bi-stars me-1"></i>
            <b>Why this pick:</b> ${escapeHtml(reason)}
          </div>

          <p class="book-description">${book.DESCRIPTION || ""}</p>
        </div>

        <div class="book-actions">
          <div class="book-status ${available ? "available" : "unavailable"}">
            ${book.BOOK_STATUS}
          </div>

          <button class="btn btn-sm book-borrow-btn ${available ? "btn-primary" : "btn-secondary"}"
            ${available ? "" : "disabled"}
            data-id="${book.BOOK_ID}"
            data-title="${book.TITLE}"
            data-author="${book.AUTHOR_NAME || ""}"
            data-genre="${book.GENRE || ""}"
            data-publisher="${book.PUBLISHER || ""}"
            data-isbn="${book.ISBN || ""}"
            data-cover="${book.BOOK_IMAGE || ""}"
            data-description="${book.DESCRIPTION || ""}"
            type="button"
          >
            Borrow
          </button>
        </div>
      </article>
    `;
  });
}

/*============================================================
  Like button toggle (event delegation)
==============================================================*/
document.body.addEventListener("click", async (e) => {
  const btn = e.target.closest(".btn-like");
  if (!btn || !user) return;

  const icon = btn.querySelector("i");
  const bookId = btn.dataset.bookId;

  const isFav = icon?.classList.contains("bi-heart-fill");

  const url = isFav
    ? `${API_BASE}/api/favourite/remove`
    : `${API_BASE}/api/favourite/add`;

  try {
    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, bookId }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data?.msg || "Favourite action failed");
      return;
    }

    // Toggle icon UI
    icon.classList.toggle("bi-heart");
    icon.classList.toggle("bi-heart-fill");

    // Sync local list
    if (isFav) {
      favouriteBookIds = favouriteBookIds.filter((id) => id !== bookId);
    } else {
      favouriteBookIds.push(bookId);
    }
  } catch (err) {
    console.error("Favourite toggle error:", err);
    alert("Favourite action failed");
  }
});

/*============================================================
  Small helper to prevent HTML injection in reasons
==============================================================*/
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
