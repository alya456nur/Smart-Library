const mysql = require('mysql2');
const bcrypt = require('bcrypt');
require('dotenv').config();

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.connect(async (err) => {
  if (err) throw err;
  console.log('Connected to DB');

  // Get all users
  db.query('SELECT USER_ID, USER_PASSWORD FROM USERS', async (err, results) => {
    if (err) throw err;

    for (const user of results) {
      const hashed = await bcrypt.hash(user.USER_PASSWORD, 10);
      db.query('UPDATE USERS SET USER_PASSWORD = ? WHERE USER_ID = ?', [hashed, user.USER_ID], (err) => {
        if (err) console.error(err);
        else console.log(`Password hashed for user ${user.USER_ID}`);
      });
    }

    console.log('All passwords hashed!');
    db.end();
  });
});
