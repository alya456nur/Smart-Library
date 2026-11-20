const mysql = require('mysql2');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Connect to database
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.connect(async (err) => {
  if (err) throw err;
  console.log('Connected to DB');

  // Get all librarians
  db.query('SELECT LIB_ID, LIB_PASSWORD FROM LIBRARIAN', async (err, results) => {
    if (err) throw err;

    for (const librarian of results) {
      // Hash each password
      const hashed = await bcrypt.hash(librarian.LIB_PASSWORD, 10);

      db.query(
        'UPDATE LIBRARIAN SET LIB_PASSWORD = ? WHERE LIB_ID = ?',
        [hashed, librarian.LIB_ID],
        (err) => {
          if (err) console.error(err);
          else console.log(`Password hashed for librarian ${librarian.LIB_ID}`);
        }
      );
    }

    console.log('All librarian passwords hashed!');
    db.end();
  });
});
