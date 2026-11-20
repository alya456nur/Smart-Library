// editBook.js (with full error checks) - EDIT BOOK + OPTIONAL COVER REPLACE

const API_BASE = "http://127.0.0.1:3000";

/* =========================
   Small helpers (same idea as addBook.js)
========================= */
function setFieldError(inputEl, message) {
  if (inputEl) inputEl.style.borderColor = "red";
  if (message) console.warn(message);
}

function setFieldOk(inputEl) {
  if (inputEl) inputEl.style.borderColor = "green";
}

function clearFieldState(inputEl) {
  if (inputEl) inputEl.style.borderColor = "";
}

function normalizeSpaces(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

function isValidIsbnLoose(isbn) {
  const cleaned = isbn.replace(/[\s-]/g, "");
  return /^\d{10}$/.test(cleaned) || /^\d{13}$/.test(cleaned);
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

function getErrorMessageFromFetch(res, data) {
  if (data && typeof data.message === "string" && data.message.trim()) return data.message;
  if (res.status === 400) return "Bad request. Please check your inputs.";
  if (res.status === 401) return "You are not logged in or session expired.";
  if (res.status === 403) return "You do not have permission to do this action.";
  if (res.status === 404) return "Book not found / API not found.";
  if (res.status >= 500) return "Server error. Please try again.";
  return "Request failed.";
}

function resolveCoverUrl(filename) {
  const fallback = `${API_BASE}/assets/images/no_cover.jpg`;
  if (!filename) return fallback;
  if (filename.startsWith("http://") || filename.startsWith("https://")) return filename;
  if (filename.startsWith("/assets/images/")) return `${API_BASE}${filename}`;
  if (filename.startsWith("/uploads/")) {
    const f = filename.split("/").pop();
    return `${API_BASE}/assets/images/${encodeURIComponent(f)}`;
  }
  return `${API_BASE}/assets/images/${encodeURIComponent(filename)}`;
}

/* =========================
   Init
========================= */
document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const bookId = urlParams.get("id");

  if (!bookId || !/^B\d+$/i.test(bookId)) {
    alert("Invalid / missing book ID in URL.");
    window.location.href = "bookInventory.html";
    return;
  }

  const bookIdInput = document.getElementById("bookIdInput");
  if (!bookIdInput) {
    alert("Missing #bookIdInput in HTML.");
    return;
  }
  bookIdInput.value = bookId;
  bookIdInput.disabled = true;

  // Required elements check (avoid null errors)
  const requiredIds = [
    "authorIdInput", "authorNameInput", "titleInput", "genreInput",
    "descInput", "publisherInput", "isbnInput", "pubDateInput",
    "statusSelect", "coverInput", "coverPreview"
  ];

  const missing = requiredIds.filter(id => !document.getElementById(id));
  if (missing.length) {
    alert("Edit form HTML missing elements: " + missing.join(", "));
    return;
  }

  fetchBookData(bookId);
  setupAuthorLookup();
  setupCoverPreview();
});

/* =========================
   FETCH BOOK DATA (with checks + image fallback)
========================= */
async function fetchBookData(bookId) {
  const authorIdInput = document.getElementById("authorIdInput");
  const authorNameInput = document.getElementById("authorNameInput");
  const titleInput = document.getElementById("titleInput");
  const genreInput = document.getElementById("genreInput");
  const descInput = document.getElementById("descInput");
  const publisherInput = document.getElementById("publisherInput");
  const isbnInput = document.getElementById("isbnInput");
  const pubDateInput = document.getElementById("pubDateInput");
  const statusSelect = document.getElementById("statusSelect");
  const coverInput = document.getElementById("coverInput");
  const preview = document.getElementById("coverPreview");

  // Clear borders
  [
    authorIdInput, authorNameInput, titleInput, genreInput,
    publisherInput, isbnInput
  ].forEach(clearFieldState);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    let response;
    try {
      response = await fetch(`${API_BASE}/api/admin/books/${encodeURIComponent(bookId)}`, {
        method: "GET",
        credentials: "include",
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }

    const book = await safeJson(response);

    if (!response.ok) {
      alert(getErrorMessageFromFetch(response, book));
      window.location.href = "bookInventory.html";
      return;
    }

    // Populate fields (defensive default)
    authorIdInput.value = book.AUTHOR_ID || "";
    authorNameInput.value = book.AUTHOR_NAME || "";
    titleInput.value = book.TITLE || "";
    genreInput.value = book.GENRE || "";
    descInput.value = book.DESCRIPTION || "";
    publisherInput.value = book.PUBLISHER || "";
    isbnInput.value = book.ISBN || "";
    statusSelect.value = book.BOOK_STATUS || "Available";

    // Date format
    if (book.PUBLICATION_DATE) {
      const d = new Date(book.PUBLICATION_DATE);
      if (!Number.isNaN(d.getTime())) {
        pubDateInput.value = d.toISOString().split("T")[0];
      } else {
        pubDateInput.value = "";
      }
    } else {
      pubDateInput.value = "";
    }

    // Cover preview (store old filename for reference)
    coverInput.dataset.oldImage = book.BOOK_IMAGE || "";
    preview.src = resolveCoverUrl(book.BOOK_IMAGE);
    preview.style.display = "block";
    preview.alt = "Current Book Cover";

    // If image fails to load, fallback to no_cover.jpg
    preview.onerror = () => {
      preview.onerror = null;
      preview.src = `${API_BASE}/assets/images/no_cover.jpg`;
    };

  } catch (error) {
    console.error("Error fetching book:", error);
    if (error.name === "AbortError") {
      alert("Request timed out. Please check your server and try again.");
    } else {
      alert("Failed to load book data.");
    }
  }
}

/* =========================
   AUTHOR LOOKUP (with format check + error handling)
========================= */
function setupAuthorLookup() {
  const authorIdInput = document.getElementById("authorIdInput");
  const authorNameInput = document.getElementById("authorNameInput");

  if (!authorIdInput || !authorNameInput) return;

  authorIdInput.addEventListener("input", () => {
    const authorId = normalizeSpaces(authorIdInput.value);

    clearFieldState(authorIdInput);
    clearFieldState(authorNameInput);

    if (!authorId) {
      authorNameInput.value = "";
      return;
    }

    if (!/^A\d+$/.test(authorId)) {
      setFieldError(authorIdInput, "Invalid Author ID format");
      return;
    }

    checkAuthorExists(authorId);
  });
}

async function checkAuthorExists(authorId) {
  const authorNameInput = document.getElementById("authorNameInput");
  const authorIdInput = document.getElementById("authorIdInput");
  if (!authorNameInput || !authorIdInput) return;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    let response;
    try {
      response = await fetch(`${API_BASE}/api/public/author-lookup?id=${encodeURIComponent(authorId)}`, {
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }

    const data = await safeJson(response);

    if (!response.ok) {
      setFieldError(authorIdInput, "Author lookup failed");
      return;
    }

    if (data.exists && data.authorName) {
      authorNameInput.value = data.authorName;
      setFieldOk(authorIdInput);
      setFieldOk(authorNameInput);
    } else {
      // author doesn't exist; allow user to type name
      authorNameInput.value = "";
      setFieldOk(authorIdInput);
      clearFieldState(authorNameInput);
    }

  } catch (error) {
    console.error("Error checking author:", error);
    setFieldError(authorIdInput, "Lookup error");
  }
}

/* =========================
   COVER PREVIEW (with validation + cleanup)
========================= */
function setupCoverPreview() {
  const coverInput = document.getElementById("coverInput");
  const preview = document.getElementById("coverPreview");

  if (!coverInput || !preview) return;

  coverInput.addEventListener("change", () => {
    const file = coverInput.files && coverInput.files[0];
    if (!file) return;

    const okTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!okTypes.includes(file.type)) {
      alert("Cover must be an image (jpg/png/webp/gif).");
      coverInput.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Cover image too large. Max 5MB.");
      coverInput.value = "";
      return;
    }

    if (file.name && file.name.length > 120) {
      alert("Cover filename too long. Please rename it shorter.");
      coverInput.value = "";
      return;
    }

    const url = URL.createObjectURL(file);
    preview.src = url;
    preview.style.display = "block";
    preview.alt = "New Cover Preview";
  });
}

/* =========================
   SAVE BOOK (full checks + timeout + better server error handling)
========================= */
async function saveBook() {
  const bookId = document.getElementById("bookIdInput")?.value;

  const authorIdInput = document.getElementById("authorIdInput");
  const authorNameInput = document.getElementById("authorNameInput");
  const titleInput = document.getElementById("titleInput");
  const genreInput = document.getElementById("genreInput");
  const descInput = document.getElementById("descInput");
  const publisherInput = document.getElementById("publisherInput");
  const isbnInput = document.getElementById("isbnInput");
  const pubDateInput = document.getElementById("pubDateInput");
  const statusSelect = document.getElementById("statusSelect");
  const coverInput = document.getElementById("coverInput");

  // Defensive checks
  if (!bookId || !/^B\d+$/i.test(bookId)) {
    alert("Invalid book ID.");
    return;
  }
  const requiredEls = [authorIdInput, authorNameInput, titleInput, genreInput, publisherInput, isbnInput, statusSelect, coverInput];
  if (requiredEls.some(el => !el)) {
    alert("Missing form elements. Please reload the page.");
    return;
  }

  // Clear borders
  [authorIdInput, authorNameInput, titleInput, genreInput, publisherInput, isbnInput].forEach(clearFieldState);

  const authorId = normalizeSpaces(authorIdInput.value);
  const authorName = normalizeSpaces(authorNameInput.value);
  const title = normalizeSpaces(titleInput.value);
  const genre = normalizeSpaces(genreInput.value);
  const description = normalizeSpaces(descInput?.value || "");
  const publisher = normalizeSpaces(publisherInput.value);
  const isbn = normalizeSpaces(isbnInput.value);
  const publicationDate = pubDateInput?.value || "";
  const bookStatus = statusSelect.value;

  const newCover = coverInput.files && coverInput.files[0] ? coverInput.files[0] : null;

  // Required checks
  let hasError = false;

  if (!authorId) { setFieldError(authorIdInput, "Author ID required"); hasError = true; }
  if (!authorName) { setFieldError(authorNameInput, "Author Name required"); hasError = true; }
  if (!title) { setFieldError(titleInput, "Title required"); hasError = true; }
  if (!genre) { setFieldError(genreInput, "Genre required"); hasError = true; }
  if (!publisher) { setFieldError(publisherInput, "Publisher required"); hasError = true; }
  if (!isbn) { setFieldError(isbnInput, "ISBN required"); hasError = true; }

  if (hasError) {
    alert("Please fill in all required fields.");
    return;
  }

  // Format checks
  if (!/^A\d+$/.test(authorId)) {
    setFieldError(authorIdInput, "Invalid Author ID format");
    alert("Invalid Author ID format. Use A + numbers (e.g., A001).");
    return;
  }

  if (authorName.length < 2) {
    setFieldError(authorNameInput, "Author name too short");
    alert("Author Name too short.");
    return;
  }

  if (title.length < 2) { setFieldError(titleInput, "Title too short"); alert("Title too short."); return; }
  if (genre.length < 2) { setFieldError(genreInput, "Genre too short"); alert("Genre too short."); return; }
  if (publisher.length < 2) { setFieldError(publisherInput, "Publisher too short"); alert("Publisher too short."); return; }

  if (!isValidIsbnLoose(isbn)) {
    setFieldError(isbnInput, "Invalid ISBN");
    alert("Invalid ISBN. Use 10 or 13 digits (hyphens allowed).");
    return;
  }

  // Date check (optional)
  if (publicationDate) {
    const d = new Date(publicationDate);
    if (Number.isNaN(d.getTime())) {
      alert("Invalid publication date.");
      return;
    }
  }

  // Status check
  if (!["Available", "Unavailable"].includes(bookStatus)) {
    alert("Invalid Book Status selected.");
    return;
  }

  // File checks
  if (newCover) {
    const okTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!okTypes.includes(newCover.type)) {
      alert("Cover must be an image (jpg/png/webp/gif).");
      coverInput.value = "";
      return;
    }
    if (newCover.size > 5 * 1024 * 1024) {
      alert("Cover image too large. Max 5MB.");
      coverInput.value = "";
      return;
    }
    if (newCover.name && newCover.name.length > 120) {
      alert("Cover filename too long. Please rename it shorter.");
      coverInput.value = "";
      return;
    }
  }

  const saveBtn = document.querySelector(".btn-primary");
  const originalText = saveBtn ? saveBtn.textContent : "";

  if (saveBtn) {
    saveBtn.textContent = "Saving...";
    saveBtn.disabled = true;
  }

  try {
    const fd = new FormData();
    fd.append("authorId", authorId);
    fd.append("authorName", authorName);
    fd.append("title", title);
    fd.append("genre", genre);
    fd.append("description", description);
    fd.append("publisher", publisher);
    fd.append("isbn", isbn);
    fd.append("publicationDate", publicationDate);
    fd.append("bookStatus", bookStatus);

    if (newCover) fd.append("cover", newCover);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    let response;
    try {
      response = await fetch(`${API_BASE}/api/admin/books/${encodeURIComponent(bookId)}/update`, {
        method: "PUT",
        credentials: "include",
        body: fd,
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }

    const data = await safeJson(response);

    if (!response.ok) {
      const msg = "Failed to update book: " + getErrorMessageFromFetch(response, data);

      // highlight likely related fields
      const m = (data.message || "").toLowerCase();
      if (m.includes("isbn")) setFieldError(isbnInput, data.message);
      if (m.includes("author")) setFieldError(authorIdInput, data.message);

      alert(msg);
      return;
    }

    alert("✅ Book updated successfully!");

    setTimeout(() => {
      window.location.href = "bookInventory.html";
    }, 300);

  } catch (error) {
    console.error("Error updating book:", error);
    if (error.name === "AbortError") {
      alert("Request timed out. Please check your server and try again.");
    } else {
      alert("Server error. Please try again.");
    }
  } finally {
    if (saveBtn) {
      saveBtn.textContent = originalText || "Save";
      saveBtn.disabled = false;
    }
  }
}

/* =========================
   RESET FORM (with safety)
========================= */
function resetForm() {
  if (confirm("Reset all changes to original values?")) {
    const bookId = document.getElementById("bookIdInput")?.value;
    const coverInput = document.getElementById("coverInput");
    const preview = document.getElementById("coverPreview");

    if (coverInput) coverInput.value = "";

    // Reset preview back to stored old image (if we have it), otherwise no_cover
    if (preview && coverInput) {
      const old = coverInput.dataset.oldImage || "";
      preview.src = resolveCoverUrl(old);
      preview.style.display = "block";
      preview.onerror = () => {
        preview.onerror = null;
        preview.src = `${API_BASE}/assets/images/no_cover.jpg`;
      };
    }

    if (bookId) fetchBookData(bookId);
  }
}
