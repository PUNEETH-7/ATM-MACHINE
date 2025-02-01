// API base URL
const API_BASE_URL = 'http://localhost:5500';

// Check if user is logged in
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'index.html';
    }
    return token;
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
    }).format(amount);
}

// Load dashboard data
async function loadDashboard() {
    const token = checkAuth();
    try {
        const response = await fetch(`${API_BASE_URL}/api/dashboard`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                // Token invalid or expired
                localStorage.removeItem('token');
                window.location.href = 'index.html';
                return;
            }
            throw new Error('Failed to load dashboard');
        }

        const data = await response.json();
        
        // Update user info
        document.getElementById('userName').textContent = data.user.full_name;
        document.getElementById('userBalance').textContent = formatCurrency(data.user.balance);
        document.getElementById('userEmail').textContent = data.user.email;
        document.getElementById('userPhone').textContent = data.user.phone;

        // Update transaction history
        const transactionList = document.getElementById('transactionList');
        transactionList.innerHTML = '';

        if (data.recentTransactions.length === 0) {
            transactionList.innerHTML = '<tr><td colspan="4" class="text-center">No transactions found</td></tr>';
        } else {
            data.recentTransactions.forEach(transaction => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${formatDate(transaction.transaction_date)}</td>
                    <td>${transaction.type}</td>
                    <td>${formatCurrency(transaction.amount)}</td>
                    <td class="${transaction.type === 'deposit' ? 'text-success' : 'text-danger'}">
                        ${transaction.type === 'deposit' ? '+' : '-'}${formatCurrency(Math.abs(transaction.amount))}
                    </td>
                `;
                transactionList.appendChild(row);
            });
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
        alert('Failed to load dashboard data. Please try again.');
    }
}

// Handle deposit
async function handleDeposit(event) {
    event.preventDefault();
    const amount = document.getElementById('depositAmount').value;
    await handleTransaction('deposit', amount);
}

// Handle withdrawal
async function handleWithdrawal(event) {
    event.preventDefault();
    const amount = document.getElementById('withdrawAmount').value;
    await handleTransaction('withdraw', amount);
}

// Handle transaction
async function handleTransaction(type, amount) {
    const token = checkAuth();
    try {
        if (!amount || isNaN(amount) || amount <= 0) {
            alert('Please enter a valid amount');
            return;
        }

        const response = await fetch(`${API_BASE_URL}/api/transaction`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ type, amount: parseFloat(amount) })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Transaction failed');
        }

        // Update the balance immediately
        document.getElementById('userBalance').textContent = formatCurrency(data.newBalance);
        
        // Clear the input field
        document.getElementById(`${type}Amount`).value = '';
        
        // Reload dashboard to update transaction history
        loadDashboard();

        alert('Transaction successful!');
    } catch (error) {
        console.error('Transaction error:', error);
        alert(error.message || 'Failed to process transaction. Please try again.');
    }
}

// Handle logout
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    window.location.href = 'index.html';
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();
    
    // Add event listeners
    document.getElementById('depositForm').addEventListener('submit', handleDeposit);
    document.getElementById('withdrawForm').addEventListener('submit', handleWithdrawal);
    document.getElementById('logoutBtn').addEventListener('click', logout);
});
