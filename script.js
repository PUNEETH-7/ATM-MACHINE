// API base URL
const API_BASE_URL = 'http://localhost:5500';

// Function to toggle between login and registration forms
function toggleForms() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    loginForm.classList.toggle('hidden');
    registerForm.classList.toggle('hidden');
}

// Function to handle login
async function login(event) {
    event.preventDefault();
    
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!username || !password) {
        alert('Please enter both username and password');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('userId', data.userId);
            localStorage.setItem('username', data.username);
            window.location.href = 'dashboard.html';
        } else {
            alert(data.message || 'Login failed');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred during login. Please try again.');
    }
}

// Function to handle registration
async function register(event) {
    event.preventDefault();
    
    const fullName = document.getElementById('fullName').value.trim();
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value;
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();

    // Client-side validation
    if (!fullName || !username || !password || !email || !phone) {
        alert('All fields are required');
        return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('Please enter a valid email address');
        return;
    }

    // Validate phone number (10 digits)
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone.replace(/[-\s]/g, ''))) {
        alert('Please enter a valid 10-digit phone number');
        return;
    }

    // Validate password strength
    if (password.length < 8) {
        alert('Password must be at least 8 characters long');
        return;
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
        alert('Password must contain at least one uppercase letter, one lowercase letter, and one number');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fullName,
                username,
                password,
                email,
                phone
            })
        });

        const data = await response.json();
        
        if (response.ok) {
            alert('Registration successful! Please login.');
            toggleForms();
            // Clear form fields
            document.getElementById('fullName').value = '';
            document.getElementById('regUsername').value = '';
            document.getElementById('regPassword').value = '';
            document.getElementById('email').value = '';
            document.getElementById('phone').value = '';
        } else {
            alert(data.message || 'Registration failed. Please try again.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred during registration. Please try again.');
    }
}

// Function to download transaction report
async function downloadTransactionReport() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/transactions/report`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'transaction_report.pdf';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } else {
            alert('Failed to download report');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while downloading the report');
    }
}
