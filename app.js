
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
app.use(passport.initialize());



app.use(session({
  secret:process.env.SESSION_SECRET,
  resave:true,
  saveUninitialized:true
}))


app.use(passport.initialize());
app.use(passport.session());
passport.use(new WebAppStrategy({
	tenantId: process.env["TENANT_ID"],
	clientId: process.env.CLIENT_ID,
	secret: process.env.APPID_SECRET,
	oauthServerUrl: process.env.OAUTH_SERVER_URL,
	redirectUri: process.env.SERVER_URL + "/login"
}));

passport.serializeUser(function(user, cb) {
	cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
	cb(null, obj);
});

app.get("/login", passport.authenticate(WebAppStrategy.STRATEGY_NAME))
app.get("/logout", function(req,res,next){
  WebAppStrategy.logout(req);
  res.redirect("/")
})

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json({limit:'4mb}'}));
app.use(express.urlencoded({ extended: false, limit:'4mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to get user agent on a var for pug
// Thanks to @zemirco on https://stackoverflow.com/a/15380234/6045784
app.use( (req, res, next) => {
  res.locals.isMobile = req.get('User-Agent')
    .match(/(Android)|(iPhone)|(Windows Phone (OS 7|8.0))|(XBLWP)|(ZuneWP)|(w(eb)?OSBrowser)|(webOS)|(Kindle\/(1.0|2.0|2.5|3.0))/);
  next();
})

app.use('/', indexRouter);

//app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  console.debug(req.headers)
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
