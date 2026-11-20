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
('A003','JK ROWLING'),
('A004', 'Harper Lee'),
('A005', 'George Orwell'),
('A006', 'Yuval Noah Harari'),
('A007', 'Tara Westover'),
('A008', 'Stephen Hawking'),
('A009', 'Siddhartha Mukherjee'),
('A010', 'J.R.R. Tolkien'),
('A011', 'Stieg Larsson'),
('A012', 'Gillian Flynn'),
('A013', 'Walter Isaacson'),
('A014', 'Michelle Obama'),
('A015', 'Frank Herbert'),
('A016', 'Andy Weir'),
('A017', 'Robert Kiyosaki'),
('A018', 'Benjamin Graham'),
('A019', 'Jane Austen'),
('A020', 'Nicholas Sparks'),
('A021', 'Stephen King'),
('A022', 'Bram Stoker'),
('A023', 'James Clear'),
('A024', 'Stephen R. Covey'),
('A025', 'Howard Zinn'),
('A026', 'Jared Diamond'),
('A027', 'Elizabeth Gilbert'),
('A028', 'Jon Krakauer'),
('A089', 'Alice Walker'),
('A090', 'Aldous Huxley'),
('A091', 'Margaret Atwood'),
('A092', 'Cormac McCarthy'),
('A093', 'Kazuo Ishiguro'),
('A094', 'Donna Tartt'),
('A095', 'Delia Owens'),
('A096', 'Truman Capote'),
('A097', 'Jon Krakauer'),
('A098', 'Erik Larson'),
('A099', 'Laura Hillenbrand'),
('A100', 'Isabel Wilkerson'),
('A101', 'Michelle Alexander'),
('A102', 'Ta-Nehisi Coates'),
('A103', 'John Carreyrou'),
('A104', 'Tara Westover'),
('A105', 'Isabel Wilkerson'),
('A106', 'Bill Bryson'),
('A107', 'Richard Rhodes'),
('A108', 'Thomas Kuhn'),
('A109', 'Richard Dawkins'),
('A110', 'E.O. Wilson'),
('A111', 'Carl Sagan'),
('A112', 'Dava Sobel'),
('A113', 'Peter Wohlleben'),
('A114', 'Friedrich Nietzsche'),
('A115', 'Nick Lane'),
('A116', 'Peter S. Beagle'),
('A117', 'Michael Ende'),
('A118', 'Susan Cooper'),
('A119', 'William Goldman'),
('A120', 'Neil Gaiman'),
('A121', 'Neil Gaiman & Terry Pratchett'),
('A122', 'T.H. White'),
('A123', 'Susanna Clarke'),
('A124', 'Naomi Novik'),
('A125', 'Katherine Arden'),
('A126', 'Alexander McCall Smith'),
('A127', 'Donna Tartt'),
('A128', 'Tana French'),
('A129', 'Jo Nesbø'),
('A130', 'Paula Hawkins'),
('A131', 'Liane Moriarty'),
('A132', 'Agatha Christie'),
('A133', 'Daphne du Maurier'),
('A134', 'Patricia Highsmith'),
('A135', 'Caleb Carr'),
('A136', 'David Bach'),
('A137', 'Ramit Sethi'),
('A138', 'David Chilton'),
('A139', 'Robert Kiyosaki'),
('A140', 'Napoleon Hill'),
('A141', 'George S. Clason'),
('A142', 'Joel Greenblatt'),
('A143', 'Andrew Tobias'),
('A144', 'Mohnish Pabrai'),
('A145', 'Edward O. Thorp'),
('A146', 'Nelson Mandela'),
('A147', 'Anne Frank'),
('A148', 'Maya Angelou'),
('A149', 'Malcolm X & Alex Haley'),
('A150', 'Elie Wiesel'),
('A151', 'Mahatma Gandhi'),
('A152', 'David McCullough'),
('A153', 'Ron Chernow'),
('A154', 'Andrew Roberts'),
('A155', 'Walter Isaacson'),
('A156', 'Isaac Asimov'),
('A157', 'William Gibson'),
('A158', 'Neal Stephenson'),
('A159', 'Philip K. Dick'),
('A160', 'Ursula K. Le Guin'),
('A161', 'Orson Scott Card'),
('A162', 'Liu Cixin'),
('A163', 'Dan Simmons'),
('A164', 'Neal Stephenson'),
('A165', 'Kim Stanley Robinson'),
('A166', 'HARUKI MURAKAMI'),
('A167', 'DAN BROWN'),
('A168', 'KHALED HOSSEINI'),
('A169', 'SUZANNE COLLINS'),
('A170', 'PAULO COELHO'),
('A171', 'OSCAR WILDE'),
('A172', 'MARK TWAIN'),
('A173', 'RICK RIORDAN'),
('A174', 'LEIGH BARDUGO');

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
('B010', 'A002', 'Ayahku', 'Fiction', 'Kisah cinta dan pengorbanan seorang ayah terhadap anaknya.', 'PTS Publishing House', '978-0-747-54212-3', '2023-07-08', 'Available', 'ayahku.jpg', 1, 0),
('B011', 'A004', 'To Kill a Mockingbird', 'Fiction', 'A classic novel about racial injustice and moral growth in the American South.', 'HarperCollins', '978-0-062-11249-7', '1960-07-11', 'Available', 'to-kill-mockingbird.jpg', 0, 0),
('B013', 'A006', 'Sapiens: A Brief History of Humankind', 'Non-Fiction', 'Explores the history of human species from evolution to modern times.', 'Harper', '978-0-062-31202-9', '2011-02-10', 'Available', 'sapiens.jpg', 0, 0),
('B014', 'A007', 'Educated', 'Non-Fiction', 'A memoir about a woman who leaves her survivalist family and goes on to earn a PhD.', 'Random House', '978-0-399-59050-4', '2018-02-20', 'Available', 'educated.jpg', 0, 0),
('B015', 'A008', 'A Brief History of Time', 'Science', 'Explores fundamental questions about the universe and reality.', 'Bantam Books', '978-0-553-05340-1', '1988-03-01', 'Available', 'brief-history-time.jpg', 0, 0),
('B016', 'A009', 'The Gene: An Intimate History', 'Science', 'Explores the history and impact of genetics on human life.', 'Scribner', '978-1-476-73352-8', '2016-05-17', 'Available', 'the-gene.jpg', 0, 0),
('B017', 'A010', 'The Hobbit', 'Fantasy', 'A fantasy novel about Bilbo Baggins and his adventurous journey.', 'Allen & Unwin', '978-0-618-26030-0', '1937-09-21', 'Available', 'the-hobbit.jpg', 0, 0),
('B018', 'A010', 'The Lord of the Rings', 'Fantasy', 'Epic fantasy trilogy about the quest to destroy the One Ring.', 'Allen & Unwin', '978-0-618-26030-1', '1954-07-29', 'Available', 'lord-of-rings.jpg', 0, 0),
('B019', 'A011', 'The Girl with the Dragon Tattoo', 'Mystery', 'A journalist and a hacker investigate a decades-old disappearance.', 'Norstedts Förlag', '978-0-307-45454-6', '2005-08-01', 'Available', 'dragon-tattoo.jpg', 0, 0),
('B020', 'A012', 'Gone Girl', 'Mystery', 'A psychological thriller about a marriage gone terribly wrong.', 'Crown Publishing', '978-0-307-58836-4', '2012-05-24', 'Available', 'gone-girl.jpg', 0, 0),
('B021', 'A013', 'Steve Jobs', 'Biography', 'Biography of Apple co-founder Steve Jobs.', 'Simon & Schuster', '978-1-451-64854-0', '2011-10-24', 'Available', 'steve-jobs.jpg', 0, 0),
('B022', 'A014', 'Becoming', 'Biography', 'Memoir of former First Lady Michelle Obama.', 'Crown Publishing', '978-1-524-76317-3', '2018-11-13', 'Available', 'becoming.jpg', 0, 0),
('B023', 'A015', 'Dune', 'Science Fiction', 'Epic science fiction set in the distant future amidst feudal interstellar society.', 'Chilton Books', '978-0-441-17271-9', '1965-08-01', 'Available', 'dune.jpg', 0, 0),
('B024', 'A016', 'The Martian', 'Science Fiction', 'An astronaut is stranded on Mars and must survive until rescue.', 'Crown Publishing', '978-0-804-13902-1', '2011-09-27', 'Available', 'the-martian.jpg', 0, 0),
('B025', 'A017', 'Rich Dad Poor Dad', 'Finance', 'Teaches financial literacy through the story of two fathers.', 'Plata Publishing', '978-1-612-68045-2', '1997-04-01', 'Available', 'rich-dad-poor-dad.jpg', 0, 0),
('B026', 'A018', 'The Intelligent Investor', 'Finance', 'A classic text on value investing by Benjamin Graham.', 'Harper & Brothers', '978-0-062-05566-0', '1949-01-01', 'Available', 'intelligent-investor.jpg', 0, 0),
('B027', 'A019', 'Sense and Sensibility', 'Fiction', 'Story of the Dashwood sisters as they come of age in Georgian England.', 'Thomas Egerton', '978-0-141-43971-0', '1811-10-30', 'Available', 'sense-sensibility.jpg', 0, 0),
('B028', 'A019', 'Emma', 'Fiction', 'About youthful hubris and romantic misunderstandings in Regency England.', 'John Murray', '978-0-141-43972-0', '1815-12-23', 'Available', 'emma.jpg', 0, 0),
('B029', 'A019', 'Mansfield Park', 'Fiction', 'Follows young Fanny Price as she grows up in her wealthy relatives home.', 'Thomas Egerton', '978-0-141-43973-0', '1814-07-01', 'Available', 'mansfield-park.jpg', 0, 0),
('B030', 'A089', 'The Color Purple', 'Fiction', 'Epistolary novel about the life of African-American women in early 20th century Georgia.', 'Harcourt Brace Jovanovich', '978-0-151-19217-6', '1982-06-01', 'Available', 'color-purple.jpg', 0, 0),
('B031', 'A090', 'Brave New World', 'Fiction', 'Dystopian novel set in a futuristic World State with genetic engineering and psychological manipulation.', 'Chatto & Windus', '978-0-061-77097-8', '1932-01-01', 'Available', 'brave-new-world.jpg', 0, 0),
('B032', 'A091', 'The Handmaid\'s Tale', 'Fiction', 'Dystopian novel set in a totalitarian society where women are subjugated.', 'McClelland and Stewart', '978-0-771-08153-0', '1985-08-01', 'Available', 'handmaids-tale.jpg', 0, 0),
('B033', 'A092', 'The Road', 'Fiction', 'Post-apocalyptic novel about a father and son journeying through a burned America.', 'Alfred A. Knopf', '978-0-307-26543-2', '2006-09-26', 'Available', 'the-road.jpg', 0, 0),
('B034', 'A093', 'Never Let Me Go', 'Fiction', 'Science fiction novel about students at a boarding school with a dark secret.', 'Faber and Faber', '978-0-571-22425-4', '2005-02-03', 'Available', 'never-let-me-go.jpg', 0, 0),
('B035', 'A094', 'The Goldfinch', 'Fiction', 'Coming-of-age novel about a boy who survives a terrorist attack and steals a painting.', 'Little, Brown', '978-0-316-06542-7', '2013-10-22', 'Available', 'the-goldfinch.jpg', 0, 0),
('B036', 'A095', 'Where the Crawdads Sing', 'Fiction', 'Mystery and coming-of-age novel about an isolated girl in the marshes of North Carolina.', 'G.P. Putnam\'s Sons', '978-0-735-21350-0', '2018-08-14', 'Available', 'crawdads-sing.jpg', 0, 0),
('B037', 'A096', 'In Cold Blood', 'Non-Fiction', 'True crime novel about the murder of the Clutter family in Kansas.', 'Random House', '978-0-679-74558-5', '1965-11-17', 'Available', 'in-cold-blood.jpg', 0, 0),
('B038', 'A097', 'Into Thin Air', 'Non-Fiction', 'First-hand account of the 1996 Mount Everest disaster.', 'Villard Books', '978-0-679-45752-4', '1997-10-01', 'Available', 'into-thin-air.jpg', 0, 0),
('B039', 'A098', 'The Devil in the White City', 'Non-Fiction', 'Parallel stories of the 1893 World\'s Fair and a serial killer in Chicago.', 'Crown Publishing', '978-0-375-50860-9', '2003-02-11', 'Available', 'devil-white-city.jpg', 0, 0),
('B040', 'A099', 'Unbroken', 'Non-Fiction', 'Biography of Olympic runner and WWII prisoner of war survivor Louis Zamperini.', 'Random House', '978-1-400-06416-2', '2010-11-16', 'Available', 'unbroken.jpg', 0, 0),
('B041', 'A100', 'The Warmth of Other Suns', 'Non-Fiction', 'History of the Great Migration of African Americans from the South to Northern cities.', 'Random House', '978-0-679-44432-6', '2010-09-07', 'Available', 'warmth-other-suns.jpg', 0, 0),
('B042', 'A101', 'The New Jim Crow', 'Non-Fiction', 'Examines mass incarceration of African Americans in the United States.', 'The New Press', '978-1-595-58443-8', '2010-01-05', 'Available', 'new-jim-crow.jpg', 0, 0),
('B043', 'A102', 'Between the World and Me', 'Non-Fiction', 'Letter to the author\'s son about being Black in America.', 'Spiegel & Grau', '978-0-812-99314-7', '2015-07-14', 'Available', 'between-world-me.jpg', 0, 0),
('B044', 'A103', 'Bad Blood', 'Non-Fiction', 'Expose of the rise and fall of Theranos and its founder Elizabeth Holmes.', 'Alfred A. Knopf', '978-1-524-73126-4', '2018-05-21', 'Available', 'bad-blood.jpg', 0, 0),
('B045', 'A104', 'Educating', 'Non-Fiction', 'Sequel to Educated, exploring higher education and personal transformation.', 'Random House', '978-0-399-59051-1', '2020-02-25', 'Available', 'educating.jpg', 0, 0),
('B046', 'A105', 'Caste: The Origins of Our Discontents', 'Non-Fiction', 'Examines the unspoken caste system that shapes America.', 'Random House', '978-0-593-23025-1', '2020-08-04', 'Available', 'caste.jpg', 0, 0),
('B047', 'A106', 'A Short History of Nearly Everything', 'Science', 'Popular science book that explains scientific concepts from the Big Bang to civilization.', 'Broadway Books', '978-0-767-90804-6', '2003-05-06', 'Available', 'short-history.jpg', 0, 0),
('B048', 'A107', 'The Making of the Atomic Bomb', 'Science', 'History of the development of nuclear weapons during WWII.', 'Simon & Schuster', '978-0-684-81378-8', '1986-09-01', 'Available', 'atomic-bomb.jpg', 0, 0),
('B049', 'A108', 'The Structure of Scientific Revolutions', 'Science', 'Introduced the concept of paradigm shifts in scientific thought.', 'University of Chicago Press', '978-0-226-45808-3', '1962-01-01', 'Available', 'scientific-revolutions.jpg', 0, 0),
('B050', 'A109', 'The Blind Watchmaker', 'Science', 'Explains and defends evolutionary theory against creationist arguments.', 'W.W. Norton', '978-0-393-31570-7', '1986-01-01', 'Available', 'blind-watchmaker.jpg', 0, 0),
('B051', 'A110', 'The Diversity of Life', 'Science', 'Explores biodiversity and the threats posed by human activity.', 'Harvard University Press', '978-0-674-21298-5', '1992-01-01', 'Available', 'diversity-life.jpg', 0, 0),
('B052', 'A111', 'The Demon-Haunted World', 'Science', 'Advocates for scientific skepticism and critical thinking.', 'Random House', '978-0-345-40946-1', '1995-01-01', 'Available', 'demon-haunted.jpg', 0, 0),
('B053', 'A112', 'The Planets', 'Science', 'Comprehensive guide to the planets of our solar system.', 'Yale University Press', '978-0-300-12020-3', '2005-10-01', 'Available', 'the-planets.jpg', 0, 0),
('B054', 'A113', 'The Hidden Life of Trees', 'Science', 'Explores the social networks and communication systems of trees.', 'Greystone Books', '978-1-771-64174-4', '2015-09-01', 'Available', 'hidden-life-trees.jpg', 0, 0),
('B055', 'A114', 'The Genealogy of Morals', 'Science', 'Philosophical work exploring the origins of moral values.', 'C.G. Naumann', '978-0-140-44465-5', '1887-01-01', 'Available', 'genealogy-morals.jpg', 0, 0),
('B056', 'A115', 'The Vital Question', 'Science', 'Explores the origin and evolution of complex life on Earth.', 'Profile Books', '978-1-781-25036-2', '2015-04-09', 'Available', 'vital-question.jpg', 0, 0),
('B057', 'A116', 'The Last Unicorn', 'Fantasy', 'Story of a unicorn searching for others of her kind.', 'Viking Press', '978-0-452-26007-7', '1968-04-01', 'Available', 'last-unicorn.jpg', 0, 0),
('B058', 'A117', 'The Neverending Story', 'Fantasy', 'A boy discovers a magical book that transports him to the world of Fantastica.', 'K. Thienemanns Verlag', '978-0-525-44805-2', '1979-01-01', 'Available', 'neverending-story.jpg', 0, 0),
('B059', 'A118', 'The Dark is Rising', 'Fantasy', 'A boy discovers he is the last of the Old Ones destined to battle evil forces.', 'Atheneum Books', '978-0-689-30476-2', '1973-01-01', 'Available', 'dark-rising.jpg', 0, 0),
('B060', 'A119', 'The Princess Bride', 'Fantasy', 'A fantasy adventure about true love and high adventure.', 'Harcourt Brace Jovanovich', '978-0-156-03643-6', '1973-01-01', 'Available', 'princess-bride.jpg', 0, 0),
('B061', 'A120', 'Stardust', 'Fantasy', 'A young man ventures into a magical realm to find a fallen star.', 'Headline Review', '978-0-747-26569-6', '1999-01-01', 'Available', 'stardust.jpg', 0, 0),
('B062', 'A121', 'Good Omens', 'Fantasy', 'An angel and demon work together to prevent the apocalypse.', 'Gollancz', '978-0-575-04800-2', '1990-05-10', 'Available', 'good-omens.jpg', 0, 0),
('B063', 'A122', 'The Once and Future King', 'Fantasy', 'Retelling of the Arthurian legend.', 'Collins', '978-0-00-647861-8', '1958-01-01', 'Available', 'once-future-king.jpg', 0, 0),
('B064', 'A123', 'Jonathan Strange & Mr Norrell', 'Fantasy', 'Historical fantasy about the revival of English magic in the Napoleonic era.', 'Bloomsbury', '978-1-582-34416-5', '2004-09-08', 'Available', 'jonathan-strange.jpg', 0, 0),
('B065', 'A124', 'Uprooted', 'Fantasy', 'A young woman is taken by a powerful wizard to serve him for ten years.', 'Del Rey Books', '978-0-804-17766-5', '2015-05-19', 'Available', 'uprooted.jpg', 0, 0),
('B066', 'A125', 'The Bear and the Nightingale', 'Fantasy', 'Fairy tale inspired fantasy set in medieval Russia.', 'Del Rey Books', '978-1-101-88574-7', '2017-01-10', 'Available', 'bear-nightingale.jpg', 0, 0),
('B067', 'A126', 'The No. 1 Ladies\' Detective Agency', 'Mystery', 'First book in series about Botswana\'s first female detective.', 'Polygon', '978-0-748-66840-0', '1998-01-01', 'Available', 'ladies-detective.jpg', 0, 0),
('B068', 'A127', 'The Secret History', 'Mystery', 'Group of classics students at an elite college become involved in murder.', 'Alfred A. Knopf', '978-0-679-41032-4', '1992-09-16', 'Available', 'secret-history.jpg', 0, 0),
('B069', 'A128', 'In the Woods', 'Mystery', 'Detective investigates a murder that may be connected to his own childhood trauma.', 'Hodder & Stoughton', '978-0-340-89838-5', '2007-05-03', 'Available', 'in-the-woods.jpg', 0, 0),
('B070', 'A129', 'The Snowman', 'Mystery', 'Detective Harry Hole investigates a serial killer who builds snowmen as calling cards.', 'Random House', '978-0-307-59582-9', '2007-11-01', 'Available', 'the-snowman.jpg', 0, 0),
('B071', 'A130', 'The Girl on the Train', 'Mystery', 'A divorcee becomes entangled in a missing persons investigation.', 'Riverhead Books', '978-1-594-63940-5', '2015-01-13', 'Available', 'girl-train.jpg', 0, 0),
('B072', 'A131', 'Big Little Lies', 'Mystery', 'Three mothers become embroiled in a murder investigation at a school fundraiser.', 'G.P. Putnam\'s Sons', '978-0-399-16539-1', '2014-07-29', 'Available', 'big-little-lies.jpg', 0, 0),
('B073', 'A132', 'The Murder of Roger Ackroyd', 'Mystery', 'Hercule Poirot investigates the murder of a wealthy widower.', 'William Collins & Sons', '978-0-006-19943-7', '1926-06-01', 'Available', 'roger-ackroyd.jpg', 0, 0),
('B074', 'A133', 'Rebecca', 'Mystery', 'A young bride is haunted by the memory of her husband\'s first wife.', 'Victor Gollancz', '978-0-385-09540-6', '1938-08-01', 'Available', 'rebecca.jpg', 0, 0),
('B075', 'A134', 'The Talented Mr. Ripley', 'Mystery', 'A young man assumes the identity of a wealthy acquaintance.', 'Coward-McCann', '978-0-140-23790-5', '1955-01-01', 'Available', 'talented-ripley.jpg', 0, 0),
('B076', 'A135', 'The Alienist', 'Mystery', 'A psychologist and journalist hunt a serial killer in 1896 New York.', 'Random House', '978-0-679-41779-8', '1994-03-15', 'Available', 'the-alienist.jpg', 0, 0),
('B077', 'A136', 'The Automatic Millionaire', 'Finance', 'Guide to building wealth through automatic saving and investing.', 'Broadway Books', '978-0-767-91556-3', '2003-12-30', 'Available', 'automatic-millionaire.jpg', 0, 0),
('B078', 'A137', 'I Will Teach You to Be Rich', 'Finance', 'Six-week program for managing money and building wealth in your 20s and 30s.', 'Workman Publishing', '978-0-761-14164-6', '2009-03-23', 'Available', 'teach-rich.jpg', 0, 0),
('B079', 'A138', 'The Wealthy Barber', 'Finance', 'Financial advice presented through story about a barber sharing wisdom.', 'Stoddart Publishing', '978-0-773-73044-1', '1989-01-01', 'Available', 'wealthy-barber.jpg', 0, 0),
('B080', 'A139', 'The Cashflow Quadrant', 'Finance', 'Explains different ways people earn income and achieve financial freedom.', 'Warner Books', '978-0-446-67747-5', '1998-01-01', 'Available', 'cashflow-quadrant.jpg', 0, 0),
('B081', 'A140', 'Think and Grow Rich', 'Finance', 'Personal development and self-help book about building wealth.', 'The Ralston Society', '978-1-588-00139-5', '1937-01-01', 'Available', 'think-grow-rich.jpg', 0, 0),
('B082', 'A141', 'The Richest Man in Babylon', 'Finance', 'Financial advice through parables set in ancient Babylon.', 'Penguin Books', '978-0-451-21067-5', '1926-01-01', 'Available', 'richest-babylon.jpg', 0, 0),
('B083', 'A142', 'The Little Book That Beats the Market', 'Finance', 'Introduces the magic formula for value investing.', 'Wiley', '978-0-471-73306-5', '2005-12-14', 'Available', 'beats-market.jpg', 0, 0),
('B084', 'A143', 'The Only Investment Guide You\'ll Ever Need', 'Finance', 'Comprehensive guide to personal finance and investing.', 'Harcourt', '978-0-151-00390-6', '1978-01-01', 'Available', 'only-investment-guide.jpg', 0, 0),
('B085', 'A144', 'The Dhandho Investor', 'Finance', 'Value investing approach inspired by Indian business philosophy.', 'Wiley', '978-0-470-04389-9', '2007-03-02', 'Available', 'dhandho-investor.jpg', 0, 0),
('B086', 'A145', 'A Man for All Markets', 'Finance', 'Autobiography of mathematician Edward Thorp who beat blackjack and the stock market.', 'Random House', '978-1-400-06797-6', '2017-01-24', 'Available', 'man-all-markets.jpg', 0, 0),
('B087', 'A146', 'Long Walk to Freedom', 'Biography', 'Autobiography of Nelson Mandela.', 'Little, Brown', '978-0-316-54818-2', '1994-01-01', 'Available', 'long-walk-freedom.jpg', 0, 0),
('B088', 'A147', 'The Diary of a Young Girl', 'Biography', 'Diary of Anne Frank during WWII hiding.', 'Contact Publishing', '978-0-553-29698-6', '1947-06-25', 'Available', 'anne-frank.jpg', 0, 0),
('B089', 'A148', 'I Know Why the Caged Bird Sings', 'Biography', 'Autobiography of Maya Angelou\'s early years.', 'Random House', '978-0-553-27937-8', '1969-01-01', 'Available', 'caged-bird.jpg', 0, 0),
('B090', 'A149', 'The Autobiography of Malcolm X', 'Biography', 'Autobiography of human rights activist Malcolm X.', 'Grove Press', '978-0-345-37671-5', '1965-10-29', 'Available', 'malcolm-x.jpg', 0, 0),
('B091', 'A150', 'Night', 'Biography', 'Memoir of Elie Wiesel\'s experiences in Nazi concentration camps.', 'Les Éditions de Minuit', '978-0-374-50001-6', '1956-01-01', 'Available', 'night.jpg', 0, 0),
('B092', 'A151', 'The Story of My Experiments with Truth', 'Biography', 'Autobiography of Mahatma Gandhi.', 'Navajivan Trust', '978-0-807-05905-6', '1927-01-01', 'Available', 'experiments-truth.jpg', 0, 0),
('B093', 'A152', 'The Wright Brothers', 'Biography', 'Biography of aviation pioneers Orville and Wilbur Wright.', 'Simon & Schuster', '978-1-476-72674-5', '2015-05-05', 'Available', 'wright-brothers-bio.jpg', 0, 0),
('B094', 'A153', 'Alexander Hamilton', 'Biography', 'Biography of American Founding Father Alexander Hamilton.', 'Penguin Press', '978-1-594-20009-0', '2004-04-26', 'Available', 'alexander-hamilton.jpg', 0, 0),
('B095', 'A154', 'Churchill: Walking with Destiny', 'Biography', 'Biography of Winston Churchill.', 'Viking Press', '978-0-241-20563-1', '2018-11-06', 'Available', 'churchill.jpg', 0, 0),
('B096', 'A155', 'Leonardo da Vinci', 'Biography', 'Biography of Renaissance polymath Leonardo da Vinci.', 'Simon & Schuster', '978-1-501-18784-4', '2017-10-17', 'Available', 'leonardo.jpg', 0, 0),
('B097', 'A156', 'Foundation', 'Science Fiction', 'First book in the Foundation series about the fall of a galactic empire.', 'Gnome Press', '978-0-553-29335-4', '1951-05-01', 'Available', 'foundation.jpg', 0, 0),
('B098', 'A157', 'Neuromancer', 'Science Fiction', 'Cyberpunk novel about a computer hacker hired for one last job.', 'Ace Books', '978-0-441-56956-4', '1984-07-01', 'Available', 'neuromancer.jpg', 0, 0),
('B099', 'A158', 'Snow Crash', 'Science Fiction', 'Cyberpunk novel about a hacker and pizza delivery driver in a dystopian America.', 'Bantam Spectra', '978-0-553-08853-5', '1992-06-01', 'Available', 'snow-crash.jpg', 0, 0),
('B100', 'A159', 'Do Androids Dream of Electric Sheep?', 'Science Fiction', 'Bounty hunter hunts replicants in post-apocalyptic San Francisco.', 'Doubleday', '978-0-385-12180-4', '1968-01-01', 'Available', 'electric-sheep.jpg', 0, 0),
('B101', 'A160', 'The Left Hand of Darkness', 'Science Fiction', 'Explores themes of gender and sexuality on a planet with ambisexual inhabitants.', 'Ace Books', '978-0-441-47812-5', '1969-06-01', 'Available', 'left-hand-darkness.jpg', 0, 0),
('B102', 'A161', 'Ender\'s Game', 'Science Fiction', 'Child genius trains at Battle School to fight an alien invasion.', 'Tor Books', '978-0-312-93208-5', '1985-01-01', 'Available', 'enders-game.jpg', 0, 0),
('B103', 'A162', 'The Three-Body Problem', 'Science Fiction', 'First contact story between humanity and an alien civilization.', 'Chongqing Press', '978-0-765-37706-7', '2008-01-01', 'Available', 'three-body.jpg', 0, 0),
('B104', 'A163', 'Hyperion', 'Science Fiction', 'Seven pilgrims travel to the Time Tombs on the planet Hyperion.', 'Doubleday', '978-0-385-24949-5', '1989-05-26', 'Available', 'hyperion.jpg', 0, 0),
('B105', 'A164', 'The Diamond Age', 'Science Fiction', 'Set in a future world transformed by nanotechnology.', 'Bantam Spectra', '978-0-553-09609-6', '1995-02-01', 'Available', 'diamond-age.jpg', 0, 0),
('B106', 'A165', 'Red Mars', 'Science Fiction', 'First book in trilogy about the colonization and terraforming of Mars.', 'HarperCollins', '978-0-553-09753-6', '1992-06-01', 'Available', 'red-mars.jpg', 0, 0),
('B107', 'A005', '1984', 'Dystopian', 'A chilling depiction of totalitarian control and surveillance.', 'Secker & Warburg', '978-0-452-28423-4', '1949-06-08', 'Available', '1984.jpg', 0, 0),
('B108', 'A005', 'Animal Farm', 'Political Satire', 'An allegorical tale about power and corruption.', 'Secker & Warburg', '978-0-452-28424-1', '1945-08-17', 'Available', 'animal-farm.jpg', 0, 0),

('B109', 'A010', 'The Fellowship of the Ring', 'Fantasy', 'The first part of The Lord of the Rings trilogy.', 'Allen & Unwin', '978-0-618-00222-0', '1954-07-29', 'Available', 'fellowship-ring.jpg', 0, 0),

('B110', 'A166', 'Norwegian Wood', 'Romance', 'A nostalgic story of love and loss.', 'Kodansha', '978-0-375-70402-4', '1987-09-04', 'Available', 'norwegian-wood.jpg', 0, 0),
('B111', 'A166', 'Kafka on the Shore', 'Magical Realism', 'A surreal journey blending reality and metaphysics.', 'Shinchosha', '978-1-84343-110-9', '2002-09-12', 'Available', 'kafka-on-the-shore.jpg', 0, 0),

('B112', 'A132', 'Murder on the Orient Express', 'Mystery', 'Detective Hercule Poirot investigates a murder aboard a train.', 'Collins Crime Club', '978-0-00-711931-8', '1934-01-01', 'Available', 'orient-express.jpg', 0, 0),
('B113', 'A132', 'And Then There Were None', 'Mystery', 'Ten strangers are trapped and killed one by one.', 'Collins Crime Club', '978-0-06-207348-8', '1939-11-06', 'Available', 'and-then-there-were-none.jpg', 0, 0),

('B114', 'A167', 'The Da Vinci Code', 'Thriller', 'A symbologist uncovers secrets hidden in art.', 'Doubleday', '978-0-385-50420-8', '2003-03-18', 'Available', 'da-vinci-code.jpg', 0, 0),
('B115', 'A167', 'Angels & Demons', 'Thriller', 'A conspiracy threatens the Vatican.', 'Pocket Books', '978-0-671-02736-0', '2000-05-01', 'Available', 'angels-demons.jpg', 0, 0),

('B116', 'A120', 'American Gods', 'Fantasy', 'Old gods struggle to survive in modern America.', 'William Morrow', '978-0-380-97365-1', '2001-06-19', 'Available', 'american-gods.jpg', 0, 0),
('B117', 'A120', 'Coraline', 'Fantasy', 'A girl discovers a dark parallel world.', 'Bloomsbury', '978-0-747-59356-0', '2002-08-04', 'Available', 'coraline.jpg', 0, 0),

('B118', 'A168', 'The Kite Runner', 'Drama', 'A story of friendship, guilt, and redemption.', 'Riverhead Books', '978-1-59448-000-3', '2003-05-29', 'Available', 'kite-runner.jpg', 0, 0),

('B119', 'A019', 'Pride and Prejudice', 'Classic Romance', 'A timeless story of love and misunderstanding.', 'T. Egerton', '978-0-19-283355-2', '1813-01-28', 'Available', 'pride-prejudice.jpg', 0, 0),

('B120', 'A170', 'The Alchemist', 'Philosophical Fiction', 'A shepherd searches for his destiny.', 'HarperTorch', '978-0-06-112241-5', '1988-04-15', 'Available', 'the-alchemist.jpg', 0, 0),

('B121', 'A021', 'The Shining', 'Horror', 'A family heads to an isolated hotel where a dark presence influences the father.', 'Doubleday', '978-0-385-12167-2', '1977-01-28', 'Available', 'the-shining.jpg', 0, 0),

('B122', 'A171', 'The Picture of Dorian Gray', 'Classic Fiction', 'A man remains young while his portrait ages and reflects his sins.', 'Ward, Lock & Co.', '978-0-14-143957-0', '1890-06-20', 'Available', 'dorian-gray.jpg', 0, 0),

('B123', 'A172', 'The Adventures of Tom Sawyer', 'Adventure', 'A mischievous boy grows up along the Mississippi River.', 'American Publishing Company', '978-0-14-303956-3', '1876-06-01', 'Available', 'tom-sawyer.jpg', 0, 0),

('B124', 'A173', 'Percy Jackson & the Olympians: The Lightning Thief', 'Fantasy', 'A boy discovers he is the son of a Greek god.', 'Disney Hyperion', '978-0-7868-5629-9', '2005-06-28', 'Available', 'lightning-thief.jpg', 0, 0),
('B125', 'A173', 'Percy Jackson & the Olympians: The Sea of Monsters', 'Fantasy', 'Percy embarks on a dangerous journey into the Sea of Monsters to save Camp Half-Blood.', 'Disney Hyperion', '978-0-7868-5686-2', '2006-04-01', 'Available', 'sea-of-monsters.jpg', 0, 0),
('B126', 'A173', 'Percy Jackson & the Olympians: The Titan''s Curse', 'Fantasy', 'Percy faces the return of the Titans while trying to rescue a captured goddess.', 'Disney Hyperion', '978-0-7868-5688-6', '2007-05-01', 'Available', 'titans-curse.jpg', 0, 0),
('B127', 'A173', 'Percy Jackson & the Olympians: The Battle of the Labyrinth', 'Fantasy', 'Percy ventures into a deadly labyrinth that threatens the Greek demigod world.', 'Disney Hyperion', '978-0-7868-5690-9', '2008-05-06', 'Available', 'battle-labyrinth.jpg', 0, 0),
('B128', 'A173', 'Percy Jackson & the Olympians: The Last Olympian', 'Fantasy', 'The final battle between the Olympian gods and the Titans begins.', 'Disney Hyperion', '978-0-7868-5692-3', '2009-05-05', 'Available', 'last-olympian.jpg', 0, 0),
('B129', 'A173', 'The Heroes of Olympus: The Lost Hero', 'Fantasy', 'A new prophecy emerges as demigods from Greek and Roman camps unite.', 'Disney Hyperion', '978-1-4231-1654-0', '2010-10-12', 'Available', 'lost-hero.jpg', 0, 0),

('B130', 'A174', 'Shadow and Bone', 'Fantasy', 'A young woman discovers a power that could unite her war-torn world.', 'Henry Holt and Company', '978-0-8050-9024-8', '2012-06-05', 'Available', 'shadow-and-bone.jpg', 0, 0);
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
    LIB_ID VARCHAR(20) NULL,
    
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