# ATM Machine Project

A full-stack ATM application built with Node.js, Express, MySQL, and vanilla JavaScript.

## Features

- User Registration and Authentication
- Secure Login with JWT
- Account Balance Management
- Deposit and Withdrawal Operations
- Transaction History
- Responsive Dashboard

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express
- **Database**: MySQL
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: bcrypt for password hashing

## Setup Instructions

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure MySQL:
   - Create a MySQL database
   - Update database configuration in `server.js`

3. Start the server:
   ```bash
   node server.js
   ```

4. Access the application:
   - Open `index.html` in your browser
   - Server runs on `http://localhost:5500`

## Database Schema

### Users Table
- user_id (Primary Key)
- full_name
- username (Unique)
- password_hash
- email (Unique)
- phone
- balance
- created_at

### Transactions Table
- transaction_id (Primary Key)
- user_id (Foreign Key)
- type (deposit/withdraw)
- amount
- transaction_date

## Security Features

- Password Hashing
- JWT Authentication
- SQL Injection Prevention
- Input Validation
- Secure Session Management

## API Endpoints

- POST `/api/register` - User registration
- POST `/api/login` - User login
- GET `/api/dashboard` - Get user dashboard data
- POST `/api/transaction` - Handle deposits and withdrawals

## Contributing

Feel free to fork this repository and submit pull requests.

## License

MIT License
