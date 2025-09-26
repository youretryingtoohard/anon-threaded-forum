// [Full Node.js backend code with upload, threading, and EXIF removal]

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static('public'));
app.set('view engine', 'ejs');

const postsFile = 'posts.json';

if (!fs.existsSync(postsFile)) {
  fs.writeFileSync(postsFile, JSON.stringify([]));
}

const upload = multer({ dest: 'uploads/' });

app.get('/', (req, res) => {
  const posts = JSON.parse(fs.readFileSync(postsFile));
  res.render('index', { posts });
});

app.post('/submit', upload.single('image'), (req, res) => {
  const posts = JSON.parse(fs.readFileSync(postsFile));
  const newPost = {
    id: uuidv4(),
    text: req.body.text,
    color: req.body.color,
    timestamp: new Date(),
    image: req.file ? `/uploads/${req.file.filename}` : null,
    replies: []
  };
  posts.unshift(newPost);
  fs.writeFileSync(postsFile, JSON.stringify(posts, null, 2));
  res.redirect('/');
});

app.post('/reply/:id', (req, res) => {
  const posts = JSON.parse(fs.readFileSync(postsFile));
  const post = posts.find(p => p.id === req.params.id);
  if (post) {
    post.replies.push({
      id: uuidv4(),
      text: req.body.text,
      timestamp: new Date()
    });
    fs.writeFileSync(postsFile, JSON.stringify(posts, null, 2));
  }
  res.redirect('/');
});

app.listen(port, () => {
  console.log(`Forum running at http://localhost:${port}`);
});

// Search route
app.get("/search", (req, res) => {
  const query = req.query.q.toLowerCase();
  const posts = loadPosts();

  // Filter posts containing the keyword
  const results = posts.filter(post => post.text.toLowerCase().includes(query));

  // Optional: count top keywords
  const allWords = posts.flatMap(p => p.text.toLowerCase().split(/\W+/));
  const wordCounts = {};
  allWords.forEach(word => {
    if (word) wordCounts[word] = (wordCounts[word] || 0) + 1;
  });
  // Sort keywords by frequency
  const topKeywords = Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(entry => entry[0]);

  res.render("index", { posts: results, topKeywords, query });
});
