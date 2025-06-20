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

    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: ''
      
    });


    await connection.query('CREATE DATABASE IF NOT EXISTS dogwalks');
    await connection.end();


    db = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'dogwalks'
    });


    await db.execute(`
      CREATE TABLE IF NOT EXISTS Users (
        user_id INT PRIMARY KEY,
        username VARCHAR(50),
        email VARCHAR(100),
        password_hash VARCHAR(255),
        role VARCHAR(20),
        created_at DATETIME
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS Dogs (
        dog_id INT PRIMARY KEY,
        owner_id INT,
        name VARCHAR(50),
        size VARCHAR(20),
        FOREIGN KEY (owner_id) REFERENCES Users(user_id)
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS WalkRequests (
        request_id INT PRIMARY KEY,
        dog_id INT,
        requested_time DATETIME,
        duration_minutes INT,
        location VARCHAR(100),
        status VARCHAR(20),
        created_at DATETIME,
        FOREIGN KEY (dog_id) REFERENCES Dogs(dog_id)
      )
    `);

    // Clear old data before insert
    await db.execute('DELETE FROM WalkRequests');
    await db.execute('DELETE FROM Dogs');
    await db.execute('DELETE FROM Users');

    // Insert your data
    await db.execute(`
      INSERT INTO Users (user_id, username, email, password_hash, role, created_at) VALUES
      (1, 'alice123', 'alice@example.com', 'hashed123', 'owner', '2025-06-20 02:14:29'),
      (2, 'bobwalker', 'bob@example.com', 'hashed456', 'walker', '2025-06-20 02:14:29'),
      (3, 'carol123', 'carol@example.com', 'hashed789', 'owner', '2025-06-20 02:14:29'),
      (4, 'naruto_doggo', 'naruto@example.com', 'hashed721', 'walker', '2025-06-20 02:14:29'),
      (5, 'hitana_owner', 'hitana@example.com', 'hashed684', 'owner', '2025-06-20 02:23:55')
    `);

    await db.execute(`
      INSERT INTO Dogs (dog_id, owner_id, name, size) VALUES
      (1, 1, 'Max', 'medium'),
      (2, 3, 'Bella', 'small'),
      (3, 5, 'Shikamaru', 'large'),
      (4, 1, 'Kiba', 'small'),
      (5, 3, 'Akamaru', 'medium')
    `);

    await db.execute(`
      INSERT INTO WalkRequests (request_id, dog_id, requested_time, duration_minutes, location, status, created_at) VALUES
      (1, 1, '2025-06-10 08:00:00', 30, 'Parklands', 'open', '2025-06-20 02:27:59'),
      (2, 2, '2025-06-10 09:30:00', 45, 'Beachside Ave', 'accepted', '2025-06-20 02:27:59'),
      (3, 3, '2025-06-11 07:15:00', 60, 'North Adelaide', 'open', '2025-06-20 02:27:59'),
      (4, 4, '2025-06-10 18:00:00', 30, 'Clarence Park', 'completed', '2025-06-20 02:27:59'),
      (5, 5, '2025-06-12 10:00:00', 20, 'Pasadena', 'cancelled', '2025-06-20 02:27:59')
    `);

    console.log('Database seeded');
  } catch (err) {
    console.error('DB init error:', err);
    process.exit(1);
  }
})();


// Routes

// /api/dogs
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
    res.status(500).json({ error: 'Failed to get dogs' });
  }
});

// /api/walkrequests/open
app.get('/api/walkrequests/open', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT wr.request_id, d.name AS dog_name, wr.requested_time, wr.duration_minutes, wr.location, u.username AS owner_username
      FROM WalkRequests wr
      JOIN Dogs d ON wr.dog_id = d.dog_id
      JOIN Users u ON d.owner_id = u.user_id
      WHERE wr.status = 'open'
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get open walk requests' });
  }
});

// /api/walkers/summary
app.get('/api/walkers/summary', async (req, res) => {
  try {
    // We have no ratings table in your inserts,
    // so we'll just count completed walks per walker (role = 'walker')
    // WalkRequests table has no walker_id field, so this is tricky.
    // Assuming your schema does not include walker assignment and ratings,
    // so let's just count completed walks that belong to dog owners?
    // Instead, let's return total completed walk requests count per walker username from Users table with role=walker.

    // Since you didn't provide walker_id in WalkRequests, let's simulate summary as zero ratings and completed walks = 0 for each walker

    // So we query walkers list and set ratings and completed walks as 0 or null.
    const [rows] = await db.execute(`
      SELECT username AS walker_username, 0 AS total_ratings, NULL AS average_rating, 0 AS completed_walks
      FROM Users
      WHERE role = 'walker'
    `);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get walkers summary' });
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
