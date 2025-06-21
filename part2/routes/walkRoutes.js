const express = require('express');
const router = express.Router();
const db = require('../models/db');

// GET walk requests
router.get('/', async (req, res) => {
  let connection;
  try {
    connection = await db.getConnection();
    const userId = req.session.userId;
    const userRole = req.session.role;

    let query = `
      SELECT wr.*, d.name AS dog_name, d.size, u.username AS owner_name
      FROM WalkRequests wr
      JOIN Dogs d ON wr.dog_id = d.dog_id
      JOIN Users u ON d.owner_id = u.user_id
    `;
    let params = [];
    let whereClauses = ["wr.status = 'open'"];


    console.log('Fetching walks: userId =', userId, ', userRole =', userRole);


    if (userRole === 'owner' && userId) {
      // If the logged-in user is an owner, filter by their dogs' owner_id
      whereClauses.push('d.owner_id = ?');
      params.push(userId);
      console.log('Filtering walks for owner_id:', userId);
    }


    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
    }


    query += ' ORDER BY wr.requested_time DESC';

    console.log('Executing query:', query, 'with params:', params);
    const [rows] = await connection.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('SQL Error fetching walk requests:', error);
    res.status(500).json({ error: 'Failed to fetch walk requests' });
  } finally {
    if (connection) connection.release();
  }
});

// POST a new walk request (from owner)
router.post('/', async (req, res) => {
  const { dog_id, requested_time, duration_minutes, location } = req.body;
  const ownerId = req.session.userId; // Get ownerId from session

  if (!ownerId) {
    return res.status(401).json({ error: 'Unauthorized: Owner ID not found in session' });
  }

  let connection;
  try {
    connection = await db.getConnection();

    // Verify dog_id belongs to the logged-in owner
    const [dogRows] = await connection.execute('SELECT dog_id FROM Dogs WHERE dog_id = ? AND owner_id = ?', [dog_id, ownerId]);
    if (dogRows.length === 0) {
      return res.status(403).json({ error: 'Dog does not belong to the logged-in owner.' });
    }

    const [result] = await connection.execute(`
      INSERT INTO WalkRequests (dog_id, requested_time, duration_minutes, location, owner_id, status)
      VALUES (?, ?, ?, ?, ?, 'open')
    `, [dog_id, requested_time, duration_minutes, location, ownerId]); // Include owner_id and default status

    res.status(201).json({ message: 'Walk request created', request_id: result.insertId });
  } catch (error) {
    console.error('Error creating walk request:', error);
    res.status(500).json({ error: 'Failed to create walk request' });
  } finally {
    if (connection) connection.release();
  }
});

// POST an application to walk a dog (from walker)
router.post('/:id/apply', async (req, res) => {
  const requestId = req.params.id;
  const { walker_id } = req.body;

  let connection;
  try {
    connection = await db.getConnection();
    await connection.execute(`
      INSERT INTO WalkApplications (request_id, walker_id)
      VALUES (?, ?)
    `, [requestId, walker_id]);

    await connection.execute(`
      UPDATE WalkRequests
      SET status = 'pending'
      WHERE request_id = ?
    `, [requestId]);

    res.status(200).json({ message: 'Application submitted successfully' });
  } catch (error) {
    console.error('Error applying to walk:', error);
    res.status(500).json({ error: 'Failed to apply to walk' });
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;