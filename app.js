
require('dotenv').config()
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
//var usersRouter = require('./routes/users');

var app = express();

// IBM App ID 
const session = require('express-session')
const passport = require('passport');
const WebAppStrategy = require('ibmcloud-appid').WebAppStrategy;
const ApiStrategy = require('ibmcloud-appid').APIStrategy;
const userProfileManager = require("ibmcloud-appid").UserProfileManager;
app.use(passport.initialize());



app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true
}))

userProfileManager.init({
  tenantId: process.env["TENANT_ID"],
  clientId: process.env.CLIENT_ID,
  secret: process.env.APPID_SECRET,
  oauthServerUrl: process.env.OAUTH_SERVER_URL,
  redirectUri: process.env.SERVER_URL + "/login",
  profilesUrl: process.env.APPID_PROFILES_URL
});

app.use(passport.initialize());
app.use(passport.session());
passport.use(new WebAppStrategy({
  tenantId: process.env["TENANT_ID"],
  clientId: process.env.CLIENT_ID,
  secret: process.env.APPID_SECRET,
  oauthServerUrl: process.env.OAUTH_SERVER_URL,
  redirectUri: process.env.SERVER_URL + "/login"
}));

passport.use(new ApiStrategy({
  oauthServerUrl: process.env.OAUTH_SERVER_URL
}))

passport.serializeUser(function (user, cb) {
  cb(null, user);
});

passport.deserializeUser(function (obj, cb) {
  cb(null, obj);
});

app.get("/webapp/*", passport.authenticate(WebAppStrategy.STRATEGY_NAME),
  (req, res, next) => {
    var accessToken = req.session[WebAppStrategy.AUTH_CONTEXT].accessToken;
    userProfileManager.getUserInfo(accessToken).then((uInf) => {
      res.locals.userName = uInf.name;
      res.locals.userEmail = uInf.email;
      res.locals.isMobile = req.get('User-Agent')
        .match(/(Android)|(iPhone)|(Windows Phone (OS 7|8.0))|(XBLWP)|(ZuneWP)|(w(eb)?OSBrowser)|(webOS)|(Kindle\/(1.0|2.0|2.5|3.0))/);
      res.locals.isAdmin = WebAppStrategy.hasScope(req, "admin")
      next();
    }).catch(err => { throw err })
  }
)
app.post("/webapp/*", passport.authenticate(WebAppStrategy.STRATEGY_NAME))

app.get("/admin/*", passport.authenticate(WebAppStrategy.STRATEGY_NAME), (req, res, next) => {
  var accessToken = req.session[WebAppStrategy.AUTH_CONTEXT].accessToken;
  if (WebAppStrategy.hasScope(req, "admin")) {
    userProfileManager.getUserInfo(accessToken).then((uInf) => {
      res.locals.userName = uInf.name;
      res.locals.userEmail = uInf.email;
      res.locals.isMobile = req.get('User-Agent')
        .match(/(Android)|(iPhone)|(Windows Phone (OS 7|8.0))|(XBLWP)|(ZuneWP)|(w(eb)?OSBrowser)|(webOS)|(Kindle\/(1.0|2.0|2.5|3.0))/);
      res.locals.isAdmin = true;
      next();
    }).catch(err => { throw err })
  } else {
    err = new Error("Insufficient access rights");
    err.status = 401
    throw err;
  }
})
app.get("/adminapi/*", passport.authenticate(WebAppStrategy.STRATEGY_NAME), (req, res, next) => {
  if (WebAppStrategy.hasScope(req, "admin")) {
    next();
  } else {
    err = new Error("Insufficient access rights");
    err.status = 401
    throw err;
  }
})
app.post("/adminapi/*", passport.authenticate(WebAppStrategy.STRATEGY_NAME), (req, res, next) => {
  if (WebAppStrategy.hasScope(req, "admin")) {
    next();
  } else {
    err = new Error("Insufficient access rights");
    err.status = 401
    throw err;
  }
})
/*
app.get(
  "/adminapi/*",
  passport.authenticate(
    ApiStrategy.STRATEGY_NAME, {
    audience: process.env.APPID_APPLICATION,
    scope: "admin"
  })
)
app.post(
  "/adminapi/*",
  passport.authenticate(
    ApiStrategy.STRATEGY_NAME, {
    audience: process.env.APPID_APPLICATION,
    scope: "admin"
  })
)
*/
app.get("/login", passport.authenticate(WebAppStrategy.STRATEGY_NAME))
app.get("/logout", function (req, res, next) {
  WebAppStrategy.logout(req);
  res.redirect("/")
})

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json({ limit: '4mb}' }));
app.use(express.urlencoded({ extended: false, limit: '4mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to get user agent on a var for pug
// Thanks to @zemirco on https://stackoverflow.com/a/15380234/6045784
app.use((req, res, next) => {
  res.locals.isMobile = req.get('User-Agent')
    .match(/(Android)|(iPhone)|(Windows Phone (OS 7|8.0))|(XBLWP)|(ZuneWP)|(w(eb)?OSBrowser)|(webOS)|(Kindle\/(1.0|2.0|2.5|3.0))/);
  next();
})

app.use('/', indexRouter);

//app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  console.debug(req.headers)
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});


module.exports = app;
