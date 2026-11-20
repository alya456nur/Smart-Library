// forgot-password.js - RESET PASSWORD FOR SPECIFIC EMAIL
document.addEventListener('DOMContentLoaded', function() {
    const forgotForm = document.getElementById('forgot-form');
    const emailInput = document.getElementById('email');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const submitBtn = forgotForm.querySelector('.register-submit-btn');
    const togglePasswordBtns = document.querySelectorAll('.toggle-password');
    
    // Toggle password visibility
    togglePasswordBtns.forEach(button => {
        button.addEventListener('click', function() {
            const input = this.parentElement.querySelector('.password-input');
            const icon = this.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('bi-eye');
                icon.classList.add('bi-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('bi-eye-slash');
                icon.classList.add('bi-eye');
            }
        });
    });
    
    // Set minimum length for passwords
    newPasswordInput.setAttribute('minlength', '6');
    confirmPasswordInput.setAttribute('minlength', '6');
    
    // Form submission
    forgotForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = emailInput.value.trim();
        const newPassword = newPasswordInput.value.trim();
        const confirmPassword = confirmPasswordInput.value.trim();
        
        // VALIDATION 1: Check email
        if (!email) {
            alert('❌ Please enter your email address');
            emailInput.focus();
            return;
        }
        
        if (!isValidEmail(email)) {
            alert('❌ Please enter a valid email address');
            emailInput.focus();
            emailInput.select();
            return;
        }
        
        // VALIDATION 2: Check password length
        if (newPassword.length < 6) {
            alert('❌ Password must be at least 6 characters long');
            newPasswordInput.focus();
            return;
        }
        
        // VALIDATION 3: Check if passwords match
        if (newPassword !== confirmPassword) {
            alert('❌ Passwords do not match! Please check and try again.');
            confirmPasswordInput.focus();
            confirmPasswordInput.select();
            return;
        }
        
        // Show loading state
        const originalText = submitBtn.textContent;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Updating...';
        submitBtn.disabled = true;
        
        try {
            
            // First check if email exists in either USERS or LIBRARIANS table
            const checkResponse = await fetch('http://127.0.0.1:3000/api/check-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: email })
            });
            
            const checkData = await checkResponse.json();
            
            if (!checkData.exists) {
                // Email not found
                alert(`❌ Email "${email}" not found in our system.\n\nPlease check your email address or register for a new account.`);
                
                // Reset button
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
                return;
            }
            
            // Email exists, now reset password for that specific email
            const resetResponse = await fetch('http://127.0.0.1:3000/api/reset-password-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email,
                    newPassword: newPassword,
                    userType: checkData.userType  // 'user' or 'librarian'
                })
            });
            
            const resetData = await resetResponse.json();
            
            if (resetResponse.ok && resetData.success) {
                // SUCCESS
                alert(`✅ Password updated successfully!\n\nEmail: ${email}\nAccount Type: ${checkData.userType}\n\nYou can now login with your new password.\n\nRedirecting to login page...`);
                
                // Clear the form
                forgotForm.reset();
                
                // Redirect to login page after 3 seconds
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 3000);
                
            } else {
                // ERROR
                alert(`❌ Failed to update password: ${resetData.message || 'Unknown error'}`);
                
                // Reset button
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
            
        } catch (error) {
            console.error('Network error:', error);
            
            // Check if server is running
            try {
                const serverCheck = await fetch('http://127.0.0.1:3000/api/check-server');
                if (!serverCheck.ok) throw new Error('Server not responding');
            } catch (serverError) {
                alert('❌ Server connection failed!\n\nMake sure your server is running:\n1. Open terminal\n2. Run: node server.js\n3. Server should be at http://127.0.0.1:3000');
            }
            
            // Show generic error
            alert('❌ Network error. Please check your connection and try again.');
            
            // Reset button
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
    
    // Helper function to validate email
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    // Optional: Real-time password matching indicator
    function checkPasswordMatch() {
        const newPass = newPasswordInput.value;
        const confirmPass = confirmPasswordInput.value;
        
        if (newPass && confirmPass) {
            if (newPass === confirmPass && newPass.length >= 6) {
                newPasswordInput.style.borderColor = '#28a745';
                confirmPasswordInput.style.borderColor = '#28a745';
            } else {
                newPasswordInput.style.borderColor = '#dc3545';
                confirmPasswordInput.style.borderColor = '#dc3545';
            }
        } else {
            newPasswordInput.style.borderColor = '';
            confirmPasswordInput.style.borderColor = '';
        }
    }
    
    // Add real-time checking
    newPasswordInput.addEventListener('input', checkPasswordMatch);
    confirmPasswordInput.addEventListener('input', checkPasswordMatch);
    
    // Also check on page load
    setTimeout(checkPasswordMatch, 100);
});