var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var thumbmaker = require('./server/thumbmaker');

var index = require('./routes/index');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
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

var working = false;
var autoConvert = function() {

	if (process.argv.length < 3) {
		console.log('Video folder path argument was not set.');
		return;
	}

	console.log(working);

	if (!working) {

		working = true;
		thumbmaker.start(process.argv[2], '', './public/thumbs', true, (err, data) => {
			working = false;
		});
	}
	else {
		console.log('Cannot start thumbmaker, already working.');
	}
};

//set up interval to check for files to convert
//setInterval(autoConvert, 1000); //one minute
autoConvert();

module.exports = app;
