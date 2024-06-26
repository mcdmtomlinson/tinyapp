const express = require("express");
const bodyParser = require("body-parser");
const cookieSession = require("cookie-session");
const bcrypt = require('bcrypt');
const { getUserByEmail } = require('./helpers');
const { generateRandomString } = require('./helpers');
const { urlsForUser } = require('./helpers');

//app config
const app = express();
const PORT = 8080;
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieSession({name: "user_id", secret: "qwerty"}));

app.set("view engine", "ejs");

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

// template url database
const urlDatabase = {
  b6UTxQ: { longURL: "https://www.tsn.ca", userID: "aJ48lW" },
  i3BoGr: { longURL: "https://www.google.ca", userID: "aJ48lW" }
};

// template users database
const users = {
  userRandomID: {
    id: "userRandomID",
    email: "user@example.com",
    password: "123"
  },
  user2RandomID: {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "abc"
  }
};

// ROUTE HANDLERS

app.get("/", (req, res) => {
  if (req.session.user_id) {
    res.redirect("/urls");
  } else {
    res.redirect("/login");
  }
});

app.get("/urls", (req, res) => {
  //generate new filtered object holding all short URLS matched to the logged in user_id
  let objURL = {};
  let urlArr = urlsForUser(req.session.user_id, urlDatabase);
  for (let shortURL in urlDatabase) {
    if (urlArr.includes(shortURL)) {
        objURL[shortURL] = urlDatabase[shortURL];
    }
  }
  // pass new filtered object to template file for rendering unique table
  let templateVars = { urls: objURL, user: users[req.session.user_id] };
  if (req.session.user_id) {
    res.render("urls_index", templateVars);
  } else {
    res.sendStatus(403);
  }
});


// renders new url link creation page
app.get("/urls/new", (req, res) => {
  let templateVars = { user: users[req.session.user_id] };
  if (req.session.user_id) {
    res.render("urls_new", templateVars);
  } else {
    res.redirect("/login");
  }
});

// renders the url specific page based on shortURL with link to longURL
app.get("/urls/:shortURL", (req, res) => {
  if (!urlDatabase[req.params.shortURL]) {
    res.sendStatus(404);
  } else if (urlDatabase[req.params.shortURL].userID === req.session.user_id) {
      let templateVars = {
        shortURL: req.params.shortURL,
        longURL: urlDatabase[req.params.shortURL].longURL,
        user: users[req.session.user_id]
      };
    res.render("urls_show", templateVars);
  } else res.sendStatus(403);
});

//If user is logged in, redirect to desired website based on shortURL id
app.get("/u/:shortURL", (req, res) => {
  if (urlDatabase[req.params.shortURL]) {
    let longURL = urlDatabase[req.params.shortURL].longURL;
    res.redirect(`${longURL}`);
  } else {
    res.sendStatus(404);
  }
});

// Update express server with new shortURL object entry
app.post("/urls", (req, res) => {
  if (req.session.user_id) {
    const longURL = req.body.longURL;
    const shortURL = generateRandomString();
    urlDatabase[shortURL] = {
      longURL: longURL,
      userID: req.session.user_id
    };
    res.redirect(`/urls/${shortURL}`);
  } else {
    res.sendStatus(403);
  }
});

//deletes url object entry
app.post("/urls/:shortURL/delete", (req, res) => {
  // check if url's user ID matches cookie's user ID. then delete if yes
  if (urlDatabase[req.params.shortURL].userID === (req.session.user_id)) {
    delete urlDatabase[req.params.shortURL];
    res.redirect("/urls");
  } else {
    res.sendStatus(403);
  }
});

//edits and updates new long url
app.post("/urls/:shortURL", (req, res) => {
  if (urlDatabase[req.params.shortURL].userID === (req.session.user_id)) {
    urlDatabase[req.params.shortURL].longURL = req.body.longURL;
    res.redirect("/urls");
  } else {
    res.sendStatus(403);
  }
});

//renders new login template
app.get("/login", (req, res) => {
  if (req.session.user_id) {
    res.redirect("/urls");
  } else {
    let templateVars = {
      email: req.body.email,
      password: req.body.password,
      user: users[req.session.user_id]
    };
    res.render("login", templateVars);
  }
});

// Login event handler
app.post("/login", (req, res) => {
  // check if email exists
  let user = getUserByEmail(req.body.email, users);
  if (user === false) {
    res.sendStatus(403);
  }
  // check if password matches
  if (bcrypt.compareSync(req.body.password, user.password)) {
    req.session.user_id = user.id;
    res.redirect("/urls");
  } else {
    res.sendStatus(403);
  }
});

// logs out user
app.post("/logout", (req, res) => {
  res.clearCookie("user_id");
  res.redirect("/login");
});

// renders registration page
app.get("/register", (req, res) => {
  if (req.session.user_id) {
    res.redirect("urls");
  } else {
    let templateVars = {
      email: req.body.email,
      password: req.body.password,
      user: users[req.session.user_id]
    };
    res.render("register", templateVars);
  }
});

// registration event handler
app.post("/register", (req, res) => {
  // check if text fields are empty
  if (req.body.email === "" || req.body.password === "") {
    res.sendStatus(400);
  }
  // check if email already exists
  if (getUserByEmail(req.body.email, users)) {
    res.sendStatus(400);
  } else {
    // generate new user info child object
    const userID = generateRandomString();
    users[userID] = {
      id: userID,
      email: req.body.email,
      password: bcrypt.hashSync(req.body.password, 10)
    };
    req.session.user_id = userID;
    res.redirect("/urls");
  }
});