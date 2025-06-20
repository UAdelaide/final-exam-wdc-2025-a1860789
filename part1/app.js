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
    try {
        db = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'DogWalkService'
        });

        await db.execute('SET FOREIGN_KEY_CHECKS = 0;');
        await db.execute('TRUNCATE TABLE WalkRequests;');
        await db.execute('TRUNCATE TABLE Dogs;');
        await db.execute('TRUNCATE TABLE Users;');
        await db.execute('SET FOREIGN_KEY_CHECKS = 1;');

        await db.execute(`
            INSERT INTO Users (user_id, username, email, password_hash, role, created_at) VALUES
            (1, 'alice123', 'alice@example.com', 'hashed123', 'owner', '2025-06-20 02:14:29'),
            (2, 'bobwalker', 'bob@example.com', 'hashed456', 'walker', '2025-06-20 02:14:29'),
            (3, 'carol123', 'carol@example.com', 'hashed789', 'owner', '2025-06-20 02:14:29'),
            (4, 'naruto_doggo', 'naruto@example.com', 'hashed721', 'walker', '2025-06-20 02:14:29'),
            (5, 'hitana_owner', 'hitana@example.com', 'hashed684', 'owner', '2025-06-20 02:23:55');
        `);

        await db.execute(`
            INSERT INTO Dogs (dog_id, owner_id, name, size) VALUES
            (1, 1, 'Max', 'medium'),
            (2, 3, 'Bella', 'small'),
            (3, 5, 'Shikamaru', 'large'),
            (4, 1, 'Kiba', 'small'),
            (5, 3, 'Akamaru', 'medium');
        `);

        await db.execute(`
            INSERT INTO WalkRequests (dog_id, requested_time, duration_minutes, location, status, created_at) VALUES
            (1, '2025-06-10 08:00:00', 30, 'Parklands', 'open', '2025-06-20 10:00:00'),
            (2, '2025-06-10 09:30:00', 45, 'Beachside Ave', 'accepted', '2025-06-20 10:01:00'),
            (3, '2025-06-11 07:15:00', 60, 'North Adelaide', 'open', '2025-06-20 10:02:00'),
            (4, '2025-06-10 18:00:00', 30, 'Clarence Park', 'completed', '2025-06-20 10:03:00'),
            (5, '2025-06-12 10:00:00', 20, 'Pasadena', 'completed', '2025-06-20 10:04:00');
        `);

    } catch (err) {
        console.error('Error connecting to or initializing database:', err);
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
                const year = d.getFullYear();
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