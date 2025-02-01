const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 5500;

// Middleware configuration
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// Database configuration
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'PUni8971@',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

let pool;

// Initialize database
async function initializeDatabase() {
    try {
        // Create a connection without database
        const initialConnection = await mysql.createConnection({
            host: dbConfig.host,
            user: dbConfig.user,
            password: dbConfig.password
        });

        // Create database if it doesn't exist
        await initialConnection.query('CREATE DATABASE IF NOT EXISTS atm_db');
        console.log('Database created or already exists');
        await initialConnection.end();

        // Create connection pool with database selected
        pool = mysql.createPool({
            ...dbConfig,
            database: 'atm_db'
        });

        // Get a connection from the pool
        const connection = await pool.getConnection();

        try {
            // Create Users table if it doesn't exist
            await connection.query(`
                CREATE TABLE IF NOT EXISTS Users (
                    user_id INT PRIMARY KEY AUTO_INCREMENT,
                    full_name VARCHAR(100) NOT NULL,
                    username VARCHAR(50) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    email VARCHAR(100) UNIQUE NOT NULL,
                    phone VARCHAR(20) NOT NULL,
                    balance DECIMAL(10,2) DEFAULT 0.00,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);
            console.log('Users table verified successfully');

            // Create Transactions table if it doesn't exist
            await connection.query(`
                CREATE TABLE IF NOT EXISTS Transactions (
                    transaction_id INT PRIMARY KEY AUTO_INCREMENT,
                    user_id INT NOT NULL,
                    type VARCHAR(20) NOT NULL,
                    amount DECIMAL(10,2) NOT NULL,
                    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES Users(user_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);
            console.log('Transactions table verified successfully');
        } finally {
            connection.release();
        }

        console.log('Database initialization completed successfully');
    } catch (error) {
        console.error('Database initialization error:', error);
        throw error;
    }
}

// Initialize the database
initializeDatabase().catch(console.error);

// JWT secret key
const JWT_SECRET = 'your_jwt_secret';

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: 'Access denied' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid token' });
        req.user = user;
        next();
    });
};

// Register endpoint
app.post('/api/register', async (req, res) => {
    let connection;
    try {
        console.log('Registration attempt:', req.body);
        const { fullName, username, password, email, phone } = req.body;
        
        // Validate input
        if (!fullName || !username || !password || !email || !phone) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Invalid email format' });
        }

        // Validate phone number
        const phoneRegex = /^\d{10}$/;
        if (!phoneRegex.test(phone.replace(/[-\s]/g, ''))) {
            return res.status(400).json({ message: 'Invalid phone number. Please enter 10 digits' });
        }

        // Validate password strength
        if (password.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters long' });
        }
        
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
            return res.status(400).json({ 
                message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' 
            });
        }

        // Get a connection from the pool
        connection = await pool.getConnection();
        
        // Check if username or email exists
        const [existingUsers] = await connection.query(
            'SELECT username, email FROM Users WHERE username = ? OR email = ?',
            [username, email]
        );
        
        if (existingUsers.length > 0) {
            const isDuplicateUsername = existingUsers.some(user => user.username === username);
            const isDuplicateEmail = existingUsers.some(user => user.email === email);
            
            if (isDuplicateUsername && isDuplicateEmail) {
                return res.status(400).json({ message: 'Both username and email are already in use' });
            } else if (isDuplicateUsername) {
                return res.status(400).json({ message: 'Username is already taken' });
            } else {
                return res.status(400).json({ message: 'Email is already registered' });
            }
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Insert new user
        const [result] = await connection.query(
            'INSERT INTO Users (full_name, username, password_hash, email, phone) VALUES (?, ?, ?, ?, ?)',
            [fullName, username, passwordHash, email, phone]
        );
        
        console.log('User registered successfully:', result.insertId);
        res.status(201).json({ 
            message: 'User registered successfully',
            userId: result.insertId
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }

        const connection = await pool.getConnection();
        try {
            const [users] = await connection.query(
                'SELECT * FROM Users WHERE username = ?',
                [username]
            );

            if (users.length === 0) {
                return res.status(401).json({ message: 'Invalid username or password' });
            }

            const user = users[0];
            const validPassword = await bcrypt.compare(password, user.password_hash);

            if (!validPassword) {
                return res.status(401).json({ message: 'Invalid username or password' });
            }

            const token = jwt.sign(
                { userId: user.user_id, username: user.username },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.json({ 
                message: 'Login successful',
                token,
                userId: user.user_id,
                username: user.username
            });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Dashboard endpoint
app.get('/api/dashboard', authenticateToken, async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        
        // Get user data
        const [userData] = await connection.query(
            'SELECT user_id, full_name, username, email, phone, balance FROM Users WHERE user_id = ?',
            [req.user.userId]
        );

        if (userData.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Get recent transactions
        const [transactions] = await connection.query(
            'SELECT * FROM Transactions WHERE user_id = ? ORDER BY transaction_date DESC LIMIT 5',
            [req.user.userId]
        );

        res.json({
            user: userData[0],
            recentTransactions: transactions
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// Transaction endpoint
app.post('/api/transaction', authenticateToken, async (req, res) => {
    let connection;
    try {
        const { type, amount } = req.body;
        const userId = req.user.userId;

        // Validate input
        if (!type || !amount || isNaN(amount) || amount <= 0) {
            return res.status(400).json({ message: 'Invalid transaction details' });
        }

        if (!['deposit', 'withdraw'].includes(type)) {
            return res.status(400).json({ message: 'Invalid transaction type' });
        }

        const parsedAmount = parseFloat(amount);

        connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Get current balance
            const [balanceResult] = await connection.query(
                'SELECT balance FROM Users WHERE user_id = ? FOR UPDATE',
                [userId]
            );

            if (balanceResult.length === 0) {
                await connection.rollback();
                return res.status(404).json({ message: 'User not found' });
            }

            const currentBalance = parseFloat(balanceResult[0].balance);

            // Check if sufficient balance for withdrawal
            if (type === 'withdraw' && currentBalance < parsedAmount) {
                await connection.rollback();
                return res.status(400).json({ message: 'Insufficient balance' });
            }

            // Calculate new balance
            const newBalance = type === 'deposit' 
                ? currentBalance + parsedAmount
                : currentBalance - parsedAmount;

            // Update user balance
            await connection.query(
                'UPDATE Users SET balance = ? WHERE user_id = ?',
                [newBalance.toFixed(2), userId]
            );

            // Record transaction
            await connection.query(
                'INSERT INTO Transactions (user_id, type, amount) VALUES (?, ?, ?)',
                [userId, type, parsedAmount.toFixed(2)]
            );

            await connection.commit();

            res.json({
                message: 'Transaction successful',
                newBalance: newBalance,
                transactionType: type,
                amount: parsedAmount
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        }
    } catch (error) {
        console.error('Transaction error:', error);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// Transaction report endpoint
app.get('/api/transactions/report', authenticateToken, async (req, res) => {
    try {
        // Get user details
        const [users] = await pool.query(
            'SELECT full_name, username FROM Users WHERE user_id = ?',
            [req.user.userId]
        );

        // Get all transactions
        const [transactions] = await pool.query(
            'SELECT type, amount, transaction_date FROM Transactions WHERE user_id = ? ORDER BY transaction_date DESC',
            [req.user.userId]
        );

        // Generate PDF
        const doc = new PDFDocument();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=transaction_report.pdf');
        doc.pipe(res);

        // Add content to PDF
        const user = users[0];
        doc.fontSize(20).text('Transaction Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`User: ${user.full_name} (${user.username})`);
        doc.moveDown();

        transactions.forEach(transaction => {
            doc.text(`${new Date(transaction.transaction_date).toLocaleString()} - ${transaction.type}: $${transaction.amount.toFixed(2)}`);
        });

        doc.end();
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
