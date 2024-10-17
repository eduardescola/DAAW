/*   Catch Errors Handler    
With async/await, you need some way to catch errors   
Instead of using try{} catch(e) {} in each controller, we wrap the func tion in catchErrors(), 
catch any errors they throw, and pass it along to our expr ess middleware with next() 
*/ 


exports.catchErrors = (fn) => {     
  return function(req, res, next) {         
    return fn(req, res, next).catch(next);     
  };   
}; 

exports.notFound = (req, res, next) => {
    const err = new Error('Not Found');
    err.status = 404;
    next(err);
  };
  
  /* 
    MongoDB Validation Error Handler
    Detect if there are mongodb validation errors that we can nicely show via flash messages
    Otherwise, just pass it along
  */
  exports.flashValidationErrors = (err, req, res, next) => {
    if (!err.errors) return next(err);
    const errorKeys = Object.keys(err.errors);
    errorKeys.forEach(key => req.flash('error', err.errors[key].message));
    res.redirect('back');
  };
  
  /* 
    Detect if there are mongodb validation errors that we can nicely show via flash messages 
  */
  exports.flashValidationErrors = (err, req, res, next) => {
    if (!err.errors) return next(err);
    const errorKeys = Object.keys(err.errors);
    errorKeys.forEach(key => req.flash('error', err.errors[key].message));
    res.redirect('back');
  };
  
  /* 
    Development Error Handler -> error view + stackTrace 
  */
  exports.developmentErrors = (err, req, res, next) => {
    err.stack = err.stack || '';
    const errorDetails = {
      message: err.message,
      status: err.status,
      stackHighlighted: err.stack.replace(/[a-z_\d]+.js:\d+:\d+/gi, '<mark>$&</mark>')
    };
    res.status(err.status || 500);
    res.format({
      'text/html': () => {
        res.render('error', errorDetails);
      },
      'application/json': () => res.json(errorDetails)
    });
  };
  
  /* 
    Production Error Handler -> error view 
  */
  exports.productionErrors = (err, req, res, next) => {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: {}
    });
  };