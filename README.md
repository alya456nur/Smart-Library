# SMART Library Management System

A full-stack library management system designed to simplify book discovery, borrowing, and library administration. The system provides separate interfaces for library users and librarians, along with AI-powered book recommendations.

## About the Project

SMART Library is a web-based library management system that allows users to browse books, manage their borrowing activities, track fines, and receive personalized book recommendations.

The system also provides an administrative dashboard for librarians to manage the book inventory, borrowing requests, users, librarians, and fines.

## Features

### User Features
- User registration and login
- Browse and search available books
- View book details
- Request to borrow books
- Track borrowed books and borrowing history
- Manage favourite books
- View borrowing requests
- Check outstanding and paid fines
- Update user profile
- Reset password
- AI-powered book recommendations

### Librarian/Admin Features
- Administrator login and dashboard
- Manage book inventory (add, edit, and delete books)
- Manage borrowing requests
- Track borrowed and returned books
- Manage library users
- Manage librarian accounts
- Issue and manage fines
- View user borrowing information
- Manage librarian profile

## Technologies Used

**Frontend**
- HTML5
- CSS3
- JavaScript
- Bootstrap 5
- Bootstrap Icons

**Backend**
- Node.js
- Express.js
- MySQL
- MySQL2
- Express Session
- Bcrypt

**AI Integration**
- Google Gemini API

## Project Structure

```text
Smart Library/
│
├── admin/                  # Librarian/admin pages
│
├── user/                   # Library user pages
│
├── assets/
│   ├── css/                # Stylesheets
│   ├── js/                 # Frontend JavaScript
│   ├── icons/              # Application icons
│   └── images/             # Book covers and images
│
├── backend/
│   ├── server.js           # Express server and API routes
│   ├── adminHash.js        # Librarian password hashing utility
│   ├── hashPasswords.js    # User password hashing utility
│   ├── package.json        # Backend dependencies
│   └── .env.example        # Environment variable template
│
├── smart_library.sql       # MySQL database
│
└── README.md
```

## Getting Started

### Prerequisites

Make sure you have installed:

- Node.js and npm
- MySQL Server
- MySQL Workbench (recommended)
- Visual Studio Code
- VS Code Live Server extension

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR-USERNAME/smart-library-management-system.git
```

Navigate to the project directory:

```bash
cd smart-library-management-system
```

### 2. Set Up the Database

1. Start your MySQL server.
2. Open MySQL Workbench.
3. Import and execute the `smart_library.sql` file.
4. Make sure the database name matches the `DB_NAME` value in your environment configuration.

### 3. Configure Environment Variables

Navigate to the `backend` folder.

Create a `.env` file using `.env.example` as a template.

Fill in your own database credentials and Gemini API key.

```env
GEMINI_API_KEY=your_gemini_api_key

DB_HOST=localhost
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
DB_NAME=your_database_name

SESSION_SECRET=your_random_session_secret
```

**Important:** Never upload your actual `.env` file or expose API keys, database passwords, or session secrets on GitHub.

### 4. Install Backend Dependencies

Open a terminal and navigate to the backend directory:

```bash
cd backend
```

Install the required dependencies:

```bash
npm install
```

### 5. Start the Backend Server

Run:

```bash
npm start
```

The backend server runs at:

```text
http://localhost:3000
```

### 6. Launch the Frontend

1. Open the project in Visual Studio Code.
2. Navigate to `user/index.html`.
3. Right-click the file.
4. Select **Open with Live Server**.

The frontend is configured to communicate with the local backend using port 3000. The backend CORS configuration currently allows the Live Server origins on ports 5500.

## AI Integration

The system integrates the Google Gemini API to generate personalized book recommendations.

The API key is configured through an environment variable and should be kept private.

## Database

The system uses MySQL to manage:

- Users
- Librarians
- Authors
- Books
- Favourites
- Borrowing requests
- Borrowing records
- Fines
- Receipts

## Notes

- This project is configured for local development.
- A MySQL database and a valid Gemini API key are required for the corresponding features.
- The payment interface currently records payment information in browser local storage; it is not a real payment gateway integration.

## Developer

Developed as an academic project.
