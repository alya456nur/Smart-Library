require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require("fs");
const multer = require('multer');
const path = require('path'); 
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// In server.js, change CORS to:
app.use(cors({
  origin: ['http://localhost:5500', 'http://127.0.0.1:5500'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

const uploadDir = path.join(__dirname, '../assets/images');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error("Invalid file type. Only images are allowed."), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

app.use('/assets/images', express.static(uploadDir));


// Session setup - SIMPLE VERSION
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 1000 * 60 * 60 * 24 * 7, // 1 WEEK
    httpOnly: true,
    secure: false, // MUST BE FALSE for localhost
    sameSite: 'lax'
  }
}));

app.use((req, res, next) => {
  if (req.session.user || req.session.librarian) {
    // Refresh session on activity
    req.session.touch();
  }
  next();
});

// SETUP GEMINI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
    model: "gemini-3-flash-preview",
    generationConfig: { responseMimeType: "application/json" } // Force JSON output
});

// MySQL connection
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10, 
  queueLimit: 0
});

// Optional: test pool on startup
db.getConnection((err, conn) => {
  if (err) {
    console.error("❌ MySQL pool error:", err.message);
  } else {
    console.log("✅ MySQL pool connected");
    syncOverdueFines();
    conn.release();
  }
});

// FIX FOR LOCALHOST COOKIE ISSUE
app.use((req, res, next) => {
  // Set cookie headers explicitly
  if (req.session) {
    req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 7; // 1 week
  }
  next();
});


/*<------------------------------------------------------[USER]---------------------------------------------------------------------->*/



// ===== LOGIN ROUTE ===== (UPDATED VERSION)
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

  const query = 'SELECT * FROM USERS WHERE USER_EMAIL = ?';
  db.query(query, [email], async (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });

    if (results.length === 0) {
      return res.status(404).json({ message: 'Email not found. Please register first.' });
    }

    const user = results[0];

    const match = await bcrypt.compare(password, user.USER_PASSWORD);
    if (!match) {
      return res.status(401).json({ message: 'Invalid password. Please try again.' });
    }

    // Store user info in session
    req.session.user = {
      id: user.USER_ID,
      name: user.USER_FNAME,
      email: user.USER_EMAIL
    };

    // Save session explicitly with callback
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ message: 'Session error' });
      }
      
      // Send session ID in response for debugging
      res.json({ 
        message: 'Login successful', 
        user: req.session.user,
        sessionId: req.sessionID, // For debugging
        redirectTo: 'user_home.html'
      });
    });
  });
});

// ===== SESSION CHECK =====
app.get('/api/check_session', (req, res) => {
  if (req.session.user) {
    // Update session timestamp
    req.session.touch();
    res.json({ 
      loggedIn: true, 
      user: req.session.user,
      sessionId: req.sessionID 
    });
  } else {
    res.json({ loggedIn: false });
  }
});


// ===== LOGOUT ROUTE =====
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ message: 'Logout error', error: err });
    res.clearCookie('connect.sid'); // clear session cookie
    res.json({ message: 'Logged out successfully' });
  });
});

/*<------------------------------------------------------[FORGOT PASSWORD - SPECIFIC EMAIL]---------------------------------------------------------------------->*/

// ===== CHECK EMAIL EXISTS =====
app.post('/api/check-email', (req, res) => {
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({ 
            exists: false, 
            message: 'Email is required' 
        });
    }
    
    
    // Check in USERS table
    const userSql = 'SELECT USER_ID, USER_EMAIL FROM USERS WHERE USER_EMAIL = ?';
    db.query(userSql, [email], (err, userResults) => {
        if (err) {
            console.error('Database error (USERS):', err);
            return res.status(500).json({ 
                exists: false, 
                message: 'Database error checking users' 
            });
        }
        
        if (userResults.length > 0) {
            return res.json({ 
                exists: true, 
                userType: 'user',
                userId: userResults[0].USER_ID,
                email: userResults[0].USER_EMAIL,
                message: 'Email found in user database'
            });
        }
        
        // Check in LIBRARIAN table
        const librarianSql = 'SELECT LIB_ID, LIB_EMAIL FROM LIBRARIAN WHERE LIB_EMAIL = ?';
        db.query(librarianSql, [email], (err, libResults) => {
            if (err) {
                console.error('Database error (LIBRARIAN):', err);
                return res.status(500).json({ 
                    exists: false, 
                    message: 'Database error checking librarians' 
                });
            }
            
            if (libResults.length > 0) {
                return res.json({ 
                    exists: true, 
                    userType: 'librarian',
                    userId: libResults[0].LIB_ID,
                    email: libResults[0].LIB_EMAIL,
                    message: 'Email found in librarian database'
                });
            }
            
            // Email not found
            console.log('Email not found:', email);
            return res.json({ 
                exists: false, 
                message: 'Email not found in our system' 
            });
        });
    });
});

// ===== RESET PASSWORD FOR SPECIFIC EMAIL =====
app.post('/api/reset-password-email', async (req, res) => {
    const { email, newPassword, userType } = req.body;
    
    console.log('Reset password for email:', { email, userType });
    
    // Validation
    if (!email || !newPassword || !userType) {
        return res.status(400).json({ 
            success: false, 
            message: 'Email, new password, and user type are required' 
        });
    }
    
    if (newPassword.length < 6) {
        return res.status(400).json({ 
            success: false, 
            message: 'Password must be at least 6 characters' 
        });
    }
    
    if (userType !== 'user' && userType !== 'librarian') {
        return res.status(400).json({ 
            success: false, 
            message: 'Invalid user type' 
        });
    }
    
    try {
        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        let sql, params;
        
        if (userType === 'user') {
            sql = 'UPDATE USERS SET USER_PASSWORD = ? WHERE USER_EMAIL = ?';
            params = [hashedPassword, email];
        } else {
            sql = 'UPDATE LIBRARIAN SET LIB_PASSWORD = ? WHERE LIB_EMAIL = ?';
            params = [hashedPassword, email];
        }
        
        db.query(sql, params, (err, result) => {
            if (err) {
                console.error('Error updating password:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Database error updating password',
                    error: err.message 
                });
            }
            
            if (result.affectedRows === 0) {
                console.log('No rows updated - email might not exist');
                return res.json({ 
                    success: false, 
                    message: 'Email not found or no changes made' 
                });
            }
            
            
            res.json({ 
                success: true, 
                message: 'Password updated successfully',
                email: email,
                userType: userType,
                affectedRows: result.affectedRows,
                timestamp: new Date().toISOString()
            });
        });
        
    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error',
            error: error.message 
        });
    }
});

// ===== SERVER STATUS CHECK =====
app.get('/api/check-server', (req, res) => {
    res.json({ 
        status: 'running', 
        timestamp: new Date().toISOString(),
        message: 'Server is running' 
    });
});


// ===== REGISTER ROUTE=====
app.post('/register', async (req, res) => {
  const { fname, lname, gender, contact, email, password } = req.body;

  if (!fname || !lname || !gender || !contact || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    // 1️⃣ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 2️⃣ Get last USER_ID
    const getLastIdSql = `
      SELECT USER_ID
      FROM USERS
      ORDER BY CAST(SUBSTRING(USER_ID, 2) AS UNSIGNED) DESC
      LIMIT 1
    `;

    db.query(getLastIdSql, (err, rows) => {
      if (err) {
        console.error("Fetch last USER_ID error:", err);
        return res.status(500).json({ message: "Database error" });
      }

      let nextNumber = 1;

      if (rows.length > 0 && rows[0].USER_ID) {
        const lastNum = parseInt(rows[0].USER_ID.substring(1), 10);
        if (!isNaN(lastNum)) nextNumber = lastNum + 1;
      }

      // ✅ U001, U002, ...
      const userId = "U" + String(nextNumber).padStart(3, "0");

      // 3️⃣ Insert new user
      const insertSql = `
        INSERT INTO USERS
          (USER_ID, USER_FNAME, USER_LNAME, USER_GENDER, USER_CONTACT, USER_EMAIL, USER_PASSWORD)
        VALUES
          (?, ?, ?, ?, ?, ?, ?)
      `;

      db.query(
        insertSql,
        [userId, fname, lname, gender, contact, email, hashedPassword],
        (err2) => {
          if (err2) {
            if (err2.code === 'ER_DUP_ENTRY') {
              return res.status(400).json({ message: 'Email already exists' });
            }

            console.error("Insert user error:", err2);
            return res.status(500).json({ message: 'Database error' });
          }

          res.json({
            message: 'Registration successful',
            userId
          });
        }
      );
    });

  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Server error" });
  }
});



/* =====================================================
   GET BOOKS (ALL + SEARCH + FILTER)
===================================================== */
app.get("/api/books", (req, res) => {
  const { search = "", genre = "" } = req.query;

  let sql = `
    SELECT 
      b.BOOK_ID,
      b.TITLE,
      b.GENRE,
      b.DESCRIPTION,
      b.PUBLISHER,
      b.ISBN,
      b.PUBLICATION_DATE,
      b.BOOK_STATUS,
      b.BOOK_IMAGE,
      a.AUTHOR_NAME
    FROM BOOK b
    JOIN AUTHOR a ON b.AUTHOR_ID = a.AUTHOR_ID
    WHERE 1=1
  `;

  const params = [];

  if (search) {
    sql += `
      AND (
        b.TITLE LIKE ?
        OR a.AUTHOR_NAME LIKE ?
        OR b.ISBN LIKE ?
      )
    `;
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  if (genre && genre !== "All") {
    sql += ` AND b.GENRE = ?`;
    params.push(genre);
  }

  db.query(sql, params, (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

/* ======================================================
   GET SINGLE BOOK (FOR BORROW MODAL)
====================================================== */
app.get("/api/books/:bookId", (req, res) => {
  const bookId = req.params.bookId;

  const sql = `
    SELECT 
      b.BOOK_ID,
      b.TITLE,
      b.GENRE,
      b.PUBLISHER,
      b.ISBN,
      b.DESCRIPTION,
      b.BOOK_STATUS,
      b.BOOK_IMAGE,
      a.AUTHOR_NAME
    FROM BOOK b
    JOIN AUTHOR a ON b.AUTHOR_ID = a.AUTHOR_ID
    WHERE b.BOOK_ID = ?
    LIMIT 1
  `;

  db.query(sql, [bookId], (err, results) => {
    if (err) {
      console.error("Book fetch error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "Book not found" });
    }

    res.json(results[0]);
  });
});



/* ======================================================
   USER SUMMARY CARDS (DATABASE-DRIVEN)
====================================================== */
app.get("/api/summary/user/:userId", (req, res) => {
  const userId = req.params.userId;

  const sql = `
    SELECT
      -- Available books in library
      (SELECT COUNT(*)
       FROM BOOK
       WHERE BOOK_STATUS = 'Available'
      ) AS availableBooks,

      -- Currently borrowed by user
      (SELECT COUNT(*)
       FROM BORROW b
       JOIN REQUEST r ON b.REQUEST_ID = r.REQUEST_ID
       WHERE r.USER_ID = ?
         AND b.BORROW_STATUS = 'Borrowed'
      ) AS currentlyBorrowed,

      -- ✅ Overdue books (by status, NOT date)
      (SELECT COUNT(*)
       FROM BORROW b
       JOIN REQUEST r ON b.REQUEST_ID = r.REQUEST_ID
       WHERE r.USER_ID = ?
         AND b.BORROW_STATUS = 'Overdue'
      ) AS overdueBooks,

      -- Current unpaid fines (user)
      (SELECT IFNULL(SUM(f.AMOUNT), 0)
       FROM FINE f
       JOIN BORROW b ON f.BORROW_ID = b.BORROW_ID
       JOIN REQUEST r ON b.REQUEST_ID = r.REQUEST_ID
       WHERE r.USER_ID = ?
         AND f.FINE_STATUS = 'Unpaid'
      ) AS currentFines,

      -- Requests
      (SELECT COUNT(*)
       FROM REQUEST
       WHERE USER_ID = ?
         AND REQUEST_STATUS = 'Pending'
      ) AS pendingRequests,

      (SELECT COUNT(*)
       FROM REQUEST
       WHERE USER_ID = ?
         AND REQUEST_STATUS = 'Approved'
      ) AS approvedRequests,

      (SELECT COUNT(*)
       FROM REQUEST
       WHERE USER_ID = ?
         AND REQUEST_STATUS = 'Rejected'
      ) AS rejectedRequests
  `;

  db.query(
    sql,
    [userId, userId, userId, userId, userId, userId],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result[0]);
    }
  );
});


/* ======================================================
   UNPAID FINES
====================================================== */
app.get("/api/fines/unpaid/:userId", (req, res) => {
  const userId = req.params.userId;

  const sql = `
    SELECT
      f.FINE_ID,
      f.AMOUNT,
      f.FINE_TYPE,
      f.ISSUED_DATE,
      b.BORROW_ID,
      bk.TITLE
    FROM FINE f
    JOIN BORROW b ON f.BORROW_ID = b.BORROW_ID
    JOIN REQUEST r ON b.REQUEST_ID = r.REQUEST_ID
    JOIN BOOK bk ON r.BOOK_ID = bk.BOOK_ID
    WHERE r.USER_ID = ?
      AND f.FINE_STATUS = 'Unpaid'
  `;

  db.query(sql, [userId], (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});


/* ======================================================
   PAID FINES
====================================================== */
app.get("/api/fines/paid/:userId", (req, res) => {
  const userId = req.params.userId;

  const sql = `
    SELECT
      f.FINE_ID,
      f.AMOUNT,
      f.FINE_TYPE,
      f.ISSUED_DATE,
      b.BORROW_ID,
      bk.TITLE,
      r.PAY_DATE AS PAYMENT_DATE,
      r.PAY_METHOD AS METHOD
    FROM FINE f
    JOIN BORROW b ON f.BORROW_ID = b.BORROW_ID
    JOIN REQUEST req ON b.REQUEST_ID = req.REQUEST_ID
    JOIN BOOK bk ON req.BOOK_ID = bk.BOOK_ID
    JOIN RECEIPT r ON r.FINE_ID = f.FINE_ID
    WHERE req.USER_ID = ?
      AND f.FINE_STATUS = 'Paid'
    ORDER BY r.PAY_DATE DESC;
  `;

  db.query(sql, [userId], (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});



/* =====================================================
   CREATE BORROW REQUEST
===================================================== */
app.post("/api/request-borrow", (req, res) => {
  const { userId, bookId } = req.body;

  // 1️⃣ Check existing pending request
  const checkSql = `
    SELECT REQUEST_ID
    FROM REQUEST
    WHERE USER_ID = ?
      AND BOOK_ID = ?
      AND REQUEST_STATUS = 'PENDING'
    LIMIT 1
  `;

  db.query(checkSql, [userId, bookId], (err, rows) => {
    if (err) return res.status(500).json({ msg: "Server error" });

    if (rows.length > 0) {
      return res.status(400).json({
        msg: "You already have a pending request for this book."
      });
    }

    /* 2️⃣ Generate next Q00n REQUEST_ID */
    const getLastSql = `
      SELECT REQUEST_ID
      FROM REQUEST
      ORDER BY CAST(SUBSTRING(REQUEST_ID, 2) AS UNSIGNED) DESC
      LIMIT 1
    `;

    db.query(getLastSql, (err2, rows2) => {
      if (err2) return res.status(500).json({ msg: "ID generation failed" });

      let next = 1;

      if (rows2.length > 0 && rows2[0].REQUEST_ID) {
        next = parseInt(rows2[0].REQUEST_ID.substring(1)) + 1;
      }

      const requestId = "Q" + String(next).padStart(3, "0");  // Q001, Q002, Q003...

      /* 3️⃣ Insert request */
      const insertSql = `
        INSERT INTO REQUEST
          (REQUEST_ID, USER_ID, BOOK_ID, REQUEST_STATUS, REQUEST_DATE)
        VALUES
          (?, ?, ?, 'PENDING', CURDATE())
      `;

      db.query(insertSql, [requestId, userId, bookId], err3 => {
        if (err3) {
          console.error("Insert request error:", err3);
          return res.status(500).json({ msg: "Borrow failed" });
        }

        res.json({
          msg: "Borrow request submitted",
          requestId
        });
      });
    });
  });
});




/* =====================================================
   GET USER FAVOURITES
===================================================== */
app.get("/api/favourite/:userId", (req, res) => {
  const { userId } = req.params;

  const sql = `
    SELECT BOOK_ID
    FROM FAVOURITE
    WHERE USER_ID = ?
  `;

  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).json(err);

    // Return only book IDs
    const favBookIds = results.map(r => r.BOOK_ID);
    res.json(favBookIds);
  });
});


/* =====================================================
   ADD TO FAVOURITE + INCREMENT BOOK.TOT_FAV
===================================================== */
app.post("/api/favourite/add", (req, res) => {
  const { userId, bookId } = req.body;

  if (!userId || !bookId) {
    return res.status(400).json({
      success: false,
      msg: "userId and bookId are required"
    });
  }

  // ✅ get a single connection from pool for transaction
  db.getConnection((connErr, conn) => {
    if (connErr) {
      console.error("DB getConnection error:", connErr);
      return res.status(500).json({ success: false, msg: "DB connection error" });
    }

    conn.beginTransaction((txErr) => {
      if (txErr) {
        console.error("beginTransaction error:", txErr);
        conn.release();
        return res.status(500).json({ success: false, msg: "DB transaction error" });
      }

      const rollback = (status, payload) => {
        conn.rollback(() => {
          conn.release();
          res.status(status).json(payload);
        });
      };

      const commit = (payload) => {
        conn.commit((cErr) => {
          if (cErr) {
            console.error("commit error:", cErr);
            return rollback(500, { success: false, msg: "Commit failed" });
          }
          conn.release();
          res.json(payload);
        });
      };

      // 1) Insert favourite
      const insSql = `INSERT INTO FAVOURITE (USER_ID, BOOK_ID) VALUES (?, ?)`;
      conn.query(insSql, [userId, bookId], (err2) => {
        if (err2) {
          // Duplicate favourite → no increment
          if (err2.code === "ER_DUP_ENTRY") {
            return rollback(400, { success: false, msg: "Already in favourite" });
          }
          console.error("Insert favourite error:", err2);
          return rollback(500, { success: false, msg: err2.message });
        }

        // 2) Increment TOT_FAV
        const updSql = `UPDATE BOOK SET TOT_FAV = TOT_FAV + 1 WHERE BOOK_ID = ?`;
        conn.query(updSql, [bookId], (err3, updRes) => {
          if (err3) {
            console.error("Update TOT_FAV error:", err3);
            return rollback(500, { success: false, msg: err3.message });
          }

          if (updRes.affectedRows === 0) {
            return rollback(404, { success: false, msg: "Book not found" });
          }

          // ✅ done
          return commit({ success: true, msg: "Added to favourite (+1)" });
        });
      });
    });
  });
});


/* =====================================================
   REMOVE FROM FAVOURITE + DECREMENT BOOK.TOT_FAV
===================================================== */
app.post("/api/favourite/remove", (req, res) => {
  const { userId, bookId } = req.body;

  if (!userId || !bookId) {
    return res.status(400).json({ success: false, msg: "userId and bookId are required" });
  }

  db.getConnection((connErr, conn) => {
    if (connErr) {
      return res.status(500).json({ success: false, msg: connErr.message });
    }

    conn.beginTransaction((txErr) => {
      if (txErr) {
        conn.release();
        return res.status(500).json({ success: false, msg: txErr.message });
      }

      const delSql = `DELETE FROM FAVOURITE WHERE USER_ID = ? AND BOOK_ID = ?`;

      conn.query(delSql, [userId, bookId], (err2, delRes) => {
        if (err2) {
          return conn.rollback(() => {
            conn.release();
            return res.status(500).json({ success: false, msg: err2.message });
          });
        }

        if (delRes.affectedRows === 0) {
          return conn.rollback(() => {
            conn.release();
            return res.status(400).json({ success: false, msg: "Favourite not found (nothing to remove)" });
          });
        }

        const updSql = `
          UPDATE BOOK
          SET TOT_FAV = CASE WHEN TOT_FAV > 0 THEN TOT_FAV - 1 ELSE 0 END
          WHERE BOOK_ID = ?
        `;

        conn.query(updSql, [bookId], (err3, updRes) => {
          if (err3) {
            return conn.rollback(() => {
              conn.release();
              return res.status(500).json({ success: false, msg: err3.message });
            });
          }

          if (updRes.affectedRows === 0) {
            return conn.rollback(() => {
              conn.release();
              return res.status(404).json({ success: false, msg: "Book not found" });
            });
          }

          conn.commit((err4) => {
            if (err4) {
              return conn.rollback(() => {
                conn.release();
                return res.status(500).json({ success: false, msg: err4.message });
              });
            }

            conn.release();
            return res.json({ success: true, msg: "Removed from favourite (-1)" });
          });
        });
      });
    });
  });
});


/* ==========================
   GET MY BORROWED BOOKS
========================== */
app.get("/api/my-books/:userId", (req, res) => {
  const userId = req.params.userId;

  const sql = `
    SELECT
      br.BORROW_ID,
      br.DATE_BORROWED,
      br.DUE_DATE,
      br.DATE_RETURN,
      br.BORROW_STATUS,

      b.BOOK_ID,
      b.TITLE,
      b.BOOK_IMAGE,
      b.GENRE,

      a.AUTHOR_NAME,

      f.AMOUNT AS FINE_AMOUNT,
      f.FINE_STATUS,

      r.REQUEST_DATE

    FROM BORROW br
    JOIN REQUEST r ON br.REQUEST_ID = r.REQUEST_ID
    JOIN BOOK b ON r.BOOK_ID = b.BOOK_ID
    JOIN AUTHOR a ON b.AUTHOR_ID = a.AUTHOR_ID
    LEFT JOIN FINE f ON br.BORROW_ID = f.BORROW_ID

    WHERE r.USER_ID = ?
    ORDER BY r.REQUEST_DATE DESC, br.DATE_BORROWED DESC, br.BORROW_STATUS ASC
  `;

  db.query(sql, [userId], (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

/* ==========================
   RETURN BOOK
========================== */
app.post("/api/return-book", (req, res) => {
  const { borrowId } = req.body;

  const sql = `
    UPDATE BORROW
    SET DATE_RETURN = CURDATE(),
        BORROW_STATUS = 'Returned'
    WHERE BORROW_ID = ?
  `;

  db.query(sql, [borrowId], err => {
    if (err) return res.status(500).json(err);
    res.json({ msg: "Book returned" });
  });
});

/* =====================================================
   GET USER REQUESTS (WITH BORROW INFO)
===================================================== */
app.get("/api/requests/:userId", (req, res) => {
  const userId = req.params.userId;

  const sql = `
    SELECT 
      req.REQUEST_ID,
      req.REQUEST_DATE,
      req.REQUEST_STATUS,

      b.TITLE,
      b.GENRE,
      b.BOOK_IMAGE AS cover,
      a.AUTHOR_NAME AS author,

      br.DATE_BORROWED,
      br.DUE_DATE,
      br.BORROW_STATUS

    FROM REQUEST req
    JOIN BOOK b ON req.BOOK_ID = b.BOOK_ID
    JOIN AUTHOR a ON b.AUTHOR_ID = a.AUTHOR_ID
    LEFT JOIN BORROW br ON br.REQUEST_ID = req.REQUEST_ID

    WHERE req.USER_ID = ?
    ORDER BY req.REQUEST_DATE DESC
  `;

  db.query(sql, [userId], (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

/* =====================================================
   ADD NEW REQUEST
===================================================== */
app.post("/api/requests", (req, res) => {
  const { userId, bookId } = req.body;
  const requestId = `Q${Date.now()}`; // simple ID generator
  const sql = `
    INSERT INTO REQUEST (REQUEST_ID, USER_ID, BOOK_ID)
    VALUES (?, ?, ?)
  `;
  db.query(sql, [requestId, userId, bookId], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ success: true, requestId });
  });
});


/* =====================================================
   check pending request
===================================================== */
app.get("/api/requests/pending/:userId/:bookId", (req, res) => {
  const { userId, bookId } = req.params;

  const sql = `
    SELECT 1
    FROM REQUEST
    WHERE USER_ID = ?
      AND BOOK_ID = ?
      AND REQUEST_STATUS = 'PENDING'
    LIMIT 1
  `;

  db.query(sql, [userId, bookId], (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json({ pending: rows.length > 0 });
  });
});

/* =====================================================
   GET USER PROFILE
===================================================== */
app.get("/api/profile/:userId", (req, res) => {
  const userId = req.params.userId;

  const sql = `
    SELECT USER_FNAME, USER_LNAME, USER_GENDER, USER_CONTACT, USER_EMAIL, USER_PASSWORD, USER_ID
    FROM USERS
    WHERE USER_ID = ?
  `;

  db.query(sql, [userId], (err, rows) => {
    if (err) return res.status(500).json(err);
    if (!rows.length) return res.status(404).json({ message: "User not found" });

    const user = rows[0];
    res.json({
      firstName: user.USER_FNAME,
      lastName: user.USER_LNAME,
      gender: user.USER_GENDER,
      contact: user.USER_CONTACT,
      email: user.USER_EMAIL,
      memberSince: "January 1, 2024" // static or fetch from registration date if available
    });
  });
});


/* =====================================================
   UPDATE PROFILE
===================================================== */
app.put("/api/profile/:userId", (req, res) => {
  const userId = req.params.userId;
  const { firstName, lastName, gender, contact, email } = req.body;
  const sql = `
    UPDATE USERS SET USER_FNAME=?, USER_LNAME=?, USER_GENDER=?, USER_CONTACT=?, USER_EMAIL=?
    WHERE USER_ID=?
  `;
  db.query(sql, [firstName, lastName, gender, contact, email, userId], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Profile updated" });
  });
});


/* =====================================================
   GET USER FAVOURITE BOOKS
===================================================== */
app.get("/api/profile/:userId/favourites", (req, res) => {
  const userId = req.params.userId;

  const sql = `
    SELECT b.BOOK_ID, b.TITLE, b.GENRE, b.BOOK_IMAGE AS cover, a.AUTHOR_NAME AS author
    FROM FAVOURITE f
    JOIN BOOK b ON f.BOOK_ID = b.BOOK_ID
    JOIN AUTHOR a ON b.AUTHOR_ID = a.AUTHOR_ID
    WHERE f.USER_ID = ?
  `;

  db.query(sql, [userId], (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

/* ======================================================
   USER PAY FINE (USER)
====================================================== */
app.post("/api/fines/pay", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "Not logged in." });
  }

  const userId = req.session.user.id;
  const { fineId, payMethod = "Cash" } = req.body;

  if (!fineId) return res.status(400).json({ message: "fineId is required" });

  /* 0️⃣ Verify fine belongs to user, unpaid, get type + borrow */
  const verifySql = `
    SELECT f.FINE_ID, f.FINE_TYPE, f.BORROW_ID
    FROM FINE f
    JOIN BORROW br ON f.BORROW_ID = br.BORROW_ID
    JOIN REQUEST r ON br.REQUEST_ID = r.REQUEST_ID
    WHERE f.FINE_ID = ?
      AND r.USER_ID = ?
      AND f.FINE_STATUS = 'Unpaid'
    LIMIT 1
  `;

  db.query(verifySql, [fineId, userId], (err, rows) => {
    if (err) {
      console.error("Verify fine error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    if (!rows.length) {
      return res.status(404).json({
        message: "Fine not found / not yours / already paid."
      });
    }

    const { FINE_TYPE, BORROW_ID } = rows[0];

    db.getConnection((connErr, conn) => {
      if (connErr) {
        console.error("Get connection error:", connErr);
        return res.status(500).json({ message: "DB connection error" });
      }

      conn.beginTransaction((txErr) => {
        if (txErr) {
          conn.release();
          return res.status(500).json({ message: "DB transaction error" });
        }

        const rollback = (cb) =>
          conn.rollback(() => { conn.release(); cb && cb(); });

        const commit = (cb) =>
          conn.commit((cErr) => {
            if (cErr) return rollback(() =>
              res.status(500).json({ message: "Commit failed" })
            );
            conn.release();
            cb && cb();
          });

        /* 1️⃣ Mark fine Paid */
        const updateFineSql = `
          UPDATE FINE
          SET FINE_STATUS = 'Paid'
          WHERE FINE_ID = ?
        `;

        conn.query(updateFineSql, [fineId], (err1) => {
          if (err1) {
            return rollback(() =>
              res.status(500).json({ message: "Failed to update fine status" })
            );
          }

          /* 2️⃣ Check receipt (idempotent) */
          const checkReceiptSql = `
            SELECT RECEIPT_ID
            FROM RECEIPT
            WHERE FINE_ID = ?
            LIMIT 1
          `;

          conn.query(checkReceiptSql, [fineId], (err2, rrows) => {
            if (err2) {
              return rollback(() =>
                res.status(500).json({ message: "Database error" })
              );
            }

            if (rrows.length > 0) {
              return commit(() =>
                res.json({
                  message: "Paid (receipt already exists)",
                  receiptId: rrows[0].RECEIPT_ID
                })
              );
            }

            /* 3️⃣ Generate RECEIPT_ID */
            const getLastReceiptSql = `
              SELECT RECEIPT_ID
              FROM RECEIPT
              ORDER BY CAST(SUBSTRING(RECEIPT_ID, 2) AS UNSIGNED) DESC
              LIMIT 1
            `;

            conn.query(getLastReceiptSql, (err3, lastRows) => {
              if (err3) {
                return rollback(() =>
                  res.status(500).json({ message: "Database error" })
                );
              }

              let nextNumber = 1;
              if (lastRows.length && lastRows[0].RECEIPT_ID) {
                const num = parseInt(lastRows[0].RECEIPT_ID.substring(1), 10);
                if (!isNaN(num)) nextNumber = num + 1;
              }

              const receiptId = "R" + String(nextNumber).padStart(3, "0");

              /* 4️⃣ Insert receipt */
              const insertReceiptSql = `
                INSERT INTO RECEIPT (RECEIPT_ID, FINE_ID, PAY_DATE, PAY_METHOD)
                VALUES (?, ?, CURDATE(), ?)
              `;

              conn.query(
                insertReceiptSql,
                [receiptId, fineId, payMethod],
                (err4) => {
                  if (err4) {
                    return rollback(() =>
                      res.status(500).json({ message: "Receipt insert failed" })
                    );
                  }

                  /* 5️⃣ IF Late Return → mark borrow Returned */
                  if (FINE_TYPE === "Late Return") {
                    const updateBorrowSql = `
                      UPDATE BORROW
                      SET BORROW_STATUS = 'Returned',
                          DATE_RETURN = CURDATE()
                      WHERE BORROW_ID = ?
                    `;

                    return conn.query(updateBorrowSql, [BORROW_ID], (err5) => {
                      if (err5) {
                        return rollback(() =>
                          res.status(500).json({
                            message: "Failed to update borrow status"
                          })
                        );
                      }

                      commit(() =>
                        res.json({
                          message: "Fine paid, borrow returned",
                          receiptId,
                          borrowId: BORROW_ID
                        })
                      );
                    });
                  }

                  /* Normal fine → just commit */
                  commit(() =>
                    res.json({ message: "Fine paid", receiptId })
                  );
                }
              );
            });
          });
        });
      });
    });
  });
});


/*<------------------------------------------------------[LIBRARIAN]---------------------------------------------------------------------->*/

// ===== LIBRARIAN LOGIN ROUTE =====
app.post('/admin-login', (req, res) => {
  const { id, password } = req.body;

  if (!id || !password) {
    return res.status(400).json({ message: 'ID and password are required' });
  }

  const query = 'SELECT * FROM LIBRARIAN WHERE LIB_ID = ?';
  db.query(query, [id], async (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });

    if (results.length === 0) {
      return res.status(401).json({ message: 'Invalid ID or password' });
    }

    const librarian = results[0];

    // Compare password (hashed)
    const match = await bcrypt.compare(password, librarian.LIB_PASSWORD);
    if (!match) return res.status(401).json({ message: 'Invalid ID or password' });

    // Create session for librarian
    req.session.librarian = {
      id: librarian.LIB_ID,
      name: librarian.LIB_FNAME,
      email: librarian.LIB_EMAIL
    };

    res.json({ message: 'Login successful', librarian: req.session.librarian });
  });
});


// ===== CHECK LIBRARIAN SESSION =====
app.get('/admin-session', (req, res) => {
  if (req.session.librarian) {
    res.json({ loggedIn: true, librarian: req.session.librarian });
  } else {
    res.json({ loggedIn: false });
  }
});

function requireAdmin(req, res, next) {
  if (!req.session.librarian) {
    return res.status(401).json({ message: "Not logged in (admin)." });
  }
  next();
}


/* =====================================================
   ADMIN DASHBOARD: SUMMARY + RECENTS
===================================================== */
app.get("/api/admin/dashboard", requireAdmin, (req, res) => {
  const sql = `
    SELECT
      -- Cards
      (SELECT COUNT(*) FROM BOOK) AS totalBooks,

      (SELECT COUNT(*)
       FROM BORROW
       WHERE BORROW_STATUS = 'Overdue'
      ) AS overdueBooks,

      (SELECT COUNT(*)
       FROM BORROW
       WHERE DATE_RETURN IS NULL
         AND DUE_DATE < CURDATE()
         AND BORROW_STATUS = 'Borrowed'
      ) AS overdueBooks,

      (SELECT COUNT(*)
       FROM REQUEST
       WHERE REQUEST_STATUS = 'Pending'
      ) AS pendingRequests
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error("Dashboard summary error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    const summary = rows[0] || {
      totalBooks: 0,
      borrowedToday: 0,
      overdueBooks: 0,
      pendingRequests: 0
    };

    // Recent borrowings (latest borrowed)
    const recentBorrowSql = `
      SELECT
        u.USER_ID,
        CONCAT(u.USER_FNAME, ' ', u.USER_LNAME) AS USER_NAME,
        b.TITLE AS BOOK_TITLE,
        br.DUE_DATE
      FROM BORROW br
      JOIN REQUEST r ON br.REQUEST_ID = r.REQUEST_ID
      JOIN USERS u ON r.USER_ID = u.USER_ID
      JOIN BOOK b ON r.BOOK_ID = b.BOOK_ID
      WHERE br.BORROW_STATUS = 'Borrowed'
      ORDER BY br.DATE_BORROWED DESC, br.BORROW_ID DESC
      LIMIT 6
    `;

    // Overdue list (latest overdue)
    const overdueListSql = `
      SELECT
        u.USER_ID,
        CONCAT(u.USER_FNAME, ' ', u.USER_LNAME) AS USER_NAME,
        b.TITLE AS BOOK_TITLE,
        br.DUE_DATE
      FROM BORROW br
      JOIN REQUEST r ON br.REQUEST_ID = r.REQUEST_ID
      JOIN USERS u ON r.USER_ID = u.USER_ID
      JOIN BOOK b ON r.BOOK_ID = b.BOOK_ID
      WHERE br.DATE_RETURN IS NULL
        AND br.DUE_DATE < CURDATE()
        AND br.BORROW_STATUS = 'Borrowed'
      ORDER BY br.DUE_DATE ASC
      LIMIT 6
    `;

    db.query(recentBorrowSql, (err2, recentRows) => {
      if (err2) {
        console.error("Dashboard recent borrow error:", err2);
        return res.status(500).json({ message: "Database error" });
      }

      db.query(overdueListSql, (err3, overdueRows) => {
        if (err3) {
          console.error("Dashboard overdue list error:", err3);
          return res.status(500).json({ message: "Database error" });
        }

        res.json({
          summary,
          recentBorrowings: recentRows || [],
          overdueBooks: overdueRows || []
        });
      });
    });
  });
});

/* =====================================================
   GET ALL BORROW_ID
===================================================== */
app.get("/api/admin/borrows", requireAdmin, (req, res) => {
  const sql = `
    SELECT
      br.BORROW_ID,
      br.REQUEST_ID,
      br.DATE_BORROWED,
      br.DUE_DATE,
      br.DATE_RETURN,
      br.BORROW_STATUS,

      r.USER_ID,
      CONCAT(u.USER_FNAME, ' ', u.USER_LNAME) AS USER_NAME,

      b.BOOK_ID,
      b.TITLE AS BOOK_TITLE,

      -- overdue flag
      CASE
        WHEN br.DATE_RETURN IS NULL
         AND br.DUE_DATE IS NOT NULL
         AND br.DUE_DATE < CURDATE()
         AND br.BORROW_STATUS = 'Borrowed'
        THEN 1 ELSE 0
      END AS IS_OVERDUE,

      -- latest fine (if any)
      f.FINE_STATUS,
      f.AMOUNT AS FINE_AMOUNT

    FROM BORROW br
    JOIN REQUEST r ON br.REQUEST_ID = r.REQUEST_ID
    JOIN USERS u ON r.USER_ID = u.USER_ID
    JOIN BOOK b ON r.BOOK_ID = b.BOOK_ID

    LEFT JOIN (
      SELECT f1.*
      FROM FINE f1
      JOIN (
        SELECT BORROW_ID, MAX(ISSUED_DATE) AS maxIssued
        FROM FINE
        GROUP BY BORROW_ID
      ) x ON x.BORROW_ID = f1.BORROW_ID AND x.maxIssued = f1.ISSUED_DATE
    ) f ON f.BORROW_ID = br.BORROW_ID

    ORDER BY br.DATE_BORROWED DESC, br.BORROW_ID DESC
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error("Borrow list error:", err);
      return res.status(500).json({ message: "Database error" });
    }
    res.json(rows || []);
  });
});

/* =====================================================
   GET BORROW LIST (Borrowed only)
===================================================== */
app.get("/api/admin/borrows/borrowed", requireAdmin, (req, res) => {
  const sql = `
    SELECT
      br.BORROW_ID,
      br.REQUEST_ID,
      br.DATE_BORROWED,
      br.DUE_DATE,
      br.DATE_RETURN,
      br.BORROW_STATUS,

      r.USER_ID,
      CONCAT(u.USER_FNAME, ' ', u.USER_LNAME) AS USER_NAME,

      b.BOOK_ID,
      b.TITLE AS BOOK_TITLE,

      -- overdue flag
      CASE
        WHEN br.DATE_RETURN IS NULL
         AND br.DUE_DATE IS NOT NULL
         AND br.DUE_DATE < CURDATE()
         AND br.BORROW_STATUS = 'Borrowed'
        THEN 1 ELSE 0
      END AS IS_OVERDUE,

      -- latest fine (if any)
      f.FINE_STATUS,
      f.AMOUNT AS FINE_AMOUNT

    FROM BORROW br
    JOIN REQUEST r ON br.REQUEST_ID = r.REQUEST_ID
    JOIN USERS u ON r.USER_ID = u.USER_ID
    JOIN BOOK b ON r.BOOK_ID = b.BOOK_ID

    LEFT JOIN (
      SELECT f1.*
      FROM FINE f1
      JOIN (
        SELECT BORROW_ID, MAX(ISSUED_DATE) AS maxIssued
        FROM FINE
        GROUP BY BORROW_ID
      ) x ON x.BORROW_ID = f1.BORROW_ID AND x.maxIssued = f1.ISSUED_DATE
    ) f ON f.BORROW_ID = br.BORROW_ID

    WHERE br.BORROW_STATUS = 'Borrowed'
    ORDER BY br.DATE_BORROWED DESC, br.BORROW_ID DESC
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error("Borrowed-only list error:", err);
      return res.status(500).json({ message: "Database error" });
    }
    res.json(rows || []);
  });
});


/* =====================================================
   GET SINGLE BORROW_ID
===================================================== */
app.get("/api/admin/borrows/:borrowId", requireAdmin, (req, res) => {
  const { borrowId } = req.params;

  const sql = `
    SELECT
      br.BORROW_ID,
      br.BORROW_STATUS,
      br.DATE_BORROWED,
      br.DUE_DATE,
      br.DATE_RETURN,

      r.USER_ID,
      CONCAT(u.USER_FNAME, ' ', u.USER_LNAME) AS USER_NAME,

      b.TITLE AS BOOK_TITLE
    FROM BORROW br
    JOIN REQUEST r ON br.REQUEST_ID = r.REQUEST_ID
    JOIN USERS u ON r.USER_ID = u.USER_ID
    JOIN BOOK b ON r.BOOK_ID = b.BOOK_ID
    WHERE br.BORROW_ID = ?
    LIMIT 1
  `;

  db.query(sql, [borrowId], (err, rows) => {
    if (err) {
      console.error("Borrow fetch error:", err);
      return res.status(500).json({ message: "Database error" });
    }
    if (!rows.length) return res.status(404).json({ message: "Borrow not found" });
    res.json(rows[0]);
  });
});

/* =====================================================
   UPDATE BORROW STATUS (+/- BOOK.TOT_BORROW)
===================================================== */
app.put("/api/admin/borrows/:borrowId/status", requireAdmin, (req, res) => {
  const { borrowId } = req.params;
  const { status } = req.body;

  if (!status) return res.status(400).json({ message: "status is required" });

  const newStatus = String(status).trim(); // "Borrowed", "Returned", "Lost", "Not Picked Up", "Ready for Pickup"
  const isReturned = newStatus === "Returned";
  const isLost = newStatus === "Lost";
  const isBorrowed = newStatus === "Borrowed";
  const isNotPickedUp = newStatus === "Not Picked Up";

  const libId = req.session.librarian.id;

  // ✅ createPool: must use a single connection for transaction
  db.getConnection((connErr, conn) => {
    if (connErr) {
      console.error("Get connection error:", connErr);
      return res.status(500).json({ message: "DB connection error" });
    }

    conn.beginTransaction(err => {
      if (err) {
        conn.release();
        return res.status(500).json({ message: "DB error" });
      }

      const rollback = (cb) => conn.rollback(() => { conn.release(); cb && cb(); });
      const commit = (cb) => conn.commit((cErr) => {
        if (cErr) return rollback(() => res.status(500).json({ message: "Commit failed" }));
        conn.release();
        cb && cb();
      });

      /* 0️⃣ Get BOOK_ID + current BORROW_STATUS (important for delta calculation) */
      const getInfoSql = `
        SELECT b.BOOK_ID, br.BORROW_STATUS
        FROM BORROW br
        JOIN REQUEST r ON br.REQUEST_ID = r.REQUEST_ID
        JOIN BOOK b ON r.BOOK_ID = b.BOOK_ID
        WHERE br.BORROW_ID = ?
        LIMIT 1
      `;

      conn.query(getInfoSql, [borrowId], (err0, rows0) => {
        if (err0 || !rows0.length) {
          return rollback(() =>
            res.status(404).json({ message: "Borrow not found" })
          );
        }

        const bookId = rows0[0].BOOK_ID;
        const oldStatus = (rows0[0].BORROW_STATUS || "").trim();

        /* ✅ Calculate TOT_BORROW delta safely */
        let borrowDelta = 0;
        if (newStatus === "Borrowed" && oldStatus !== "Borrowed") borrowDelta = +1;
        if (newStatus === "Not Picked Up" && oldStatus === "Borrowed") borrowDelta = -1;

        /* 1️⃣ Update BORROW dates + status */
        const updateBorrowSql = `
          UPDATE BORROW
          SET BORROW_STATUS = ?,

              DATE_BORROWED = CASE
                WHEN ? = 'Borrowed' THEN CURDATE()
                ELSE DATE_BORROWED
              END,

              DUE_DATE = CASE
                WHEN ? = 'Borrowed' THEN DATE_ADD(CURDATE(), INTERVAL 14 DAY)
                ELSE DUE_DATE
              END,

              DATE_RETURN = CASE
                WHEN ? = 'Returned' THEN CURDATE()
                ELSE NULL
              END
          WHERE BORROW_ID = ?
        `;

        conn.query(
          updateBorrowSql,
          [newStatus, newStatus, newStatus, newStatus, borrowId],
          (err1, result1) => {
            if (err1 || result1.affectedRows === 0) {
              return rollback(() =>
                res.status(500).json({ message: "Borrow update failed" })
              );
            }

            /* 1.5️⃣ Apply TOT_BORROW change if needed */
            const applyBorrowDelta = (next) => {
              if (borrowDelta === 0) return next();

              const updBorrowCountSql = `
                UPDATE BOOK
                SET TOT_BORROW = CASE
                  WHEN ? = 1 THEN TOT_BORROW + 1
                  WHEN ? = -1 THEN GREATEST(TOT_BORROW - 1, 0)
                  ELSE TOT_BORROW
                END
                WHERE BOOK_ID = ?
              `;

              conn.query(updBorrowCountSql, [borrowDelta, borrowDelta, bookId], (errB) => {
                if (errB) {
                  return rollback(() =>
                    res.status(500).json({ message: "Failed to update book total borrow" })
                  );
                }
                next();
              });
            };

            /* 2️⃣ If Returned OR Not Picked Up → set BOOK_STATUS back to Available */
            if (isReturned || isNotPickedUp) {
              return applyBorrowDelta(() => {
                const makeBookAvailableSql = `
                  UPDATE BOOK
                  SET BOOK_STATUS = 'Available'
                  WHERE BOOK_ID = ?
                `;

                conn.query(makeBookAvailableSql, [bookId], (errAvail) => {
                  if (errAvail) {
                    return rollback(() =>
                      res.status(500).json({ message: "Book update failed (Available)" })
                    );
                  }

                  commit(() =>
                    res.json({
                      message: `Borrow updated (${newStatus}) + Book set Available`,
                      borrowId,
                      bookId,
                      status: newStatus,
                      borrowDelta
                    })
                  );
                });
              });
            }

            /* 3️⃣ If NOT Lost → commit (but still apply delta if any) */
            if (!isLost) {
              return applyBorrowDelta(() => {
                commit(() =>
                  res.json({
                    message: "Borrow updated",
                    borrowId,
                    bookId,
                    status: newStatus,
                    borrowDelta
                  })
                );
              });
            }

            /* 4️⃣ Lost → set BOOK_STATUS = Unavailable (and fine logic continues) */
            return applyBorrowDelta(() => {
              const updateBookSql = `
                UPDATE BOOK
                SET BOOK_STATUS = 'Unavailable'
                WHERE BOOK_ID = ?
              `;

              conn.query(updateBookSql, [bookId], err3 => {
                if (err3) {
                  return rollback(() =>
                    res.status(500).json({ message: "Book update failed (Unavailable)" })
                  );
                }

                /* 5️⃣ Check existing Lost fine */
                const checkFineSql = `
                  SELECT FINE_ID
                  FROM FINE
                  WHERE BORROW_ID = ?
                    AND FINE_TYPE = 'Book Lost'
                  LIMIT 1
                `;

                conn.query(checkFineSql, [borrowId], (err4, fineRows) => {
                  if (err4) {
                    return rollback(() =>
                      res.status(500).json({ message: "Fine check failed" })
                    );
                  }

                  if (fineRows.length > 0) {
                    return commit(() =>
                      res.json({
                        message: "Borrow marked Lost, book disabled, fine already exists",
                        borrowId,
                        bookId,
                        fineId: fineRows[0].FINE_ID,
                        borrowDelta
                      })
                    );
                  }

                  /* 6️⃣ Generate new FINE_ID */
                  const getLastFineSql = `
                    SELECT FINE_ID
                    FROM FINE
                    ORDER BY CAST(SUBSTRING(FINE_ID, 2) AS UNSIGNED) DESC
                    LIMIT 1
                  `;

                  conn.query(getLastFineSql, (err5, rows2) => {
                    if (err5) {
                      return rollback(() =>
                        res.status(500).json({ message: "Fine ID generation failed" })
                      );
                    }

                    let next = 1;
                    if (rows2.length && rows2[0].FINE_ID) {
                      const n = parseInt(String(rows2[0].FINE_ID).substring(1), 10);
                      if (!isNaN(n)) next = n + 1;
                    }

                    const fineId = "F" + String(next).padStart(3, "0");

                    /* 7️⃣ Insert RM50 Lost Fine */
                    const insertFineSql = `
                      INSERT INTO FINE
                      (FINE_ID, BORROW_ID, AMOUNT, FINE_TYPE, FINE_STATUS, ISSUED_DATE, LIB_ID)
                      VALUES (?, ?, 50.00, 'Book Lost', 'Unpaid', CURDATE(), ?)
                    `;

                    conn.query(insertFineSql, [fineId, borrowId, libId], err6 => {
                      if (err6) {
                        return rollback(() =>
                          res.status(500).json({ message: "Insert fine failed" })
                        );
                      }

                      commit(() => {
                        res.json({
                          message: "Borrow marked Lost, RM50 fine issued, book disabled",
                          borrowId,
                          bookId,
                          fineId,
                          borrowDelta
                        });
                      });
                    });
                  });
                });
              });
            });
          }
        );
      });
    });
  });
});



/* =====================================================
   GET ALL PENDING BORROW REQUESTS (LIBRARIAN)
===================================================== */
app.get("/api/admin/borrow-requests", (req, res) => {

  const sql = `
    SELECT
      r.REQUEST_ID,
      r.REQUEST_DATE,
      u.USER_ID,
      b.ISBN,
      b.TITLE
    FROM REQUEST r
    JOIN USERS u ON r.USER_ID = u.USER_ID
    JOIN BOOK b ON r.BOOK_ID = b.BOOK_ID
    WHERE r.REQUEST_STATUS = 'Pending'
    ORDER BY r.REQUEST_DATE DESC
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error("Borrow request fetch error:", err);
      return res.status(500).json({ message: "Database error" });
    }
    res.json(rows);
  });
});

/* =====================================================
   APPROVE / DECLINE BORROW REQUEST
===================================================== */
app.post("/api/admin/process-request", (req, res) => {
  const { requestId, action } = req.body;

  if (!requestId || !action) {
    return res.status(400).json({ message: "Missing requestId or action" });
  }

  if (!req.session.librarian || !req.session.librarian.id) {
    return res.status(401).json({ message: "Unauthorized (not librarian)" });
  }

  const libId = req.session.librarian.id;
  const isApprove = action === "approve";
  const status = isApprove ? "Approved" : "Rejected";

  // ✅ createPool: must use a single connection for transaction
  db.getConnection((connErr, conn) => {
    if (connErr) {
      console.error("Get connection error:", connErr);
      return res.status(500).json({ message: "DB connection error" });
    }

    conn.beginTransaction(err => {
      if (err) {
        conn.release();
        return res.status(500).json({ message: "Transaction error" });
      }

      const rollback = (cb) => conn.rollback(() => { conn.release(); cb && cb(); });
      const commit = (cb) => conn.commit((cErr) => {
        if (cErr) return rollback(() => res.status(500).json({ message: "Commit failed" }));
        conn.release();
        cb && cb();
      });

      /* 1️⃣ Update REQUEST (status + librarian) */
      const updateRequestSql = `
        UPDATE REQUEST
        SET REQUEST_STATUS = ?, LIB_ID = ?
        WHERE REQUEST_ID = ?
      `;

      conn.query(updateRequestSql, [status, libId, requestId], (err1, result) => {
        if (err1 || result.affectedRows === 0) {
          return rollback(() =>
            res.status(500).json({ message: "Failed to update request" })
          );
        }

        /* If rejected → done */
        if (!isApprove) {
          return commit(() =>
            res.json({ message: "Request Rejected", requestId })
          );
        }

        /* 2️⃣ Get BOOK_ID from this request */
        const getBookSql = `
          SELECT BOOK_ID
          FROM REQUEST
          WHERE REQUEST_ID = ?
          LIMIT 1
        `;

        conn.query(getBookSql, [requestId], (err2, rows) => {
          if (err2 || !rows.length) {
            return rollback(() =>
              res.status(500).json({ message: "Book lookup failed" })
            );
          }

          const bookId = rows[0].BOOK_ID;

          /* ✅ 2.5️⃣ Auto-reject other PENDING requests with same BOOK_ID */
          const rejectOthersSql = `
            UPDATE REQUEST
            SET REQUEST_STATUS = 'Rejected', LIB_ID = ?
            WHERE BOOK_ID = ?
              AND REQUEST_ID <> ?
              AND REQUEST_STATUS = 'Pending'
          `;

          conn.query(rejectOthersSql, [libId, bookId, requestId], (errReject) => {
            if (errReject) {
              return rollback(() =>
                res.status(500).json({ message: "Failed to auto-reject other requests" })
              );
            }

            /* 3️⃣ Lock the book */
            const updateBookSql = `
              UPDATE BOOK
              SET BOOK_STATUS = 'Unavailable'
              WHERE BOOK_ID = ?
            `;

            conn.query(updateBookSql, [bookId], err3 => {
              if (err3) {
                return rollback(() =>
                  res.status(500).json({ message: "Book update failed" })
                );
              }

              /* 4️⃣ Generate next BORROW_ID (BR001…) */
              const getLastBorrowSql = `
                SELECT BORROW_ID
                FROM BORROW
                WHERE BORROW_ID LIKE 'BR%'
                ORDER BY CAST(SUBSTRING(BORROW_ID, 3) AS UNSIGNED) DESC
                LIMIT 1
              `;

              conn.query(getLastBorrowSql, (err4, rows2) => {
                if (err4) {
                  return rollback(() =>
                    res.status(500).json({ message: "Borrow ID lookup failed" })
                  );
                }

                let next = 1;
                if (rows2.length && rows2[0].BORROW_ID) {
                  const n = parseInt(rows2[0].BORROW_ID.substring(2), 10);
                  if (!isNaN(n)) next = n + 1;
                }

                const borrowId = "BR" + String(next).padStart(3, "0");

                /* 5️⃣ Create BORROW record */
                const insertBorrowSql = `
                  INSERT INTO BORROW
                  (BORROW_ID, REQUEST_ID, DATE_BORROWED, DUE_DATE, DATE_RETURN, BORROW_STATUS)
                  VALUES (?, ?, NULL, NULL, NULL, 'Ready For Pickup')
                `;

                conn.query(insertBorrowSql, [borrowId, requestId], err5 => {
                  if (err5) {
                    return rollback(() =>
                      res.status(500).json({ message: "Failed to create borrow record" })
                    );
                  }

                  commit(() => {
                    res.json({
                      message: "Request has been Approved. Book Locked",
                      requestId,
                      borrowId,
                      bookId,
                      borrowStatus: "Ready For Pickup",
                      handledBy: libId
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
});


/* =====================================================
   GET USER STATS FOR userInfo.html
===================================================== */
app.get("/api/admin/user-stats/:userId", (req, res) => {
  const userId = req.params.userId;

  const sql = `
    SELECT
      (SELECT COUNT(*)
       FROM BORROW br
       JOIN REQUEST r ON br.REQUEST_ID = r.REQUEST_ID
       WHERE r.USER_ID = ?
      ) AS borrowed,

      (SELECT COUNT(*)
       FROM FAVOURITE
       WHERE USER_ID = ?
      ) AS favourites,

      (SELECT COUNT(*)
       FROM REQUEST
       WHERE USER_ID = ?
         AND REQUEST_STATUS = 'Pending'
      ) AS pending
  `;

  db.query(sql, [userId, userId, userId], (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows[0]);
  });
});


/* =====================================================
  GET LIBRARIAN PROFILE
===================================================== */
app.get("/api/admin/profile/:libId", (req, res) => {
  const libId = req.params.libId;

  const sql = `
    SELECT
      LIB_ID,
      LIB_FNAME,
      LIB_LNAME,
      LIB_GENDER,
      LIB_CONTACT,
      LIB_EMAIL
    FROM LIBRARIAN
    WHERE LIB_ID = ?
    LIMIT 1
  `;

  db.query(sql, [libId], (err, rows) => {
    if (err) return res.status(500).json({ message: "Database error", err });
    if (!rows.length) return res.status(404).json({ message: "Librarian not found" });

    const l = rows[0];
    res.json({
      id: l.LIB_ID,
      firstName: l.LIB_FNAME,
      lastName: l.LIB_LNAME,
      gender: l.LIB_GENDER,
      contact: l.LIB_CONTACT,
      email: l.LIB_EMAIL
    });
  });
});

/* =====================================================
   UPDATE LIBRARIAN PROFILE
===================================================== */
app.put("/api/admin/profile/:libId", async (req, res) => {
  const libId = req.params.libId;
  const { firstName, lastName, gender, contact, email, password } = req.body;

  if (!firstName || !lastName) {
    return res.status(400).json({ message: "First name & last name are required." });
  }

  try {
    // Update basic fields
    let sql = `
      UPDATE LIBRARIAN
      SET LIB_FNAME = ?,
          LIB_LNAME = ?,
          LIB_GENDER = ?,
          LIB_CONTACT = ?,
          LIB_EMAIL = ?
      WHERE LIB_ID = ?
    `;
    const params = [firstName, lastName, gender, contact, email, libId];

    // If password is provided, hash and update
    if (password && password.trim() !== "") {
      const hashed = await bcrypt.hash(password.trim(), 10);
      sql = `
        UPDATE LIBRARIAN
        SET LIB_FNAME = ?,
            LIB_LNAME = ?,
            LIB_GENDER = ?,
            LIB_CONTACT = ?,
            LIB_EMAIL = ?,
            LIB_PASSWORD = ?
        WHERE LIB_ID = ?
      `;
      params.splice(5, 0, hashed); // insert hashed before libId
    }

    db.query(sql, params, (err) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(400).json({ message: "Email already exists." });
        }
        return res.status(500).json({ message: "Update failed", err });
      }

      res.json({ message: "Profile updated" });
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
});

/* =====================================================
   GET ALL LIBRARIANS (ADMIN)
===================================================== */
app.get("/api/admin/librarians", (req, res) => {
  const sql = `
    SELECT LIB_ID, LIB_FNAME, LIB_LNAME, LIB_CONTACT, LIB_EMAIL
    FROM LIBRARIAN
    ORDER BY LIB_ID ASC
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error("Librarian list fetch error:", err);
      return res.status(500).json({ message: "Database error" });
    }
    res.json(rows);
  });
});


/* =====================================================
   ADD LIBRARIAN (ADMIN)
===================================================== */
app.post("/api/admin/librarians", async (req, res) => {
  const { fname, lname, gender, contact, email, password } = req.body;

  if (!fname || !lname || !gender || !contact || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    // 1️⃣ Get latest LIB_ID
    const getLastIdSql = `
      SELECT LIB_ID
      FROM LIBRARIAN
      ORDER BY CAST(SUBSTRING(LIB_ID, 2) AS UNSIGNED) DESC
      LIMIT 1
    `;

    db.query(getLastIdSql, async (err, rows) => {
      if (err) {
        console.error("Fetch last LIB_ID error:", err);
        return res.status(500).json({ message: "Database error" });
      }

      let nextNumber = 1;

      if (rows.length > 0) {
        const lastId = rows[0].LIB_ID;   // e.g. "L007"
        const num = parseInt(lastId.substring(1)); // "007" → 7
        nextNumber = num + 1;
      }

      // Pad to 3 digits → L001, L010, L105
      const libId = "L" + String(nextNumber).padStart(3, "0");

      // 2️⃣ Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // 3️⃣ Insert librarian
      const insertSql = `
        INSERT INTO LIBRARIAN
        (LIB_ID, LIB_FNAME, LIB_LNAME, LIB_GENDER, LIB_CONTACT, LIB_EMAIL, LIB_PASSWORD)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      db.query(
        insertSql,
        [libId, fname, lname, gender, contact, email, hashedPassword],
        (err) => {
          if (err) {
            console.error("Add librarian error:", err);

            if (err.code === "ER_DUP_ENTRY") {
              return res.status(400).json({ message: "Email already exists" });
            }

            return res.status(500).json({ message: "Database error" });
          }

          res.json({ message: "Librarian added", libId });
        }
      );
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =====================================================
   GET ALL BOOKS (FOR bookInventory.html) - UPDATED
===================================================== */
app.get("/api/admin/books", (req, res) => {
  const { search = "" } = req.query;

  let sql = `
    SELECT
      b.BOOK_ID,
      b.TITLE,
      b.ISBN,
      b.BOOK_STATUS,
      b.BOOK_IMAGE,
      a.AUTHOR_NAME,
      -- Check if book has dependencies
      CASE 
        WHEN EXISTS (
          SELECT 1 FROM REQUEST r WHERE r.BOOK_ID = b.BOOK_ID
          UNION
          SELECT 1 FROM FAVOURITE f WHERE f.BOOK_ID = b.BOOK_ID
          UNION
          SELECT 1 FROM BORROW br 
          JOIN REQUEST r2 ON br.REQUEST_ID = r2.REQUEST_ID 
          WHERE r2.BOOK_ID = b.BOOK_ID
        ) THEN 0 
        ELSE 1 
      END AS canDelete
    FROM BOOK b
    JOIN AUTHOR a ON b.AUTHOR_ID = a.AUTHOR_ID
    WHERE 1=1
  `;

  const params = [];

  if (search) {
    sql += `
      AND (
        b.TITLE LIKE ?
        OR b.ISBN LIKE ?
        OR a.AUTHOR_NAME LIKE ?
      )
    `;
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  sql += ` ORDER BY b.TITLE ASC`;

  db.query(sql, params, (err, rows) => {
    if (err) {
      console.error("Admin books fetch error:", err);
      return res.status(500).json({ message: "Database error" });
    }
    res.json(rows);
  });
});

/* =====================================================
   ADD NEW BOOK (ADMIN) with smart author handling
===================================================== */
app.post("/api/admin/books/add", upload.single("cover"), (req, res) => {
  const {
    // bookId is intentionally NOT used (ignore user input)
    authorId,
    authorName,
    title,
    genre,
    description,
    publisher,
    isbn,
    publicationDate,
    bookStatus
  } = req.body;

  const uploadedFileName = req.file ? req.file.filename : null;

  // helper: delete uploaded file if we fail
  const cleanupUpload = () => {
    if (uploadedFileName) {
      try { fs.unlinkSync(path.join(uploadDir, uploadedFileName)); } catch {}
    }
  };

  // 1) Validate required fields (no bookId required anymore)
  if (!title || !genre || !publisher || !isbn) {
    cleanupUpload();
    return res.status(400).json({ message: "Title, Genre, Publisher, and ISBN are required" });
  }

  // 2) Validate author fields
  if (!authorId || !authorName) {
    cleanupUpload();
    return res.status(400).json({ message: "Author ID and Author Name are required" });
  }

  // 3) Check if ISBN already exists
  const checkIsbnSql = `SELECT BOOK_ID FROM BOOK WHERE ISBN = ? LIMIT 1`;
  db.query(checkIsbnSql, [isbn], (err, isbnRows) => {
    if (err) {
      cleanupUpload();
      return res.status(500).json({ message: "Database error" });
    }
    if (isbnRows.length > 0) {
      cleanupUpload();
      return res.status(400).json({ message: `ISBN already exists for Book ID ${isbnRows[0].BOOK_ID}` });
    }

    // 4) Handle Author logic (same as your function)
    handleAuthor(authorId, authorName, (authorErr, finalAuthorId) => {
      if (authorErr) {
        cleanupUpload();
        return res.status(400).json({ message: authorErr });
      }

      // 5) Generate new bookId (highest + 1), then insert
      generateNextBookId((idErr, newBookId) => {
        if (idErr) {
          cleanupUpload();
          return res.status(500).json({ message: idErr });
        }

        insertBookWithRetry(newBookId, finalAuthorId, 2); // retry 2 times for race condition
      });
    });
  });

  /* ------------------ helpers ------------------ */

  // Generates next BOOK_ID by reading current maximum numeric part
  function generateNextBookId(callback) {
    // Works for BOOK_ID like B001, B12, B0009 etc.
    // If table empty -> B001
    const sql = `
      SELECT MAX(CAST(SUBSTRING(BOOK_ID, 2) AS UNSIGNED)) AS maxNum
      FROM BOOK
      WHERE BOOK_ID REGEXP '^B[0-9]+$'
    `;

    db.query(sql, (err, rows) => {
      if (err) return callback("Database error generating Book ID");

      const maxNum = (rows && rows[0] && rows[0].maxNum) ? Number(rows[0].maxNum) : 0;
      const nextNum = maxNum + 1;

      // choose your padding width:
      // 3 => B001, B002 ... B999, B1000 (still fine)
      const padded = String(nextNum).padStart(3, "0");
      const newBookId = `B${padded}`;

      callback(null, newBookId);
    });
  }

  // Insert book; if duplicate BOOK_ID (race condition), regenerate and retry
  function insertBookWithRetry(bookId, finalAuthorId, retriesLeft) {
    const insertBookSql = `
      INSERT INTO BOOK (
        BOOK_ID, AUTHOR_ID, TITLE, GENRE, DESCRIPTION,
        PUBLISHER, ISBN, PUBLICATION_DATE, BOOK_STATUS,
        BOOK_IMAGE, TOT_FAV, TOT_BORROW
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
    `;

    const values = [
      bookId,
      finalAuthorId,
      title,
      genre,
      description || "",
      publisher,
      isbn,
      publicationDate || null,
      bookStatus || "Available",
      uploadedFileName
    ];

    db.query(insertBookSql, values, (err2) => {
      if (err2) {
        // ER_DUP_ENTRY is typical for duplicate primary key
        const dup =
          err2.code === "ER_DUP_ENTRY" ||
          (typeof err2.message === "string" && err2.message.includes("Duplicate"));

        if (dup && retriesLeft > 0) {
          // Someone inserted same ID first -> generate again and retry
          return generateNextBookId((idErr, newId) => {
            if (idErr) {
              cleanupUpload();
              return res.status(500).json({ message: idErr });
            }
            return insertBookWithRetry(newId, finalAuthorId, retriesLeft - 1);
          });
        }

        console.error("Add book error:", err2);
        cleanupUpload();
        return res.status(500).json({ message: "Database error", error: err2 });
      }

      return res.json({
        success: true,
        message: "Book added successfully",
        bookId,
        bookImage: uploadedFileName
      });
    });
  }

  // Your author helper (kept as-is, only minor tidy)
  function handleAuthor(authorId, authorName, callback) {
    // Case 1: Both ID and Name provided
    if (authorId && authorName) {
      const authorIdRegex = /^A\d+$/;
      if (!authorIdRegex.test(authorId)) {
        return callback("Author ID must start with 'A' followed by numbers (e.g., A001)");
      }

      const checkAuthorSql = `SELECT AUTHOR_ID, AUTHOR_NAME FROM AUTHOR WHERE AUTHOR_ID = ?`;
      db.query(checkAuthorSql, [authorId], (err, rows) => {
        if (err) return callback("Database error");

        if (rows.length > 0) {
          if (rows[0].AUTHOR_NAME !== authorName) {
            const updateSql = `UPDATE AUTHOR SET AUTHOR_NAME = ? WHERE AUTHOR_ID = ?`;
            db.query(updateSql, [authorName, authorId], (updateErr) => {
              if (updateErr) return callback("Failed to update author name");
              return callback(null, authorId);
            });
          } else {
            return callback(null, authorId);
          }
        } else {
          const insertAuthorSql = `INSERT INTO AUTHOR (AUTHOR_ID, AUTHOR_NAME) VALUES (?, ?)`;
          db.query(insertAuthorSql, [authorId, authorName], (insErr) => {
            if (insErr) return callback("Failed to create new author");
            return callback(null, authorId);
          });
        }
      });
    }
    // Case 2: Only ID provided
    else if (authorId && !authorName) {
      const checkAuthorSql = `SELECT AUTHOR_ID FROM AUTHOR WHERE AUTHOR_ID = ?`;
      db.query(checkAuthorSql, [authorId], (err, rows) => {
        if (err) return callback("Database error");
        if (rows.length === 0) {
          return callback(`Author ID ${authorId} not found. Please provide Author Name too.`);
        }
        return callback(null, authorId);
      });
    }
    // Case 3: Only Name provided
    else if (!authorId && authorName) {
      return callback("Please provide Author ID along with Author Name");
    }
    // Case 4: Neither provided
    else {
      return callback("Author ID and Author Name are required");
    }
  }
});

/* =====================================================
   CHECK IF BOOK ID EXISTS (public)
===================================================== */
app.get("/api/public/check-book-id", (req, res) => {
  const { bookId } = req.query;

  if (!bookId) {
    return res.status(400).json({ message: "Book ID is required" });
  }

  const sql = `SELECT BOOK_ID FROM BOOK WHERE BOOK_ID = ?`;
  db.query(sql, [bookId], (err, rows) => {
    if (err) {
      console.error("Book ID check error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    res.json({ 
      exists: rows.length > 0,
      bookId
    });
  });
});

/* =====================================================
   GET SINGLE BOOK FOR EDITING (ADMIN)
===================================================== */
app.get("/api/admin/books/:bookId", (req, res) => {
    const bookId = req.params.bookId;

    const sql = `
        SELECT 
            b.BOOK_ID,
            b.AUTHOR_ID,
            b.TITLE,
            b.GENRE,
            b.DESCRIPTION,
            b.PUBLISHER,
            b.ISBN,
            b.PUBLICATION_DATE,
            b.BOOK_STATUS,
            b.BOOK_IMAGE,
            a.AUTHOR_NAME
        FROM BOOK b
        LEFT JOIN AUTHOR a ON b.AUTHOR_ID = a.AUTHOR_ID
        WHERE b.BOOK_ID = ?
        LIMIT 1
    `;

    db.query(sql, [bookId], (err, rows) => {
        if (err) {
            console.error("Get book error:", err);
            return res.status(500).json({ message: "Database error" });
        }
        
        if (rows.length === 0) {
            return res.status(404).json({ message: "Book not found" });
        }

        res.json(rows[0]);
    });
});



/* =====================================================
   PUBLIC AUTHOR LOOKUP (no login required)
===================================================== */
app.get("/api/public/author-lookup", (req, res) => {
  const { id, name } = req.query;

  if (!id && !name) {
    return res.status(400).json({ message: "Provide either author ID or name" });
  }

  let sql = `SELECT AUTHOR_ID, AUTHOR_NAME FROM AUTHOR WHERE `;
  const params = [];

  if (id) {
    sql += `AUTHOR_ID = ?`;
    params.push(id);
  } else if (name) {
    sql += `AUTHOR_NAME LIKE ?`;
    params.push(`%${name}%`);
  }

  db.query(sql, params, (err, rows) => {
    if (err) {
      console.error("Author lookup error:", err);
      return res.status(500).json({ message: "Database error" });
    }
    
    if (rows.length === 0) {
      return res.json({ exists: false, message: "Author not found" });
    }

    res.json({ 
      exists: true, 
      authors: rows,
      authorId: rows[0].AUTHOR_ID,
      authorName: rows[0].AUTHOR_NAME
    });
  });
});


/* =====================================================
   UPDATE BOOK (ADMIN)
===================================================== */
app.put("/api/admin/books/:bookId/update", upload.single("cover"), (req, res) => {
  const bookId = req.params.bookId;

  const {
    authorId,
    authorName,
    title,
    genre,
    description,
    publisher,
    isbn,
    publicationDate,
    bookStatus
  } = req.body;

  const newFilename = req.file ? req.file.filename : null; // new uploaded cover filename

  // Validate required fields
  if (!title || !genre || !publisher || !isbn) {
    if (newFilename) safeDeleteFile(path.join(uploadDir, newFilename));
    return res.status(400).json({ message: "Title, Genre, Publisher, and ISBN are required" });
  }

  if (!authorId || !authorName) {
    if (newFilename) safeDeleteFile(path.join(uploadDir, newFilename));
    return res.status(400).json({ message: "Both Author ID and Author Name are required" });
  }

  // Optional ISBN validation (your original)
  const isbnRegex = /^(?=(?:\D*\d){10}(?:(?:\D*\d){3})?$)[\d-]+$/;
  if (isbn && !isbnRegex.test(isbn)) {
    if (newFilename) safeDeleteFile(path.join(uploadDir, newFilename));
    return res.status(400).json({ message: "Invalid ISBN format. Please use format like 978-0-316-76948-0" });
  }

  db.getConnection((connErr, conn) => {
    if (connErr) {
      if (newFilename) safeDeleteFile(path.join(uploadDir, newFilename));
      console.error("Get connection error:", connErr);
      return res.status(500).json({ message: "DB connection error" });
    }

    conn.beginTransaction((txErr) => {
      if (txErr) {
        conn.release();
        if (newFilename) safeDeleteFile(path.join(uploadDir, newFilename));
        return res.status(500).json({ message: "Database error" });
      }

      const rollback = (cb) => conn.rollback(() => { conn.release(); cb && cb(); });
      const commit = (cb) => conn.commit((cErr) => {
        if (cErr) return rollback(() => res.status(500).json({ message: "Failed to save changes" }));
        conn.release();
        cb && cb();
      });

      // 0) Get current BOOK_IMAGE (needed for delete old image)
      const getOldImageSql = `SELECT BOOK_IMAGE FROM BOOK WHERE BOOK_ID = ?`;
      conn.query(getOldImageSql, [bookId], (err, imgRows) => {
        if (err) {
          console.error("Fetch old image error:", err);
          if (newFilename) safeDeleteFile(path.join(uploadDir, newFilename));
          return rollback(() => res.status(500).json({ message: "Database error" }));
        }

        if (!imgRows || imgRows.length === 0) {
          if (newFilename) safeDeleteFile(path.join(uploadDir, newFilename));
          return rollback(() => res.status(404).json({ message: "Book not found" }));
        }

        const oldFilename = imgRows[0].BOOK_IMAGE; // may be null

        // 1) Check ISBN unique for other books
        const checkIsbnSql = `SELECT BOOK_ID FROM BOOK WHERE ISBN = ? AND BOOK_ID != ?`;
        conn.query(checkIsbnSql, [isbn, bookId], (err, isbnRows) => {
          if (err) {
            console.error("ISBN check error:", err);
            if (newFilename) safeDeleteFile(path.join(uploadDir, newFilename));
            return rollback(() => res.status(500).json({ message: "Database error" }));
          }

          if (isbnRows.length > 0) {
            if (newFilename) safeDeleteFile(path.join(uploadDir, newFilename));
            return rollback(() => res.status(400).json({
              message: `ISBN ${isbn} already exists for book ${isbnRows[0].BOOK_ID}`
            }));
          }

          // 2) Handle Author Update/Create (same logic as yours)
          const authorCheckSql = `SELECT AUTHOR_ID, AUTHOR_NAME FROM AUTHOR WHERE AUTHOR_ID = ?`;
          conn.query(authorCheckSql, [authorId], (err, authorRows) => {
            if (err) {
              console.error("Author check error:", err);
              if (newFilename) safeDeleteFile(path.join(uploadDir, newFilename));
              return rollback(() => res.status(500).json({ message: "Database error" }));
            }

            const proceedUpdateBook = () => {
              // 3) Update BOOK, include BOOK_IMAGE only if newFilename exists
              const updateSql = newFilename
                ? `
                  UPDATE BOOK SET
                    AUTHOR_ID = ?,
                    TITLE = ?,
                    GENRE = ?,
                    DESCRIPTION = ?,
                    PUBLISHER = ?,
                    ISBN = ?,
                    PUBLICATION_DATE = ?,
                    BOOK_STATUS = ?,
                    BOOK_IMAGE = ?
                  WHERE BOOK_ID = ?
                `
                : `
                  UPDATE BOOK SET
                    AUTHOR_ID = ?,
                    TITLE = ?,
                    GENRE = ?,
                    DESCRIPTION = ?,
                    PUBLISHER = ?,
                    ISBN = ?,
                    PUBLICATION_DATE = ?,
                    BOOK_STATUS = ?
                  WHERE BOOK_ID = ?
                `;

              const values = newFilename
                ? [
                    authorId,
                    title,
                    genre,
                    description || "",
                    publisher,
                    isbn,
                    publicationDate || null,
                    bookStatus || "Available",
                    newFilename,
                    bookId
                  ]
                : [
                    authorId,
                    title,
                    genre,
                    description || "",
                    publisher,
                    isbn,
                    publicationDate || null,
                    bookStatus || "Available",
                    bookId
                  ];

              conn.query(updateSql, values, (err, result) => {
                if (err) {
                  console.error("Update book error:", err);
                  if (newFilename) safeDeleteFile(path.join(uploadDir, newFilename));
                  return rollback(() => res.status(500).json({ message: "Database error", error: err.message }));
                }

                if (result.affectedRows === 0) {
                  if (newFilename) safeDeleteFile(path.join(uploadDir, newFilename));
                  return rollback(() => res.status(404).json({ message: "Book not found" }));
                }

                // 4) Commit, then delete old file (only after DB success!)
                commit(() => {
                  // Delete old image if replaced and old existed and not same name
                  if (newFilename && oldFilename && oldFilename !== newFilename) {
                    safeDeleteFile(path.join(uploadDir, oldFilename));
                  }

                  res.json({
                    success: true,
                    message: "Book updated successfully",
                    bookId,
                    bookImage: newFilename || oldFilename || null
                  });
                });
              });
            };

            if (authorRows.length === 0) {
              // create author
              const insertAuthorSql = `INSERT INTO AUTHOR (AUTHOR_ID, AUTHOR_NAME) VALUES (?, ?)`;
              conn.query(insertAuthorSql, [authorId, authorName], (err) => {
                if (err) {
                  console.error("Author insert error:", err);
                  if (newFilename) safeDeleteFile(path.join(uploadDir, newFilename));
                  return rollback(() => res.status(500).json({
                    message: "Failed to create author. Author ID might already exist."
                  }));
                }
                proceedUpdateBook();
              });
            } else {
              // update author name if changed
              if (authorRows[0].AUTHOR_NAME !== authorName) {
                const updateAuthorSql = `UPDATE AUTHOR SET AUTHOR_NAME = ? WHERE AUTHOR_ID = ?`;
                conn.query(updateAuthorSql, [authorName, authorId], (err) => {
                  if (err) {
                    console.error("Author update error:", err);
                    if (newFilename) safeDeleteFile(path.join(uploadDir, newFilename));
                    return rollback(() => res.status(500).json({ message: "Failed to update author name" }));
                  }
                  proceedUpdateBook();
                });
              } else {
                proceedUpdateBook();
              }
            }
          });
        });
      });
    });
  });

  function safeDeleteFile(absPath) {
    try {
      if (fs.existsSync(absPath)) fs.unlinkSync(absPath);
    } catch (e) {
      console.warn("⚠️ Failed to delete file:", absPath, e.message);
    }
  }
});



/* =====================================================
   ADMIN: DELETE BOOK
   NOTE: Will fail if book has REQUEST/FAVOURITE rows.
===================================================== */
app.delete("/api/admin/books/:bookId", (req, res) => {
  const bookId = req.params.bookId;

  const sql = `DELETE FROM BOOK WHERE BOOK_ID = ?`;

  db.query(sql, [bookId], (err, result) => {
    if (err) {
      console.error("Delete book error:", err);

      // FK constraint error
      if (err.code === "ER_ROW_IS_REFERENCED_2") {
        return res.status(400).json({
          message: "Cannot delete: this book is linked to requests/favourites/borrows."
        });
      }

      return res.status(500).json({ message: "Database error" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Book not found" });
    }

    res.json({ message: "Book deleted" });
  });
});

/* =====================================================
   REMOVE FINE
===================================================== */
app.post("/api/admin/fines/remove", requireAdmin, (req, res) => {
  const { fineId } = req.body;

  if (!fineId) return res.status(400).json({ message: "fineId is required" });

  // ✅ createPool: must use a single connection for transaction
  db.getConnection((connErr, conn) => {
    if (connErr) {
      console.error("Get connection error:", connErr);
      return res.status(500).json({ message: "DB connection error" });
    }

    conn.beginTransaction(err => {
      if (err) {
        conn.release();
        return res.status(500).json({ message: "DB error" });
      }

      const rollback = (cb) => conn.rollback(() => { conn.release(); cb && cb(); });
      const commit = (cb) => conn.commit((cErr) => {
        if (cErr) return rollback(() => res.status(500).json({ message: "Commit failed" }));
        conn.release();
        cb && cb();
      });

      // 1) Check fine exists + status
      const getFineSql = `
        SELECT FINE_ID, FINE_STATUS
        FROM FINE
        WHERE FINE_ID = ?
        LIMIT 1
      `;

      conn.query(getFineSql, [fineId], (err1, rows) => {
        if (err1) {
          console.error("Fine lookup error:", err1);
          return rollback(() => res.status(500).json({ message: "Database error" }));
        }

        if (!rows.length) {
          return rollback(() => res.status(404).json({ message: "Fine not found" }));
        }

        const status = String(rows[0].FINE_STATUS || "").trim().toLowerCase();
        if (status === "paid") {
          return rollback(() => res.status(400).json({ message: "Cannot remove a PAID fine." }));
        }

        // 2) Safety: if receipt exists, do not delete (should not happen if unpaid)
        const checkReceiptSql = `
          SELECT RECEIPT_ID
          FROM RECEIPT
          WHERE FINE_ID = ?
          LIMIT 1
        `;

        conn.query(checkReceiptSql, [fineId], (err2, rrows) => {
          if (err2) {
            console.error("Receipt check error:", err2);
            return rollback(() => res.status(500).json({ message: "Database error" }));
          }

          if (rrows.length > 0) {
            return rollback(() =>
              res.status(400).json({
                message: "Cannot remove: receipt already exists for this fine."
              })
            );
          }

          // 3) Delete fine (FK: RECEIPT references FINE, but we already checked no receipt)
          const deleteSql = `
            DELETE FROM FINE
            WHERE FINE_ID = ?
              AND FINE_STATUS = 'Unpaid'
          `;

          conn.query(deleteSql, [fineId], (err3, result) => {
            if (err3) {
              console.error("Delete fine error:", err3);
              return rollback(() => res.status(500).json({ message: "Delete failed" }));
            }

            if (result.affectedRows === 0) {
              // Either status not Unpaid (case mismatch) or not found
              return rollback(() =>
                res.status(400).json({ message: "Fine cannot be removed (not Unpaid or not found)." })
              );
            }

            commit(() => {
              res.json({ message: "Fine removed", fineId });
            });
          });
        });
      });
    });
  });
});



/* =====================================================
   GET ALL FINES (ADMIN)
===================================================== */
app.get("/api/admin/fines", requireAdmin, (req, res) => {
  const { status = "All" } = req.query;

  let where = "";
  const params = [];

  if (status !== "All") {
    where = "WHERE f.FINE_STATUS = ?";
    params.push(status);
  }

  const sql = `
    SELECT
      f.FINE_ID,
      f.AMOUNT,
      f.FINE_TYPE,
      f.FINE_STATUS,
      f.ISSUED_DATE,

      u.USER_ID,
      CONCAT(u.USER_FNAME, ' ', u.USER_LNAME) AS USER_NAME,

      b.BOOK_ID,
      b.TITLE AS BOOK_TITLE,

      br.BORROW_ID

    FROM FINE f
    JOIN BORROW br ON f.BORROW_ID = br.BORROW_ID
    JOIN REQUEST r ON br.REQUEST_ID = r.REQUEST_ID
    JOIN USERS u ON r.USER_ID = u.USER_ID
    JOIN BOOK b ON r.BOOK_ID = b.BOOK_ID
    ${where}
    ORDER BY f.ISSUED_DATE DESC, f.FINE_ID DESC
  `;

  db.query(sql, params, (err, rows) => {
    if (err) {
      console.error("Fines fetch error:", err);
      return res.status(500).json({ message: "Database error" });
    }
    res.json(rows);
  });
});


/* =====================================================
   ISSUE NEW FINE (ADMIN)
===================================================== */
app.post("/api/admin/fines/issue", requireAdmin, (req, res) => {
  const { borrowId, reason, amount } = req.body;

  if (!borrowId || !reason) {
    return res.status(400).json({ message: "Borrow ID and Reason are required." });
  }

  const cleanReason = String(reason).trim();
  const isLost = cleanReason.toLowerCase() === "book lost";
  const fineAmount = isLost ? 50.0 : Number(amount);

  if (!isLost && (amount === undefined || amount === null || amount === "" || isNaN(fineAmount))) {
    return res.status(400).json({ message: "Amount is required for non-lost fines." });
  }

  const libId = req.session.librarian.id;

  // ✅ get a single connection for transaction
  db.getConnection((connErr, conn) => {
    if (connErr) {
      console.error("DB getConnection error:", connErr);
      return res.status(500).json({ message: "DB connection error" });
    }

    conn.beginTransaction((txErr) => {
      if (txErr) {
        console.error("beginTransaction error:", txErr);
        conn.release();
        return res.status(500).json({ message: "DB transaction error" });
      }

      // helper rollback (always release)
      const rollback = (status, payload) => {
        conn.rollback(() => {
          conn.release();
          res.status(status).json(payload);
        });
      };

      // helper commit (always release)
      const commit = (payload) => {
        conn.commit((cErr) => {
          if (cErr) {
            console.error("commit error:", cErr);
            return rollback(500, { message: "Commit failed" });
          }
          conn.release();
          res.json(payload);
        });
      };

      // 1) Prevent duplicate same-type fine for same borrow
      const checkFineSql = `
        SELECT FINE_ID
        FROM FINE
        WHERE BORROW_ID = ?
          AND FINE_TYPE = ?
        LIMIT 1
      `;

      conn.query(checkFineSql, [borrowId, cleanReason], (err1, existing) => {
        if (err1) {
          console.error("Fine check error:", err1);
          return rollback(500, { message: "Database error" });
        }

        if (existing.length > 0) {
          // already exists -> no need insert
          return commit({
            message: `Fine already exists for this borrow (${cleanReason}).`,
            fineId: existing[0].FINE_ID
          });
        }

        // 2) If LOST: set BORROW status + BOOK status first
        const doLostUpdates = (cb) => {
          if (!isLost) return cb(null);

          const updateBorrowSql = `
            UPDATE BORROW
            SET BORROW_STATUS = 'Lost', DATE_RETURN = NULL
            WHERE BORROW_ID = ?
          `;

          conn.query(updateBorrowSql, [borrowId], (err2, result2) => {
            if (err2) {
              console.error("Borrow update(Lost) error:", err2);
              return cb({ status: 500, message: "Failed to set borrow Lost" });
            }
            if (result2.affectedRows === 0) {
              return cb({ status: 404, message: "Borrow not found" });
            }

            const getBookSql = `
              SELECT b.BOOK_ID
              FROM BORROW br
              JOIN REQUEST r ON br.REQUEST_ID = r.REQUEST_ID
              JOIN BOOK b ON r.BOOK_ID = b.BOOK_ID
              WHERE br.BORROW_ID = ?
              LIMIT 1
            `;

            conn.query(getBookSql, [borrowId], (err3, rows3) => {
              if (err3) {
                console.error("Book lookup error:", err3);
                return cb({ status: 500, message: "Failed to lookup book for borrow" });
              }
              if (!rows3.length) {
                return cb({ status: 404, message: "Book not found for this borrow" });
              }

              const bookId = rows3[0].BOOK_ID;

              const updateBookSql = `
                UPDATE BOOK
                SET BOOK_STATUS = 'Unavailable'
                WHERE BOOK_ID = ?
              `;

              conn.query(updateBookSql, [bookId], (err4) => {
                if (err4) {
                  console.error("Book update(Unavailable) error:", err4);
                  return cb({ status: 500, message: "Failed to set book Unavailable" });
                }
                cb(null);
              });
            });
          });
        };

        doLostUpdates((lostErr) => {
          if (lostErr) return rollback(lostErr.status || 500, { message: lostErr.message });

          // 3) Generate new FINE_ID
          const getLastFineIdSql = `
            SELECT FINE_ID
            FROM FINE
            ORDER BY CAST(SUBSTRING(FINE_ID, 2) AS UNSIGNED) DESC
            LIMIT 1
          `;

          conn.query(getLastFineIdSql, (err5, rows5) => {
            if (err5) {
              console.error("Fetch last FINE_ID error:", err5);
              return rollback(500, { message: "Database error" });
            }

            let nextNumber = 1;
            if (rows5.length > 0 && rows5[0].FINE_ID) {
              const num = parseInt(String(rows5[0].FINE_ID).substring(1), 10);
              if (!isNaN(num)) nextNumber = num + 1;
            }

            const fineId = "F" + String(nextNumber).padStart(3, "0");

            // 4) Insert fine
            const insertSql = `
              INSERT INTO FINE
                (FINE_ID, BORROW_ID, AMOUNT, FINE_TYPE, FINE_STATUS, ISSUED_DATE, LIB_ID)
              VALUES
                (?, ?, ?, ?, 'Unpaid', CURDATE(), ?)
            `;

            conn.query(insertSql, [fineId, borrowId, fineAmount, cleanReason, libId], (err6) => {
              if (err6) {
                console.error("Issue fine error:", err6);
                return rollback(500, { message: "Failed to issue fine" });
              }

              return commit({
                message: isLost
                  ? "Book marked Lost + book Unavailable + RM50 fine issued"
                  : "Fine issued",
                fineId,
                amount: fineAmount,
                reason: cleanReason
              });
            });
          });
        });
      });
    });
  });
});


/* =====================================================
   PAY FINE (ADMIN)
===================================================== */
app.post("/api/admin/fines/pay", requireAdmin, (req, res) => {
  const { fineId, payMethod = "Cash" } = req.body;
  if (!fineId) return res.status(400).json({ message: "fineId is required" });

  db.getConnection((err, conn) => {
    if (err) {
      console.error("DB getConnection error:", err);
      return res.status(500).json({ message: "Database connection error" });
    }

    const rollback = (status, payload) => {
      conn.rollback(() => {
        conn.release();
        res.status(status).json(payload);
      });
    };

    conn.beginTransaction((txErr) => {
      if (txErr) {
        conn.release();
        return res.status(500).json({ message: "Transaction error" });
      }

      // 0) Get fine + borrow status
      const getFineBorrowSql = `
        SELECT f.FINE_ID, f.FINE_STATUS, f.BORROW_ID, br.BORROW_STATUS
        FROM FINE f
        JOIN BORROW br ON f.BORROW_ID = br.BORROW_ID
        WHERE f.FINE_ID = ?
        LIMIT 1
      `;

      conn.query(getFineBorrowSql, [fineId], (e0, rows0) => {
        if (e0) {
          console.error("Fine lookup error:", e0);
          return rollback(500, { message: "Database error" });
        }
        if (!rows0.length) {
          return rollback(404, { message: "Fine not found" });
        }

        const borrowId = rows0[0].BORROW_ID;
        const borrowStatus = String(rows0[0].BORROW_STATUS || "").trim();

        // 1) Mark fine Paid
        const updateFineSql = `
          UPDATE FINE
          SET FINE_STATUS = 'Paid'
          WHERE FINE_ID = ?
        `;

        conn.query(updateFineSql, [fineId], (e1) => {
          if (e1) {
            console.error("Pay fine update error:", e1);
            return rollback(500, { message: "Update failed" });
          }

          // 2) If borrow is Borrowed/Overdue, mark returned
          const shouldReturn = borrowStatus === "Borrowed" || borrowStatus === "Overdue";

          const updateBorrowIfNeeded = (next) => {
            if (!shouldReturn) return next();

            const updateBorrowSql = `
              UPDATE BORROW
              SET BORROW_STATUS = 'Returned',
                  DATE_RETURN = CURDATE()
              WHERE BORROW_ID = ?
                AND BORROW_STATUS IN ('Borrowed', 'Overdue')
            `;

            conn.query(updateBorrowSql, [borrowId], (e2) => {
              if (e2) {
                console.error("Borrow update(Returned) error:", e2);
                return rollback(500, { message: "Failed to update borrow status" });
              }
              next();
            });
          };

          updateBorrowIfNeeded(() => {
            // 3) Check if receipt already exists
            const checkReceiptSql = `
              SELECT RECEIPT_ID
              FROM RECEIPT
              WHERE FINE_ID = ?
              LIMIT 1
            `;

            conn.query(checkReceiptSql, [fineId], (e3, rrows) => {
              if (e3) {
                console.error("Receipt check error:", e3);
                return rollback(500, { message: "Database error" });
              }

              // ✅ If receipt exists, just commit + return
              if (rrows.length > 0) {
                return conn.commit((cErr) => {
                  if (cErr) return rollback(500, { message: "Commit failed" });
                  conn.release();
                  return res.json({
                    message: shouldReturn
                      ? "Paid (receipt already exists) + borrow returned"
                      : "Paid (receipt already exists)",
                    receiptId: rrows[0].RECEIPT_ID,
                    borrowUpdated: shouldReturn,
                    borrowId
                  });
                });
              }

              // 4) Generate next receipt id
              const getLastReceiptSql = `
                SELECT RECEIPT_ID
                FROM RECEIPT
                ORDER BY CAST(SUBSTRING(RECEIPT_ID, 2) AS UNSIGNED) DESC
                LIMIT 1
              `;

              conn.query(getLastReceiptSql, (e4, rows2) => {
                if (e4) {
                  console.error("Fetch last RECEIPT_ID error:", e4);
                  return rollback(500, { message: "Database error" });
                }

                let nextNumber = 1;
                if (rows2.length > 0 && rows2[0].RECEIPT_ID) {
                  const num = parseInt(String(rows2[0].RECEIPT_ID).substring(1), 10);
                  if (!isNaN(num)) nextNumber = num + 1;
                }

                const receiptId = "R" + String(nextNumber).padStart(3, "0");

                // 5) Insert receipt
                const insertReceiptSql = `
                  INSERT INTO RECEIPT (RECEIPT_ID, FINE_ID, PAY_DATE, PAY_METHOD)
                  VALUES (?, ?, CURDATE(), ?)
                `;

                conn.query(insertReceiptSql, [receiptId, fineId, payMethod], (e5) => {
                  if (e5) {
                    console.error("Insert receipt error:", e5);
                    return rollback(500, { message: "Receipt insert failed" });
                  }

                  // 6) Commit all changes
                  conn.commit((cErr) => {
                    if (cErr) return rollback(500, { message: "Commit failed" });

                    conn.release();
                    res.json({
                      message: shouldReturn
                        ? "Fine paid + receipt created + borrow returned"
                        : "Fine paid + receipt created",
                      receiptId,
                      borrowUpdated: shouldReturn,
                      borrowId
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
});


/* =====================================================
   GET RECEIPT DATA (ADMIN)  - used for Print modal
===================================================== */
app.get("/api/admin/receipt/:fineId", requireAdmin, (req, res) => {
  const { fineId } = req.params;

  const sql = `
    SELECT
      f.FINE_ID,
      f.AMOUNT,
      f.FINE_TYPE,
      f.FINE_STATUS,
      f.ISSUED_DATE,

      u.USER_ID,
      CONCAT(u.USER_FNAME, ' ', u.USER_LNAME) AS USER_NAME,

      b.TITLE AS BOOK_TITLE,

      rc.RECEIPT_ID,
      rc.PAY_DATE,
      rc.PAY_METHOD

    FROM FINE f
    JOIN BORROW br ON f.BORROW_ID = br.BORROW_ID
    JOIN REQUEST r ON br.REQUEST_ID = r.REQUEST_ID
    JOIN USERS u ON r.USER_ID = u.USER_ID
    JOIN BOOK b ON r.BOOK_ID = b.BOOK_ID
    LEFT JOIN RECEIPT rc ON rc.FINE_ID = f.FINE_ID
    WHERE f.FINE_ID = ?
    LIMIT 1
  `;

  db.query(sql, [fineId], (err, rows) => {
    if (err) {
      console.error("Receipt fetch error:", err);
      return res.status(500).json({ message: "Database error" });
    }
    if (!rows.length) return res.status(404).json({ message: "Fine not found" });
    res.json(rows[0]);
  });
});



/*<------------------------------------------------------[Helper/Errors]---------------------------------------------------------------------->*/


// Multer error handler (nice messages)
app.use((err, req, res, next) => {
  if (err && err.message && err.message.includes("Invalid file type")) {
    return res.status(400).json({ message: err.message });
  }
  if (err && err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ message: "Image too large. Max 5MB." });
  }
  if (err) {
    console.error("Upload error:", err);
    return res.status(500).json({ message: "Server error during upload" });
  }
  next();
});
/*<------------------------------------------------------[AI Intergration]---------------------------------------------------------------------->*/

// ======================
// Helpers (put ABOVE the route, or near the bottom of server.js)
// ======================
function extractFirstJsonObject(text) {
  const first = text.indexOf("{");
  if (first === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = first; i < text.length; i++) {
    const ch = text[i];

    // handle strings so braces inside quotes don't break balancing
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    } else {
      if (ch === '"') {
        inString = true;
        continue;
      }
    }

    if (ch === "{") depth++;
    if (ch === "}") depth--;

    if (depth === 0) return text.slice(first, i + 1);
  }

  return null; // unbalanced braces
}

function safeJsonParse(rawText) {
  if (!rawText) return null;

  // remove common markdown fences if present
  let text = String(rawText).trim();
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();

  // 1) direct parse
  try {
    return JSON.parse(text);
  } catch (_) {}

  // 2) extract first complete JSON object and parse
  const jsonCandidate = extractFirstJsonObject(text);
  if (!jsonCandidate) return null;

  try {
    return JSON.parse(jsonCandidate);
  } catch (_) {
    return null;
  }
}

/* =====================================================
   AI RECOMMENDATIONS (TOP 10)
   GET /api/recommendations/:userId
   - If favourites exist => Gemini recommends based on favourites
   - If favourites = 0 => weighted-random based on TOT_FAV + TOT_BORROW
   Returns:
   { recommendedBookIds: [...], reasons: {BOOK_ID: "..."} }
===================================================== */
app.get("/api/recommendations/:userId", async (req, res) => {
  try {
    const TOP_N = 10;

    // ✅ Require login
    if (!req.session.user) {
      return res.status(401).json({ message: "Not logged in." });
    }

    const userId = req.params.userId;

    // ✅ Safety: user can only request own recommendations
    if (req.session.user.id !== userId) {
      return res.status(403).json({ message: "Forbidden (not your userId)." });
    }

    // --- Promisified DB query helper
    const dbQuery = (sql, params = []) =>
      new Promise((resolve, reject) => {
        db.query(sql, params, (err, rows) => {
          if (err) return reject(err);
          resolve(rows || []);
        });
      });

    // ==========================================
    // STEP 0: helper - weighted random pick (no replacement)
    // weight = (TOT_FAV*2 + TOT_BORROW*3 + 1)
    // +1 so weight never becomes 0
    // ==========================================
    function pickWeightedNoReplacement(items, k) {
      const pool = items.map((x) => ({ ...x })); // clone
      const picked = [];

      const weightOf = (b) => {
        const fav = Number(b.TOT_FAV || 0);
        const bor = Number(b.TOT_BORROW || 0);
        return fav * 2 + bor * 3 + 1;
      };

      for (let i = 0; i < k && pool.length > 0; i++) {
        let total = 0;
        const weights = pool.map((b) => {
          const w = weightOf(b);
          total += w;
          return w;
        });

        // Random number in [0, total)
        let r = Math.random() * total;

        let idx = 0;
        for (let j = 0; j < pool.length; j++) {
          r -= weights[j];
          if (r <= 0) {
            idx = j;
            break;
          }
        }

        picked.push(pool[idx]);
        pool.splice(idx, 1);
      }

      return picked;
    }

    // ==========================================
    // STEP A: USER FAVOURITES (taste context)
    // ==========================================
    const favSql = `
      SELECT 
        b.BOOK_ID,
        b.TITLE,
        b.GENRE,
        b.DESCRIPTION,
        a.AUTHOR_NAME
      FROM FAVOURITE f
      JOIN BOOK b ON f.BOOK_ID = b.BOOK_ID
      JOIN AUTHOR a ON b.AUTHOR_ID = a.AUTHOR_ID
      WHERE f.USER_ID = ?
    `;
    const favourites = await dbQuery(favSql, [userId]);

    // ==========================================
    // STEP B: If favourites = 0 => weighted random from popular
    // ==========================================
    if (!favourites.length) {
      const popularSql = `
        SELECT 
          b.BOOK_ID,
          b.TITLE,
          b.GENRE,
          b.DESCRIPTION,
          a.AUTHOR_NAME,
          b.BOOK_IMAGE,
          b.PUBLISHER,
          b.ISBN,
          b.PUBLICATION_DATE,
          b.BOOK_STATUS,
          b.TOT_FAV,
          b.TOT_BORROW
        FROM BOOK b
        JOIN AUTHOR a ON b.AUTHOR_ID = a.AUTHOR_ID
        WHERE b.BOOK_STATUS = 'Available'
      `;
      const availableBooks = await dbQuery(popularSql);

      if (!availableBooks.length) {
        return res.json({
          recommendedBookIds: [],
          reasons: {},
          message: "No available books to recommend.",
        });
      }

      // Pick TOP_N weighted random (popular bias)
      const picked = pickWeightedNoReplacement(availableBooks, TOP_N);

      const ids = picked.map((b) => b.BOOK_ID);
      const reasons = {};
      picked.forEach((b) => {
        reasons[b.BOOK_ID] =
          "You have no favourites yet. This is a popular pick recommended for you.";
      });

      return res.json({
        recommendedBookIds: ids,
        reasons,
      });
    }

    // ==========================================
    // STEP C: CANDIDATE BOOKS (exclude favourites)
    // ✅ Only recommend books that are Available
    // ==========================================
    const candidatesSql = `
      SELECT 
        b.BOOK_ID,
        b.TITLE,
        b.GENRE,
        b.DESCRIPTION,
        a.AUTHOR_NAME,
        b.TOT_FAV,
        b.TOT_BORROW
      FROM BOOK b
      JOIN AUTHOR a ON b.AUTHOR_ID = a.AUTHOR_ID
      WHERE b.BOOK_STATUS = 'Available'
        AND b.BOOK_ID NOT IN (
          SELECT BOOK_ID FROM FAVOURITE WHERE USER_ID = ?
        )
    `;
    const candidates = await dbQuery(candidatesSql, [userId]);

    if (!candidates.length) {
      return res.json({
        recommendedBookIds: [],
        reasons: {},
        message: "No available candidate books (maybe you liked them all?).",
      });
    }

    const candidateIdSet = new Set(candidates.map((c) => c.BOOK_ID));

    // ==========================================
    // STEP D: Ask Gemini (TOP 10)
    // ==========================================
    const prompt = `
      You are an intelligent librarian recommender.

      USER FAVOURITES (taste context):
      ${JSON.stringify(favourites)}

      CANDIDATE BOOKS (choose ONLY from here):
      ${JSON.stringify(candidates)}

      TASK:
      1) Analyze favourites to infer preferred genres, themes, and authors.
      2) Select EXACTLY ${TOP_N} books from CANDIDATE BOOKS that best match the user's taste.
      3) For each recommended book, include a short reason.

      STRICT OUTPUT (JSON ONLY, NO MARKDOWN, NO EXTRA TEXT):
      {
        "recommendations": [
          { "book_id": "Bxxx", "reason": "..." }
        ]
      }
      `;

    let aiObj = null;

    try {
      // Prefer JSON mode if your SDK supports it.
      // If not supported, it will fall back to plain generateContent(prompt).
      let result;
      try {
        result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" },
        });
      } catch {
        result = await model.generateContent(prompt);
      }

      const text = result?.response?.text?.() ?? "";
      aiObj = safeJsonParse(text);
    } catch (e) {
      console.error("❌ Gemini error:", e);
      aiObj = null;
    }

    // ==========================================
    // STEP E: Validate + clean AI recommendations
    // ==========================================
    const cleaned = [];
    const reasons = {};

    const recs = aiObj?.recommendations;
    if (Array.isArray(recs)) {
      for (const r of recs) {
        const id = String(r?.book_id || "").trim();
        const reason = String(r?.reason || "").trim();

        if (!candidateIdSet.has(id)) continue;
        if (cleaned.includes(id)) continue;

        cleaned.push(id);
        reasons[id] = reason || "Recommended based on your favourites.";
        if (cleaned.length === TOP_N) break;
      }
    }

    // Fill if AI returned < TOP_N valid IDs (fallback by popularity)
    if (cleaned.length < TOP_N) {
      const remaining = candidates
        .filter((c) => !cleaned.includes(c.BOOK_ID))
        .sort((a, b) => {
          const favDiff = (b.TOT_FAV || 0) - (a.TOT_FAV || 0);
          if (favDiff !== 0) return favDiff;
          const borDiff = (b.TOT_BORROW || 0) - (a.TOT_BORROW || 0);
          if (borDiff !== 0) return borDiff;
          return String(a.TITLE || "").localeCompare(String(b.TITLE || ""));
        });

      for (const c of remaining) {
        if (cleaned.length === TOP_N) break;
        cleaned.push(c.BOOK_ID);
        reasons[c.BOOK_ID] =
          "Filled by popularity (likes + borrows) to complete your Top 10.";
      }
    }

    return res.json({
      recommendedBookIds: cleaned,
      reasons,
    });
  } catch (err) {
    console.error("❌ Recommendation route error:", err);
    return res.status(500).json({
      message: "Recommendation generation failed",
      error: err.message,
    });
  }
});


/*<------------------------------------------------------[listen]---------------------------------------------------------------------->*/
app.post("/api/sync-overdue-fines", (req, res) => {
  try {
    syncOverdueFines();
    res.json({ message: "Sync triggered" });
  } catch (e) {
    res.status(500).json({ message: "Sync failed" });
  }
});



function syncOverdueFines() {
  console.log("🔄 Syncing overdue fines...");

  function generateNextFineId(callback) {
    const getLastFineIdSql = `
      SELECT FINE_ID
      FROM FINE
      ORDER BY CAST(SUBSTRING(FINE_ID, 2) AS UNSIGNED) DESC
      LIMIT 1
    `;

    db.query(getLastFineIdSql, (err, rows) => {
      if (err) return callback(err);

      let nextNumber = 1;
      if (rows.length > 0 && rows[0].FINE_ID) {
        const num = parseInt(String(rows[0].FINE_ID).substring(1), 10);
        if (!isNaN(num)) nextNumber = num + 1;
      }

      const fineId = "F" + String(nextNumber).padStart(3, "0");
      callback(null, fineId);
    });
  }

  // 1️⃣ Overdue borrows → set Overdue + upsert Late Return fine
  const overdueSql = `
    SELECT BORROW_ID, DUE_DATE
    FROM BORROW
    WHERE DATE_RETURN IS NULL
      AND DUE_DATE < CURDATE()
      AND BORROW_STATUS IN ('Borrowed', 'Overdue')
  `;

  db.query(overdueSql, (err, borrows) => {
    if (err) {
      console.error("❌ Borrow fetch error:", err);
      return;
    }

    borrows.forEach((borrow) => {
      // ✅ Mark borrow as Overdue
      const markOverdueSql = `
        UPDATE BORROW
        SET BORROW_STATUS = 'Overdue'
        WHERE BORROW_ID = ?
      `;

      db.query(markOverdueSql, [borrow.BORROW_ID], (err0) => {
        if (err0) console.error("❌ Update borrow to Overdue error:", err0);
      });

      // ✅ Calculate total fine (RM1/day)
      const overdueDays = Math.max(
        1,
        Math.ceil(
          (new Date() - new Date(borrow.DUE_DATE)) / (1000 * 60 * 60 * 24)
        )
      );
      const fineAmount = overdueDays * 1;

      // ✅ If Late Return fine exists & Unpaid → update its total amount
      const checkFineSql = `
        SELECT FINE_ID
        FROM FINE
        WHERE BORROW_ID = ?
          AND FINE_TYPE = 'Late Return'
          AND FINE_STATUS = 'Unpaid'
        LIMIT 1
      `;

      db.query(checkFineSql, [borrow.BORROW_ID], (err2, fineRows) => {
        if (err2) {
          console.error("❌ Fine check error:", err2);
          return;
        }

        if (fineRows.length > 0) {
          // ✅ UPDATE total fine amount (overwrite to correct total)
          const updateFineSql = `
            UPDATE FINE
            SET AMOUNT = ?, ISSUED_DATE = CURDATE()
            WHERE FINE_ID = ?
          `;

          return db.query(updateFineSql, [fineAmount, fineRows[0].FINE_ID], (err3) => {
            if (err3) console.error("❌ Fine update error:", err3);
          });
        }

        // ✅ Otherwise create a new Late Return fine
        generateNextFineId((err3, fineId) => {
          if (err3) {
            console.error("❌ Generate fine ID error:", err3);
            return;
          }

          const insertFineSql = `
            INSERT INTO FINE (
              FINE_ID,
              BORROW_ID,
              AMOUNT,
              FINE_TYPE,
              FINE_STATUS,
              ISSUED_DATE,
              LIB_ID
            )
            VALUES (?, ?, ?, 'Late Return', 'Unpaid', CURDATE(), NULL)
          `;

          db.query(insertFineSql, [fineId, borrow.BORROW_ID, fineAmount], (err4) => {
            if (err4) console.error("❌ Fine insert error:", err4);
          });
        });
      });
    });
  });

  // 2️⃣ Returned borrows → mark Late Return fine Paid
  const returnedSql = `
    SELECT BORROW_ID
    FROM BORROW
    WHERE BORROW_STATUS = 'Returned'
  `;

  db.query(returnedSql, (err, returnedBorrows) => {
    if (err) {
      console.error("❌ Returned borrow fetch error:", err);
      return;
    }

    returnedBorrows.forEach((borrow) => {
      const updateFineSql = `
        UPDATE FINE
        SET FINE_STATUS = 'Paid'
        WHERE BORROW_ID = ?
          AND FINE_TYPE = 'Late Return'
          AND FINE_STATUS = 'Unpaid'
      `;

      db.query(updateFineSql, [borrow.BORROW_ID], (err2) => {
        if (err2) console.error("❌ Mark fine as paid error:", err2);
      });
    });
  });
}



app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});