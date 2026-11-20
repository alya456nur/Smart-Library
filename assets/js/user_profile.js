document.addEventListener("DOMContentLoaded", async function () {
  const user = await window.getSessionUser(); // Replace with your session/user logic
  if (!user) return;

  const infoFields = document.querySelectorAll(".info-value[data-field]");
  const likedBooksContainer = document.querySelector(".liked-books");

  // Create input fields dynamically
  infoFields.forEach(field => {
    const key = field.dataset.field;
    if (key === "memberSince") return; // memberSince is read-only

    const input = document.createElement(key === "gender" ? "select" : "input");
    input.dataset.field = key;
    input.classList.add("form-control", "d-none");
    if (key === "gender") {
      ["", "Male", "Female", "Prefer Not To Say"].forEach(opt => {
        const option = document.createElement("option");
        option.value = opt;
        option.textContent = opt || "Select";
        input.appendChild(option);
      });
    }
    field.parentNode.appendChild(input);
  });

  const btnEdit = document.createElement("a");
  btnEdit.href = "#";
  btnEdit.className = "float-end text-decoration-none";
  btnEdit.innerHTML = `<i class="bi bi-pencil-square"></i> Edit`;
  const btnSave = document.createElement("a");
  btnSave.href = "#";
  btnSave.className = "float-end text-decoration-none d-none";
  btnSave.innerHTML = `<i class="bi bi-check-lg"></i> Save`;

  infoFields[0].parentNode.parentNode.parentNode.querySelector("h5").appendChild(btnSave);
  infoFields[0].parentNode.parentNode.parentNode.querySelector("h5").appendChild(btnEdit);

  // Fetch user info
  async function fetchProfile() {
    try {
      const res = await fetch(`http://127.0.0.1:3000/api/profile/${user.id}`);
      const userData = await res.json();

      infoFields.forEach(field => {
        const key = field.dataset.field;
        if (key === "firstName") field.textContent = userData.firstName || "-";
        if (key === "lastName") field.textContent = userData.lastName || "-";
        if (key === "gender") field.textContent = userData.gender || "-";
        if (key === "contact") field.textContent = userData.contact || "-";
        if (key === "email") field.textContent = userData.email || "-";
        if (key === "memberSince") field.textContent = userData.memberSince || "-";

        // Also populate hidden input fields
        const input = field.parentNode.querySelector("input, select");
        if (input) input.value = userData[key] || "";
      });
    } catch (err) {
      console.error(err);
    }
  }

  // Fetch liked/favourite books
  async function fetchLikedBooks() {
    try {
      const res = await fetch(`http://127.0.0.1:3000/api/profile/${user.id}/favourites`);
      const books = await res.json();

      const container = likedBooksContainer;
      const booksHtml = books.map(book => `
        <div class="col-md-4 mb-3">
          <div class="book-card">
            <img src="../assets/images/${book.cover || 'default-book.jpg'}" alt="Book Cover">
            <div class="book-info">
              <div class="book-title">${book.TITLE}</div>
              <div class="book-author">${book.author}</div>
              <div class="book-genre">${book.GENRE}</div>
            </div>
          </div>
        </div>
      `).join("");

      container.innerHTML = `<h5>Liked Books</h5><div class="row">${booksHtml}</div>`;
    } catch (err) {
      console.error(err);
    }
  }

  // Edit button click
  btnEdit.addEventListener("click", e => {
    e.preventDefault();

    infoFields.forEach(field => {
        if (field.dataset.field === "memberSince") return; // 🔒 protect it

        field.classList.add("d-none");
        const input = field.parentNode.querySelector("input, select");
        if (input) input.classList.remove("d-none");
    });

    btnEdit.classList.add("d-none");
    btnSave.classList.remove("d-none");
    });


  // Save button click
  btnSave.addEventListener("click", async e => {
  e.preventDefault();
  const updatedData = {};

  infoFields.forEach(field => {
    if (field.dataset.field === "memberSince") return; // 🔒 protect it

    const input = field.parentNode.querySelector("input, select");
    if (input) updatedData[field.dataset.field] = input.value;
  });

  try {
    const res = await fetch(`http://127.0.0.1:3000/api/profile/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedData)
    });

    if (!res.ok) throw new Error("Failed to save profile");

    infoFields.forEach(field => {
      const key = field.dataset.field;

      if (key === "memberSince") return; // 🔒 protect it

      field.textContent = updatedData[key] || "-";
      field.classList.remove("d-none");

      const input = field.parentNode.querySelector("input, select");
      if (input) input.classList.add("d-none");
    });

    btnEdit.classList.remove("d-none");
    btnSave.classList.add("d-none");
    alert("Profile updated successfully!");
  } catch (err) {
    console.error(err);
    alert("Failed to update profile");
  }
});


  fetchProfile();
  fetchLikedBooks();
});
