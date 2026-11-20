// admin-profile.js (ADMIN SIDE)

let ORIGINAL = null;

document.addEventListener("DOMContentLoaded", async () => {
  // ✅ Must be logged in as librarian (admin side)
  const librarian = await window.getSessionUser(); // from your public.js (admin-session)
  if (!librarian) return;

  // Load librarian profile from DB using session librarian id
  await loadProfile(librarian.id);

  // Wire buttons (in case you remove onclick later)
  // document.querySelector("#btnSave")?.addEventListener("click", saveProfile);
  // document.querySelector("#btnReset")?.addEventListener("click", resetProfile);
});

function setForm(data) {
    document.getElementById("id").value = data.id || "";
    document.getElementById("fname").value = data.firstName || "";
    document.getElementById("lname").value = data.lastName || "";
    document.getElementById("contact").value = data.contact || "";
    document.getElementById("email").value = data.email || "";

    const genderEl = document.getElementById("gender");
    if (genderEl) 
        genderEl.value = data.gender.toUpperCase();


    // password field: keep empty (do not show hashed password)
    const passEl = document.getElementById("password");
    if (passEl) 
        passEl.value = "";
}

async function loadProfile(libId) {
  try {
    const res = await fetch(`http://127.0.0.1:3000/api/admin/profile/${libId}`, {
      credentials: "include"
    });

    if (!res.ok) {
      alert("Failed to load librarian profile.");
      return;
    }

    const data = await res.json();

    ORIGINAL = {
      id: data.id,
      firstName: data.firstName,
      lastName: data.lastName,
      gender: data.gender,
      contact: data.contact,
      email: data.email
    };

    setForm(ORIGINAL);
  } catch (err) {
    console.error("Load profile error:", err);
    alert("Error loading profile.");
  }
}

// ✅ Save button (updates DB)
async function saveProfile() {
  const libId = document.getElementById("id").value.trim();
  const firstName = document.getElementById("fname").value.trim();
  const lastName = document.getElementById("lname").value.trim();
  const gender = document.getElementById("gender").value;
  const contact = document.getElementById("contact").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password")?.value || "";

  if (!firstName || !lastName) {
    alert("First Name and Last Name cannot be empty.");
    return;
  }

  try {
    const res = await fetch(`http://127.0.0.1:3000/api/admin/profile/${libId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        firstName,
        lastName,
        gender,
        contact,
        email,
        password // optional; server will ignore if empty
      })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Update failed.");
      return;
    }

    alert("Profile updated successfully!");

    // ✅ refresh ORIGINAL to new values (so Reset won't revert to old)
    ORIGINAL = { id: libId, firstName, lastName, gender, contact, email };
    setForm(ORIGINAL);
  } catch (err) {
    console.error("Save profile error:", err);
    alert("Error saving profile.");
  }
}

// ✅ Reset button (restore original fetched values)
function resetProfile() {
  if (!ORIGINAL) return;

  if (confirm("Are you sure you want to discard your changes and revert to the original details?")) {
    setForm(ORIGINAL);
  }
}
