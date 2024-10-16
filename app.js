app.use(session({
    secret: process.env.SECRET,
    key: process.env.KEY,  // name of the cookie
    resave: false,
    saveUninitialized: false,
    // the session is stored in the DB
    store: MongoStore.create({
        mongoUrl: process.env.DATABASE
    })
}));

app.use(flash());

app.use((req, res, next) => {
    res.locals.h = helpers;
    res.locals.flashes = req.flash();
    res.locals.currentPath = req.path;
    next();  // Go to the next middleware in the REQ-RES CYCLE
});

// ROUTER: anytime someone goes to "/anything", we will handle it with the module "routes"
app.use('/', router);

// If above routes didn't work -> error 404 and forward to error handler
app.use(errorHandlers.notFound);

// if errors are just DB validation errors -> show them in flashes
app.use(errorHandlers.flashValidationErrors);

// Otherwise this was a really bad error we didn't expect!
if (app.get('env') === 'development') {
    /* Development Error Handler - Prints stack trace */
    app.use(errorHandlers.developmentErrors);
}

/* production error handler */
app.use(errorHandlers.productionErrors);

module.exports = app;