// register.js - User Registration Handler for SMART Library

// Main registration function
function register(event) {
    // Prevent form submission
    event.preventDefault();
    
    // Get form values
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const gender = document.getElementById('gender').value;
    const contact = document.getElementById('contact').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const termsCheckbox = document.getElementById('termsCheckbox').checked;
    
    // Clear previous errors
    clearErrors();
    
    // Validate all fields
    if (!validateAllFields(firstName, lastName, gender, contact, email, password, confirmPassword, termsCheckbox)) {
        return;
    }
    
    // Submit registration
    submitRegistration(firstName, lastName, gender, contact, email, password);
}

// Validate all form fields
function validateAllFields(firstName, lastName, gender, contact, email, password, confirmPassword, termsChecked) {
    let isValid = true;
    
    // Check required fields
    if (!firstName) {
        showError('firstName', 'First name is required');
        isValid = false;
    }
    
    if (!lastName) {
        showError('lastName', 'Last name is required');
        isValid = false;
    }
    
    if (!gender || gender === "") {
        showError('gender', 'Please select your gender');
        isValid = false;
    }
    
    if (!contact) {
        showError('contact', 'Contact number is required');
        isValid = false;
    }
    
    if (!email) {
        showError('email', 'Email address is required');
        isValid = false;
    } else if (!isValidEmail(email)) {
        showError('email', 'Please enter a valid email address');
        isValid = false;
    }
    
    if (!password) {
        showError('password', 'Password is required');
        isValid = false;
    } else if (password.length < 6) {
        showError('password', 'Password must be at least 6 characters');
        isValid = false;
    }
    
    if (!confirmPassword) {
        showError('confirmPassword', 'Please confirm your password');
        isValid = false;
    } else if (password !== confirmPassword) {
        showError('password', 'Passwords do not match');
        showError('confirmPassword', 'Passwords do not match');
        isValid = false;
    }
    
    if (!termsChecked) {
        showTermsError('You must agree to the Terms of Service and Privacy Policy');
        isValid = false;
    }
    
    return isValid;
}

// Validate email format
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Clear all error messages
function clearErrors() {
    // Remove error messages
    document.querySelectorAll('.error-message').forEach(el => el.remove());
    
    // Remove error styling
    document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    
    // Remove terms error
    const termsError = document.querySelector('.form-check .error-message');
    if (termsError) termsError.remove();
}

// Show error message for specific field
function showError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    // Add error styling
    field.classList.add('is-invalid');
    
    // Check if error already exists
    const existingError = field.parentNode.querySelector('.error-message');
    if (existingError) {
        existingError.textContent = message;
        return;
    }
    
    // Create new error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message text-danger mt-1 small';
    errorDiv.textContent = message;
    
    // Insert error message
    if (field.type === 'password' && field.nextElementSibling) {
        // For password fields with toggle button
        field.parentNode.insertBefore(errorDiv, field.nextElementSibling.nextSibling);
    } else {
        field.parentNode.appendChild(errorDiv);
    }
}

// Show terms error
function showTermsError(message) {
    const termsGroup = document.querySelector('.form-check');
    if (!termsGroup) return;
    
    // Check if error already exists
    const existingError = termsGroup.querySelector('.error-message');
    if (existingError) {
        existingError.textContent = message;
        return;
    }
    
    // Create new error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message text-danger mt-2 small';
    errorDiv.textContent = message;
    termsGroup.appendChild(errorDiv);
}

// Show success message
function showSuccess(message) {
    // Remove any existing success messages
    const existingSuccess = document.querySelector('.success-message');
    if (existingSuccess) existingSuccess.remove();
    
    // Create success message
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message alert alert-success alert-dismissible fade show mt-3';
    successDiv.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="bi bi-check-circle-fill me-2"></i>
            <div>${message}</div>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Insert success message before the form
    const form = document.getElementById('register-form');
    form.parentNode.insertBefore(successDiv, form);
}

// Submit registration to server
async function submitRegistration(fname, lname, gender, contact, email, password) {
    const submitBtn = document.querySelector('.register-submit-btn');
    const originalText = submitBtn.textContent;
    
    // Show loading state
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating Account...';
    submitBtn.disabled = true;
    
    try {
        // Call your server.js /register endpoint
        const response = await fetch('http://127.0.0.1:3000/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                fname,
                lname,
                gender,
                contact,
                email,
                password
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Success - show message and redirect
            showSuccess('Registration successful! You will be redirected to the login page in 3 seconds.');
            
            // Store user info in localStorage if needed
            localStorage.setItem('registeredEmail', email);
            
            // Redirect to login page after 3 seconds
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 3000);
            
        } else {
            // Handle server errors
            if (data.message && data.message.includes('already exists')) {
                showError('email', 'This email is already registered. Please sign in instead.');
            } else {
                showError('email', data.message || 'Registration failed. Please try again.');
            }
            
            // Reset button
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
        
    } catch (error) {
        console.error('Registration error:', error);
        
        // Check if server is running
        showError('email', 'Cannot connect to server. Make sure the server is running on localhost:3000');
        
        // Reset button
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Initialize password visibility toggle
function initPasswordToggle() {
    document.querySelectorAll('.toggle-password').forEach(button => {
        button.addEventListener('click', function() {
            const inputGroup = this.closest('.input-group');
            const passwordInput = inputGroup.querySelector('.password-input');
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

// Initialize form when page loads
document.addEventListener('DOMContentLoaded', function() {
    
    // Initialize password toggle
    initPasswordToggle();
    
    // Attach form submit handler
    const form = document.getElementById('register-form');
    if (form) {
        form.addEventListener('submit', register);
    }
    
    // Auto-focus on first field
    document.getElementById('firstName')?.focus();
});