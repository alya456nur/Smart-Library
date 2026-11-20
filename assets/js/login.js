// login.js - User Login Handler for SMART Library

// Main login function - handles everything
function login(event) {
    // Prevent form submission
    event.preventDefault();
    
    // Get form values
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    // Clear previous errors
    clearErrors();
    
    // Validate email format first
    if (!email) {
        showError('email', 'Email is required');
        return;
    }
    
    if (!isValidEmail(email)) {
        showError('email', 'Please enter a valid email address');
        return;
    }
    
    // Validate password
    if (!password) {
        showError('loginPassword', 'Password is required');
        return;
    }
    
    // Save remember me preference
    if (rememberMe) {
        localStorage.setItem('rememberEmail', email);
    } else {
        localStorage.removeItem('rememberEmail');
    }
    
    // Submit login
    submitLogin(email, password);
}

// Validate email format
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Clear all error messages
function clearErrors() {
    document.querySelectorAll('.error-message').forEach(el => el.remove());
    document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
}

// Show error message
function showError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    // Add error styling to input
    field.classList.add('is-invalid');
    
    // Check if error already exists
    const existingError = field.closest('.mb-2')?.querySelector('.error-message') || 
                          field.closest('.mb-3')?.querySelector('.error-message');
    if (existingError) {
        existingError.textContent = message;
        return;
    }
    
    // Create new error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message text-danger mt-2 small';
    errorDiv.textContent = message;
    
    // For password field - insert after the input group's parent div
    if (fieldId === 'loginPassword') {
        const inputGroup = field.closest('.input-group');
        if (inputGroup) {
            inputGroup.parentNode.appendChild(errorDiv);
        } else {
            field.parentNode.appendChild(errorDiv);
        }
    } else {
        // For other fields (email)
        field.parentNode.appendChild(errorDiv);
    }
}

// Submit login to server
async function submitLogin(email, password) {
    const submitBtn = document.querySelector('.register-submit-btn');
    const originalText = submitBtn.textContent;
    
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Signing In...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch('http://127.0.0.1:3000/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                email,
                password
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            if (response.ok) {
  // Login successful
  if (data.user) {
    localStorage.setItem('user', JSON.stringify(data.user));
  }
  
  // NO TIMEOUT - redirect immediately
  window.location.href = data.redirectTo || 'user_home.html';
}
            
        } else {
            // Handle different error cases
            if (response.status === 401) {
                document.getElementById('loginPassword').value = '';
                showError('loginPassword', 'Invalid password. Please try again.');
                document.getElementById('loginPassword').focus();
            } else if (response.status === 404) {
                showError('email', 'Email not found. Please register first.');
            } else {
                showError('email', data.message || 'Login failed. Please try again.');
            }
            
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
        
    } catch (error) {
        console.error('Login error:', error);
        showError('email', 'Cannot connect to server. Make sure server.js is running on localhost:3000');
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Initialize password visibility toggle
function initPasswordToggle() {
    document.querySelectorAll('.toggle-password').forEach(button => {
        button.addEventListener('click', function() {
            const passwordInput = document.getElementById('loginPassword');
            const icon = this.querySelector('i');
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.classList.remove('bi-eye');
                icon.classList.add('bi-eye-slash');
            } else {
                passwordInput.type = 'password';
                icon.classList.remove('bi-eye-slash');
                icon.classList.add('bi-eye');
            }
        });
    });
}

// Load remembered email
function loadRememberedEmail() {
    const rememberedEmail = localStorage.getItem('rememberEmail');
    if (rememberedEmail) {
        document.getElementById('email').value = rememberedEmail;
        document.getElementById('rememberMe').checked = true;
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    initPasswordToggle();
    loadRememberedEmail();
    
    const form = document.getElementById('login-form');
    if (form) {
        form.addEventListener('submit', login);
    }
    
    if (!document.getElementById('email').value) {
        document.getElementById('email').focus();
    }
});

// Add this function to login.js
async function keepSessionAlive() {
  try {
    await fetch('http://127.0.0.1:3000/api/check_session', {
      credentials: 'include'
    });
  } catch (error) {
    console.error('Keep-alive failed:', error);
  }
}

// Start keep-alive every 10 minutes after login
if (data.user) {
  localStorage.setItem('user', JSON.stringify(data.user));
  sessionStorage.setItem('loggedIn', 'true');
  
  // Start keep-alive interval
  setInterval(keepSessionAlive, 10 * 60 * 1000);
  
  setTimeout(() => {
    window.location.href = data.redirectTo || 'user_home.html';
  }, 1000);
}