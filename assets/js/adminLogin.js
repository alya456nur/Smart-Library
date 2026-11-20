/* =========================================
   LOGIN FORM
========================================= */

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById('adminLoginForm');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('ID').value.trim();
    const password = document.getElementById('password').value;

    try {
      const res = await fetch('http://127.0.0.1:3000/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // important for session
        body: JSON.stringify({ id, password })
      });

      const data = await res.json();

      if (res.ok) {
        alert('Login successful');
        window.location.href = 'adminDashboard.html'; // redirect after login
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
      alert('Login failed. Try again.');
    }
  });
});