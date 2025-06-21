var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mysql = require('mysql2/promise');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

let db;

(async () => {
    let connectionToCreateDB;
    try {
        connectionToCreateDB = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: ''
        });

        const dbName = 'DogWalkService';
        await connectionToCreateDB.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
        console.log(`Database '${dbName}' ensured to exist.`);

    } catch (err) {
        console.error('Error connecting to MySQL or creating database. Ensure MySQL server is running and credentials are correct:', err);
        process.exit(1);
    } finally {
        if (connectionToCreateDB) {
            await connectionToCreateDB.end();
        }
    }

    try {
        db = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'DogWalkService'
        });
        console.log('Successfully connected to DogWalkService database.');

        await db.execute(`
            CREATE TABLE IF NOT EXISTS Users (
                user_id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) NOT NULL UNIQUE,
                email VARCHAR(255) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                role ENUM('owner', 'walker') NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await db.execute(`
            CREATE TABLE IF NOT EXISTS Dogs (
                dog_id INT AUTO_INCREMENT PRIMARY KEY,
                owner_id INT NOT NULL,
                name VARCHAR(255) NOT NULL,
                size ENUM('small', 'medium', 'large') NOT NULL,
                FOREIGN KEY (owner_id) REFERENCES Users(user_id)
            )
        `);
        await db.execute(`
            CREATE TABLE IF NOT EXISTS WalkRequests (
                request_id INT PRIMARY KEY AUTO_INCREMENT,
                dog_id INT NOT NULL,
                requested_time DATETIME NOT NULL,
                duration_minutes INT NOT NULL,
                location VARCHAR(255) NOT NULL,
                status ENUM('open', 'accepted', 'completed', 'cancelled') NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (dog_id) REFERENCES Dogs(dog_id)
            )
        `);
        await db.execute(`
            CREATE TABLE IF NOT EXISTS WalkApplications (
                application_id INT PRIMARY KEY AUTO_INCREMENT,
                request_id INT NOT NULL,
                walker_id INT NOT NULL,
                status ENUM('pending', 'accepted', 'rejected') NOT NULL,
                applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (request_id) REFERENCES WalkRequests(request_id),
                FOREIGN KEY (walker_id) REFERENCES Users(user_id)
            )
        `);
        await db.execute(`
            CREATE TABLE IF NOT EXISTS WalkRatings (
                rating_id INT PRIMARY KEY AUTO_INCREMENT,
                request_id INT NOT NULL UNIQUE,
                walker_id INT NOT NULL,
                owner_id INT NOT NULL,
                rating INT CHECK (rating BETWEEN 1 AND 5),
                comments TEXT,
                rated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (request_id) REFERENCES WalkRequests(request_id),
                FOREIGN KEY (walker_id) REFERENCES Users(user_id),
                FOREIGN KEY (owner_id) REFERENCES Users(user_id)
            )
        `);
        console.log('Database tables ensured to exist.');

        const [userRows] = await db.execute('SELECT COUNT(*) AS count FROM Users');
        if (userRows[0].count === 0) {
            await db.execute('SET FOREIGN_KEY_CHECKS = 0;');

            
            await db.execute(`
                INSERT INTO Users (username, email, password_hash, role, created_at) VALUES
                ('alice123', 'alice@example.com', 'hashed123', 'owner', '2025-06-20 02:14:29'),
                ('bobwalker', 'bob@example.com', 'hashed456', 'walker', '2025-06-20 02:14:29'),
                ('carol123', 'carol@example.com', 'hashed789', 'owner', '2025-06-20 02:14:29'),
                ('naruto_doggo', 'naruto@example.com', 'hashed721', 'walker', '2025-06-20 02:14:29'),
                ('hitana_owner', 'hitana@example.com', 'hashed684', 'owner', '2025-06-20 02:23:55');
            `);
           
            await db.execute(`
                INSERT INTO Dogs (owner_id, name, size) VALUES
                (1, 'Max', 'medium'),
                (3, 'Bella', 'small'),
                (5, 'Shikamaru', 'large'),
                (1, 'Kiba', 'small'),
                (3, 'Akamaru', 'medium');
            `);
            await db.execute(`
                INSERT INTO WalkRequests (request_id, dog_id, requested_time, duration_minutes, location, status, created_at) VALUES
                (1, 1, '2025-06-10 08:00:00', 30, 'Parklands', 'open', '2025-06-20 10:00:00'),
                (2, 2, '2025-06-10 09:30:00', 45, 'Beachside Ave', 'accepted', '2025-06-20 10:01:00'),
                (3, 3, '2025-06-11 07:15:00', 60, 'North Adelaide', 'open', '2025-06-20 10:02:00'),
                (4, 4, '2025-06-10 18:00:00', 30, 'Clarence Park', 'completed', '2025-06-20 10:03:00'),
                (5, 5, '2025-06-12 10:00:00', 20, 'Pasadena', 'completed', '2025-06-20 10:04:00');
            `);
            await db.execute(`
                INSERT INTO WalkApplications (request_id, walker_id, status, applied_at) VALUES
                (4, 2, 'accepted', '2025-06-20 10:15:00'),
                (5, 4, 'accepted', '2025-06-20 10:16:00'),
                (2, 2, 'accepted', '2025-06-20 10:05:00'),
                (1, 4, 'pending', '2025-06-20 10:20:00'),
                (3, 2, 'pending', '2025-06-21 07:00:00');
            `);
            await db.execute(`
                INSERT INTO WalkRatings (request_id, walker_id, owner_id, rating, comments, rated_at) VALUES
                (4, 2, 1, 5, 'Kiba had a fantastic time with Bob!', '2025-06-20 18:30:00'),
                (5, 4, 3, 4, 'Akamaru was well looked after by Naruto.', '2025-06-20 11:00:00');
            `);
            await db.execute('SET FOREIGN_KEY_CHECKS = 1;');
            console.log('Initial sample data inserted into empty tables.');
        } else {
            console.log('Database already contains data, skipping initial insert.');
        }

    } catch (err) {
        console.error('Error setting up tables or inserting initial data:', err);
        process.exit(1);
    }
})();

app.get('/api/dogs', async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT d.name AS dog_name, d.size, u.username AS owner_username
            FROM Dogs d
            JOIN Users u ON d.owner_id = u.user_id
        `);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to get dogs data' });
    }
});

app.get('/api/walkrequests/open', async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT
                wr.request_id,
                d.name AS dog_name,
                wr.requested_time,
                wr.duration_minutes,
                wr.location,
                u.username AS owner_username
            FROM
                WalkRequests wr
            JOIN
                Dogs d ON wr.dog_id = d.dog_id
            JOIN
                Users u ON d.owner_id = u.user_id
            WHERE
                wr.status = 'open'
        `);

        const formattedRows = rows.map(row => {
            let dateStringFromDb = row.requested_time;

            if (dateStringFromDb instanceof Date) {
                const d = dateStringFromDb;
                const year = String(d.getFullYear());
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                const hours = String(d.getHours()).padStart(2, '0');
                const minutes = String(d.getMinutes()).padStart(2, '0');
                const seconds = String(d.getSeconds()).padStart(2, '0');
                dateStringFromDb = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
            }

            const requestedTimeAsUtc = new Date(`${dateStringFromDb.replace(' ', 'T')}Z`);

            return {
                ...row,
                requested_time: requestedTimeAsUtc.toISOString()
            };
        });

        res.json(formattedRows);

    } catch (err) {
        console.error('Error fetching open walk requests:', err);
        res.status(500).json({ error: 'Failed to get open walk requests' });
    }
});

app.get('/api/walkers/summary', async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT
                u.username AS walker_username,
                COALESCE(COUNT(wrg.rating_id), 0) AS total_ratings,
                CAST(COALESCE(AVG(wrg.rating), 0.0) AS DECIMAL(3, 1)) AS average_rating,
                COALESCE(COUNT(DISTINCT CASE WHEN wa.status = 'accepted' AND wr.status = 'completed' THEN wr.request_id ELSE NULL END), 0) AS completed_walks
            FROM
                Users u
            LEFT JOIN
                WalkApplications wa ON u.user_id = wa.walker_id
            LEFT JOIN
                WalkRequests wr ON wa.request_id = wr.request_id
            LEFT JOIN
                WalkRatings wrg ON u.user_id = wrg.walker_id
            WHERE
                u.role = 'walker'
            GROUP BY
                u.user_id, u.username
            ORDER BY
                u.username;
        `);

        res.json(rows);
    } catch (err) {
        console.error('Error fetching walkers summary:', err);
        res.status(500).json({ error: 'Failed to get walkers summary' });
    }
});

app.use(express.static(path.join(__dirname, 'public')));

module.exports = app;
