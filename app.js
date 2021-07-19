const createError = require('http-errors');
const express = require('express');
const cors = require("cors");
const path = require('path');
// const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const logger = require('morgan');
const flash = require('connect-flash');
const session = require('express-session');
const indexRouter = require('./controllers/index');

const app = express();
// app.use(session({ secret: 'genie', resave : false, saveUninitialized : true,cookie: { maxAge: 6000000 }}));
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(flash());
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('config', path.join(__dirname, 'config'));
app.set('lib', path.join(__dirname, 'lib'));
app.set('view engine', 'pug');


app.use(logger('dev'));
app.use(express.urlencoded({ extended: true }));

// app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'uploads')));

app.use('/', indexRouter);
app.use('/index', indexRouter);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({extended: true}));
// app.use(express.urlencoded());
// app.use(cookieParser());



// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});


// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    // if (err)
    //     console.log("err", err);
    // render the error page
    // res.status(err.status || 500);
    // res.render('error');
});

module.exports = app;
