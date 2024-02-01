const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const mysql = require('mysql');
const app = express();
const multer = require('multer');

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'madhav2711',
  database: 'blog'
});

db.connect((err) => {
  if (err) {
    console.log(err);
  } else {
    console.log('MySQL connected');
  }
});

app.listen(3000, () => {
  console.log('Server started on port 3000');
});

// ... (previous code)

// Create a 'users' table in your database
db.query(`
  CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL
  )
`, (err) => {
  if (err) throw err;
  console.log('Users table created');
});

// Passport configuration
passport.use(new LocalStrategy(
  (username, password, done) => {
    db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
      if (err) return done(err);
      if (!results.length) return done(null, false, { message: 'Incorrect username.' });
      
      const user = results[0];

      bcrypt.compare(password, user.password, (err, res) => {
        if (err) return done(err);
        if (res) {
          return done(null, user);
        } else {
          return done(null, false, { message: 'Incorrect password.' });
        }
      });
    });
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  db.query('SELECT * FROM users WHERE id = ?', [id], (err, results) => {
    if (err) return done(err);
    const user = results[0];
    done(null, user);
  });
});

// Routes for authentication
app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true,
}));

app.get('/signup', (req, res) => {
  res.render('signup');
});

app.post('/signup', async (req, res) => {
  const { username, password } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  db.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], (err, results) => {
    if (err) throw err;
    res.redirect('/login');
  });
});

app.get('/', (req, res) => {
    db.query('SELECT * FROM posts', (err, results) => {
      if (err) throw err;
      res.render('index', { posts: results });
    });
  });
  
  app.get('/post/:id', (req, res) => {
    const postId = req.params.id;
    db.query('SELECT * FROM posts WHERE id = ?', [postId], (err, results) => {
      if (err) throw err;
      res.render('post', { post: results[0] });
    });
  });
  
  app.get('/add_post', (req, res) => {
    res.render('add_post');
  });

  app.get('/contact', (req, res) => {
    res.render('contact');
  });
  
  app.post('/add_post', (req, res) => {
    const { title, content } = req.body;
    db.query('INSERT INTO posts (title, content) VALUES (?, ?)', [title, content], (err, results) => {
      if (err) throw err;
      res.redirect('/');
    });
  });

  // Update your existing routes to check if the user is authenticated
app.get('/', isAuthenticated, (req, res) => {
  db.query('SELECT * FROM posts ORDER BY created_at DESC', (err, results) => {
    if (err) throw err;
    res.render('index', { posts: results, user: req.user });
  });
});

  // Middleware to check if the user is authenticated
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}
  
   // Display all posts on the homepage
app.get('/', (req, res) => {
    db.query('SELECT * FROM posts ORDER BY created_at DESC', (err, results) => {
      if (err) throw err;
      res.render('index', { posts: results });
    });
  });
  
  // Display a single post
  app.get('/post/:id', (req, res) => {
    const postId = req.params.id;
    db.query('SELECT * FROM posts WHERE id = ?', [postId], (err, results) => {
      if (err) throw err;
      res.render('post', { post: results[0] });
    });
  });
  
  // Display the form to add a new post
  app.get('/add_post', (req, res) => {
    res.render('add_post');
  });
  
  // Handle the submission of the new post form
  app.post('/add_post', (req, res) => {
    const { title, content } = req.body;
    db.query('INSERT INTO posts (title, content) VALUES (?, ?)', [title, content], (err, results) => {
      if (err) throw err;
      res.redirect('/');
    });
  });
  
  // Delete a post
  app.post('/delete_post/:id', (req, res) => {
    const postId = req.params.id;
    db.query('DELETE FROM posts WHERE id = ?', [postId], (err, results) => {
      if (err) throw err;
      res.redirect('/');
    });
  });
  
  // Display the form to edit a post
app.get('/edit_post/:id', (req, res) => {
    const postId = req.params.id;
    db.query('SELECT * FROM posts WHERE id = ?', [postId], (err, results) => {
      if (err) throw err;
      res.render('edit_post', { post: results[0] });
    });
  });
  
  // Handle the submission of the edited post form
  app.post('/edit_post/:id', (req, res) => {
    const postId = req.params.id;
    const { title, content } = req.body;
    db.query('UPDATE posts SET title = ?, content = ? WHERE id = ?', [title, content, postId], (err, results) => {
      if (err) throw err;
      res.redirect('/post/' + postId);
    });
  });

  //count the words
  function countWords() {
    var content = document.getElementById('content').value;
    var words = content.split(/\s+/).filter(function(word) {
      return word.length > 0;
    }).length;
    document.getElementById('wordCount').textContent = 'Word count: ' + words;
  }
  
  
// Display the contact form
app.get('/contact', (req, res) => {
  res.render('contact');
});

// Handle contact form submission
app.post('/contact', (req, res) => {
  const { name, message } = req.body;
  const query = 'INSERT INTO contact_messages (name, message) VALUES (?, ?)';
  db.query(query, [name, message], (err, results) => {
    if (err) {
      console.error(err);
      // Optionally, you can redirect to an error page here
      res.status(500).send('Internal Server Error');
    } else {
      // Alert the user that the message was sent successfully
      res.send('<script>alert("Message sent successfully!"); window.location="/";</script>');
    }
  });
});

/*for image handling */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/images'); // Set the destination folder for images
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.mimetype.split('/')[1]);
  },
});

const upload = multer({ storage: storage });

app.post('/add_post', upload.single('image'), (req, res) => {
  const { title, content } = req.body;
  const imagePath = req.file ? '/images/' + req.file.filename : null;

  // Insert both title, content, and image path into the database
  db.query('INSERT INTO posts (title, content, image_path) VALUES (?, ?, ?)', [title, content, imagePath], (err, results) => {
    if (err) throw err;
    res.redirect('/');
  });
});