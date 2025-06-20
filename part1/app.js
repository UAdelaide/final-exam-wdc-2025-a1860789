var express = require('express');
var mysql = require('mysql2/promise');
var logger = require('morgan');

var app = express();

app.use(logger('dev'));
app.use(express.json());

let db;

(async () => {
  try {
    // Connect to MySQL server (no DB yet)
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: ''  // put your password here
    });

    // Create the dogwalks database if not exists
    await connection.query('CREATE DATABASE IF NOT EXISTS dogwalks');
    await connection.end();

    // Connect to the dogwalks database
    db = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'dogwalks'
    });

    // Create tables (simplified)
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
        dog_name VARCHAR(50),
        size VARCHAR(20),
        owner_id INT,
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
        walker_id INT,
        FOREIGN KEY (dog_id) REFERENCES Dogs(dog_id),
        FOREIGN KEY (walker_id) REFERENCES Users(user_id)
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS WalkRatings (
        rating_id INT PRIMARY KEY,
        walker_id INT,
        rating INT,
        FOREIGN KEY (walker_id) REFERENCES Users(user_id)
      )
    `);

    // Clear existing data
    await db.execute('DELETE FROM WalkRatings');
    await db.execute('DELETE FROM WalkRequests');
    await db.execute('DELETE FROM Dogs');
    await db.execute('DELETE FROM Users');

    // Insert seed data
    await db.execute(`
      INSERT INTO Users (user_id, username, email, password_hash, role, created_at) VALUES
      (1, 'alice123', 'alice@example.com', 'hashed123', 'owner', NOW()),
      (2, 'bobwalker', 'bob@example.com', 'hashed456', 'walker', NOW()),
      (3, 'carol123', 'carol@example.com', 'hashed789', 'owner', NOW()),
      (4, 'newwalker', 'newwalker@example.com', 'hashed000', 'walker', NOW())
    `);

    await db.execute(`
      INSERT INTO Dogs (dog_id, dog_name, size, owner_id) VALUES
      (1, 'Max', 'medium', 1),
      (2, 'Bella', 'small', 3)
    `);

    await db.execute(`
      INSERT INTO WalkRequests (request_id, dog_id, requested_time, duration_minutes, location, status, created_at, walker_id) VALUES
      (1, 1, '2025-06-10 08:00:00', 30, 'Parklands', 'open', NOW(), NULL),
      (2, 2, '2025-06-11 09:00:00', 45, 'Central Park', 'completed', NOW(), 2),
      (3, 1, '2025-06-12 10:00:00', 20, 'Riverside', 'completed', NOW(), 2)
    `);

    await db.execute(`
      INSERT INTO WalkRatings (rating_id, walker_id, rating) VALUES
      (1, 2, 5),
      (2, 2, 4)
    `);

    console.log('Database ready and seeded.');
  } catch (err) {
    console.error('Database setup failed:', err);
    process.exit(1);
  }
})();

// ROUTES

app.get('/api/dogs', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT d.dog_name, d.size, u.username AS owner_username
      FROM Dogs d
      JOIN Users u ON d.owner_id = u.user_id
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve dogs' });
  }
});

app.get('/api/walkrequests/open', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT wr.request_id, d.dog_name, wr.requested_time, wr.duration_minutes, wr.location, u.username AS owner_username
      FROM WalkRequests wr
      JOIN Dogs d ON wr.dog_id = d.dog_id
      JOIN Users u ON d.owner_id = u.user_id
      WHERE wr.status = 'open'
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve open walk requests' });
  }
});

app.get('/api/walkers/summary', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT
        u.username AS walker_username,
        COUNT(wr.rating) AS total_ratings,
        AVG(wr.rating) AS average_rating,
        COALESCE(completed.completed_count, 0) AS completed_walks
      FROM Users u
      LEFT JOIN WalkRatings wr ON u.user_id = wr.walker_id
      LEFT JOIN (
        SELECT walker_id, COUNT(*) AS completed_count
        FROM WalkRequests
        WHERE status = 'completed'
        GROUP BY walker_id
      ) completed ON u.user_id = completed.walker_id
      WHERE u.role = 'walker'
      GROUP BY u.user_id
    `);

    const result = rows.map(r => ({
      walker_username: r.walker_username,
      total_ratings: Number(r.total_ratings),
      average_rating: r.average_rating !== null ? parseFloat(r.average_rating) : null,
      completed_walks: Number(r.completed_walks)
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve walkers summary' });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
