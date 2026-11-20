-- COPY PASTE DALAM SQL QUERY
-- Database: `smart_library`
DROP DATABASE IF EXISTS `smart_library`;
CREATE DATABASE IF NOT EXISTS `smart_library` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `smart_library`;

-- create table ‘USERS’
CREATE TABLE USERS (
    USER_ID VARCHAR(20) PRIMARY KEY,
    USER_FNAME VARCHAR(255) NOT NULL,
    USER_LNAME VARCHAR(255) NOT NULL,
    USER_GENDER VARCHAR(20) NOT NULL,
    USER_CONTACT VARCHAR(15) NOT NULL,
    USER_EMAIL VARCHAR(50) NOT NULL UNIQUE,
    USER_PASSWORD VARCHAR(255) NOT NULL
);

-- dumping data for table ‘USERS’
INSERT INTO USERS(USER_ID, USER_FNAME, USER_LNAME, USER_GENDER, USER_CONTACT, USER_EMAIL, USER_PASSWORD) 
VALUES 
('U001', 'NUR', 'BATRISYA', 'FEMALE', '0152928775', 'bat@gmail.com', 'batrisya123'),
('U002', 'NURUL', 'NABILAH', 'FEMALE', '0162928775', 'nab@gmail.com', 'nabilah123'),
('U003', 'ZANJABILA', 'RAUDHA', 'FEMALE', '0172928775', 'raudha@gmail.com', 'raudha123'),
('U004','ALI','MIKAIL','MALE','0123435366','mikail02@gmail.com','ali123'),
('U005','ADAM','SYAKIR','MALE','0145758599','adam03@gmail.com','adam123');

-- create table ‘LIBRARIAN’
CREATE TABLE LIBRARIAN (
    LIB_ID VARCHAR(20) PRIMARY KEY,
    LIB_FNAME VARCHAR(255) NOT NULL,
    LIB_LNAME VARCHAR(255) NOT NULL,
    LIB_GENDER VARCHAR(20) NOT NULL,
    LIB_CONTACT VARCHAR(15) NOT NULL,
    LIB_EMAIL VARCHAR(50) NOT NULL UNIQUE,
    LIB_PASSWORD VARCHAR(255) NOT NULL
);

-- dumping data for table ‘LIBRARIAN’
INSERT INTO LIBRARIAN (LIB_ID, LIB_FNAME, LIB_LNAME, LIB_GENDER, LIB_CONTACT, LIB_EMAIL, LIB_PASSWORD)
VALUES
('L001', 'FARAH', 'ADIBAH', 'FEMALE', '0132233445', 'frh_lib@gmail.com', 'farah123'),
('L002', 'ALYA', 'KHALISHA', 'FEMALE', '0179988776', 'khalisha.lib@gmail.com', 'khalisha123'),
('L003', 'HARIESA', 'HAZIERA', 'FEMALE', '0132928775', 'ziera.lib@gmail.com', 'haziera123'),
('L004', 'ALYA', 'NABILAH', 'FEMALE', '0142928775', 'alya.lib@gmail.com', 'alya123');

-- create table ‘AUTHOR’
CREATE TABLE AUTHOR ( 
    AUTHOR_ID VARCHAR(20) PRIMARY KEY, 
    AUTHOR_NAME VARCHAR(255)
);

-- dumping data for table ‘AUTHOR’
INSERT INTO AUTHOR(AUTHOR_ID, AUTHOR_NAME)
VALUES
('A001','HILAL ASYRAF'),
('A002','HAMKA'),
('A003','JK ROWLING');

-- create table ‘BOOK’
CREATE TABLE BOOK (
    BOOK_ID VARCHAR(20) PRIMARY KEY,
    AUTHOR_ID VARCHAR(20) NOT NULL,
    TITLE VARCHAR(255) NOT NULL,
    GENRE VARCHAR(100) NOT NULL,
    DESCRIPTION TEXT,
    PUBLISHER VARCHAR(255),
    ISBN VARCHAR(50),
    PUBLICATION_DATE DATE,
    BOOK_STATUS VARCHAR(50) NOT NULL,
    BOOK_IMAGE VARCHAR(255),
    TOT_FAV INT NOT NULL DEFAULT 0,
    TOT_BORROW INT NOT NULL DEFAULT 0,
    
    FOREIGN KEY (AUTHOR_ID) REFERENCES AUTHOR(AUTHOR_ID)
);

-- dumping data for table ‘BOOK’
INSERT INTO BOOK(BOOK_ID, AUTHOR_ID, TITLE, GENRE, DESCRIPTION, PUBLISHER, ISBN, PUBLICATION_DATE, BOOK_STATUS, BOOK_IMAGE, TOT_FAV, TOT_BORROW)
VALUES
('B001', 'A001', 'Hero', 'Fantasy', 'Hero berjuang melawan jenayah dan musuh misteri sambil mempertahankan kota dan jiwanya.', 'Hilal Asyraf Resources', '978-0-060-59452-1', '2019-05-12', 'Available', 'hero.jpg', 2, 0),
('B002', 'A001', 'Pemburu', 'Fantasy', NULL, 'Hilal Asyraf Resources', '978-0-143-12774-1', '2025-09-22', 'Unavailable', 'pemburu.jpg', 1, 0),
('B003', 'A001', 'Surihati Encik Pembunuh', 'Fantasy', 'Faisal, ‘Izrail’ yang bergelut dengan masa lalunya, berdepan organisasi rahsia yang mengancam Malaysia sambil cuba menyelamatkan dirinya dan Amirah. ', 'Hilal Asyraf Resources', '978-0-143-12774-3', '2016-02-12', 'Available', 'suri-hati-encik-pembunuh.jpg', 1, 0),
('B004', 'A002', 'Tuan Direktur Edisi 2023', 'Fiction', NULL, 'PTS Publishing House', '978-1-250-14512-3', '2020-03-10', 'Unavailable', 'tuan-direktur.jpg', 2, 0),
('B005', 'A002', 'Di Bawah Lindungan Kaabah Edisi 2023', 'Fiction', NULL, 'PTS Publishing House', '978-0-525-57361-8', '2020-11-02', 'Available', 'di-bawah-lindungan-kaabah.jpg', 1, 0),
('B006', 'A002', 'Merantau Ke Deli Edisi 2023', 'Fiction', 'Novel ini mengisahkan cinta seorang lelaki perantau dan perempuan setia yang diuji oleh pilihan antara kasih dan darjat keturunan.', 'PTS Publishing House', '978-0-525-57362-8', '2020-12-02', 'Available', 'merantau-ke-deli.jpg', 1, 0),
('B007', 'A003', 'Harry Potter and the Chamber of Secrets', 'Fantasy', 'Second book in the Harry Potter series.', 'Bloomsbury', '978-0-747-53849-3', '1998-07-02', 'Available', 'hp-thechambersecrets.jpg', 1, 0),
('B008', 'A003', 'Harry Potter and the Sorcerer Stone', 'Fantasy', 'The first book in the Harry Potter series.', 'Bloomsbury', '978-0-747-53269-9', '1997-06-26', 'Available', 'hp-thesorcerer.jpg', 1, 1),
('B009', 'A003', 'Harry Potter and the Prisoner of Azkaban', 'Fantasy', 'Third book in the Harry Potter series.', 'Bloomsbury', '978-0-747-54215-5', '1999-07-08', 'Available', 'hp-theprisoner.jpg', 1, 0),
('B010', 'A002', 'Ayahku', 'Fiction', 'Kisah cinta dan pengorbanan seorang ayah terhadap anaknya.', 'PTS Publishing House', '978-0-747-54212-3', '2023-07-08', 'Available', 'ayahku.jpg', 1, 0);

-- create table ‘FAVOURITE’
CREATE TABLE FAVOURITE (
    USER_ID VARCHAR(20) NOT NULL,
    BOOK_ID VARCHAR(20) NOT NULL,
    
    PRIMARY KEY (USER_ID, BOOK_ID),
    FOREIGN KEY (USER_ID) REFERENCES USERS(USER_ID) ON DELETE CASCADE,
    FOREIGN KEY (BOOK_ID) REFERENCES BOOK(BOOK_ID) ON DELETE CASCADE
);

-- dumping data for table ‘FAVOURITE’
INSERT INTO FAVOURITE(USER_ID, BOOK_ID)
VALUES
('U001', 'B001'),
('U001', 'B004'),
('U001', 'B009'),
('U002', 'B002'),
('U002', 'B003'),
('U003', 'B005'),
('U003', 'B007'),
('U004', 'B001'),
('U004', 'B006'),
('U005', 'B004'),
('U005', 'B008'),
('U005', 'B010');

-- create table ‘REQUEST’
CREATE TABLE `REQUEST` (
    REQUEST_ID VARCHAR(20) PRIMARY KEY,
    USER_ID VARCHAR(20) NOT NULL,
    BOOK_ID VARCHAR(20) NOT NULL,
    REQUEST_DATE DATE DEFAULT (CURRENT_DATE),
    REQUEST_STATUS VARCHAR(20) NOT NULL DEFAULT 'Pending',
    LIB_ID VARCHAR(20),

    FOREIGN KEY (USER_ID) REFERENCES USERS(USER_ID) ON DELETE CASCADE,
    FOREIGN KEY (BOOK_ID) REFERENCES BOOK(BOOK_ID) ON DELETE CASCADE,
    FOREIGN KEY (LIB_ID) REFERENCES LIBRARIAN(LIB_ID)
);


-- dumping data for table ‘REQUEST’
INSERT INTO `REQUEST`(REQUEST_ID, USER_ID, BOOK_ID, REQUEST_DATE, REQUEST_STATUS, LIB_ID)
VALUES
('Q001', 'U001', 'B001', '2025-01-05', 'Pending', NULL),
('Q002', 'U002', 'B003', '2025-01-06', 'Approved', 'L001'),
('Q003', 'U003', 'B002', '2025-01-07', 'Rejected', 'L001'),
('Q004', 'U004', 'B001', '2025-01-08', 'Pending', NULL),
('Q005', 'U005', 'B005', '2025-01-09', 'Approved', 'L002'),
('Q006', 'U001', 'B006', '2025-01-10', 'Approved', 'L002'),
('Q007', 'U002', 'B007', '2025-01-11', 'Approved', 'L001'),
('Q008', 'U003', 'B008', '2025-01-12', 'Approved', 'L003'),
('Q009', 'U004', 'B009', '2025-01-13', 'Approved', 'L004'),
('Q010', 'U003', 'B004', '2025-01-14', 'Rejected', 'L004'),
('Q011', 'U004', 'B010', '2025-01-15', 'Approved', 'L003');

-- create table ‘BORROW’
CREATE TABLE BORROW (
    BORROW_ID VARCHAR(20) PRIMARY KEY,
    REQUEST_ID VARCHAR(20) NOT NULL,
    DATE_BORROWED DATE,
    DUE_DATE DATE,
    DATE_RETURN DATE,
    BORROW_STATUS VARCHAR(20) NOT NULL,
    
    FOREIGN KEY (REQUEST_ID) REFERENCES REQUEST(REQUEST_ID)
);

-- dumping data for table ‘BORROW’
INSERT INTO BORROW(BORROW_ID, REQUEST_ID, DATE_BORROWED, DUE_DATE, DATE_RETURN, BORROW_STATUS)
VALUES
('BR001', 'Q002', '2025-01-06', '2025-01-20', NULL, 'Lost'), 
('BR002', 'Q005', '2025-01-09', '2025-01-23', NULL, 'Not Picked Up'),
('BR003', 'Q006', '2025-01-10', '2025-01-24', '2025-01-21', 'Returned'),
('BR004', 'Q010', '2025-01-14', '2025-01-28', '2025-01-29', 'Returned'),
('BR005', 'Q007', '2025-01-11', '2025-01-23', '2025-01-27', 'Returned'),
('BR006', 'Q008', '2025-01-12', '2025-01-26', NULL, 'Borrowed'),
('BR007', 'Q009', '2025-01-13', '2025-01-27', NULL, 'Ready for Pickup'); 

-- create table ‘FINE’
CREATE TABLE FINE (
    FINE_ID VARCHAR(20) PRIMARY KEY,
    BORROW_ID VARCHAR(20) NOT NULL,
    AMOUNT DECIMAL(10,2),
    FINE_TYPE VARCHAR(20),
    FINE_STATUS VARCHAR(20) NOT NULL,
    ISSUED_DATE DATE,
    LIB_ID VARCHAR(20) NOT NULL,
    
    FOREIGN KEY (BORROW_ID) REFERENCES BORROW(BORROW_ID),
    FOREIGN KEY (LIB_ID) REFERENCES LIBRARIAN(LIB_ID)
);

-- dumping data for table FINE
INSERT INTO FINE(FINE_ID, BORROW_ID, AMOUNT, FINE_TYPE, FINE_STATUS, ISSUED_DATE, LIB_ID)
VALUES
('F001', 'BR004', 1.00, 'Late Return', 'Paid', '2025-01-28', 'L004'),
('F002', 'BR005', 5.00, 'Late Return', 'Unpaid', '2025-01-23', 'L001');

-- create table ‘RECEIPT’
CREATE TABLE RECEIPT (
    RECEIPT_ID VARCHAR(20) PRIMARY KEY,
    FINE_ID VARCHAR(20) NOT NULL,
    PAY_DATE DATE DEFAULT (CURRENT_DATE),
    PAY_METHOD VARCHAR(20),

    FOREIGN KEY (FINE_ID) REFERENCES FINE(FINE_ID)
);

-- dumping data for table ‘RECEIPT’
INSERT INTO RECEIPT(RECEIPT_ID, FINE_ID, PAY_DATE, PAY_METHOD)
VALUES
('R001', 'F001', '2025-01-29', 'Cash');


COMMIT;