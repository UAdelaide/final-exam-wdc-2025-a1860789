const express = require('express');
const path = require('path');
const mysql = require('mysql2/promise');
const session = require('express-session');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();

// Database connection pool setup (ensure your .env is configured)
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Core Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'a_very_secret_key_for_development',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24
    }
}));


// LOGIN ROUTE (uses bcrypt)
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    let connection;
    try {
        connection = await pool.getConnection();
        const [rows] = await connection.execute(
            'SELECT user_id, username, password_hash, role FROM Users WHERE username = ?',
            [username]
        );

        if (rows.length > 0) {
            const user = rows[0];
            const passwordMatch = await bcrypt.compare(password, user.password_hash); // <-- Uses bcrypt.compare

            if (passwordMatch) {
                req.session.userId = user.user_id;
                req.session.username = user.username;
                req.session.userRole = user.role;

                if (user.role === 'owner') {
                    res.redirect('/owner-dashboard.html');
                } else if (user.role === 'walker') {
                    res.redirect('/walker-dashboard.html');
                } else {
                    res.redirect('/?error=' + encodeURIComponent('Unknown user role.'));
                }
            } else {
                res.redirect('/?error=' + encodeURIComponent('Invalid username or password.'));
            }
        } else {
            res.redirect('/?error=' + encodeURIComponent('Invalid username or password.'));
        }
    } catch (error) {
        console.error('Login error:', error);
        res.redirect('/?error=' + encodeURIComponent('An error occurred during login.'));
    } finally {
        if (connection) connection.release();
    }
});

// LOGOUT ROUTE (CHANGED TO POST AND SENDS JSON RESPONSE)
app.post('/logout', (req, res) => { // Changed from app.get to app.post
    req.session.destroy(err => {
        if (err) {
            console.error('Error destroying session:', err);
            // Send a 500 error response if session destruction fails
            return res.status(500).json({ message: 'Could not log out due to server error.' });
        }
        // The client-side page.js will handle the redirect after this successful JSON response
        res.status(200).json({ message: 'Logged out successfully.' });
    });
});


// Serve static files
app.use(express.static(path.join(__dirname, '/public')));

// API Routes
const walkRoutes = require('./routes/walkRoutes');
const userRoutes = require('./routes/userRoutes');

app.use('/api/walks', walkRoutes);
app.use('/api/users', userRoutes);


module.exports = app;