const express = require('express');
const router = express.Router();
const { catchErrors } = require('../handlers/errorHandlers'); 
const storeController = require('../controllers/storeController');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const reservationController = require('../controllers/reservationController');
const reviewController = require('../controllers/reviewController');

//LOG OUT
router.get('/logout', authController.logout);

router.get('/index/', storeController.homePage);

router.get('/stores-map', storeController.getStoresMap);

//1st step ADD STORE -> show the form 
router.get('/add/', authController.isLoggedIn, storeController.addStore);  

//2nd step ADD STORE -> receive the data 
router.post('/add/',  
    authController.isLoggedIn, 
    storeController.verify, // verify type image 
    catchErrors(storeController.upload), // resize and upload to filesystem 
    catchErrors(storeController.createStore) // save in DB 
);   
 
// SHOW a certain STORE 
router.get('/store/:slug', catchErrors(storeController.getStoreBySlug));

// SHOW all STOREs 
router.get('/stores', catchErrors(storeController.getStores));

//1st step EDIT STORE -> show the form with current data 
router.get('/stores/:id/edit', authController.isLoggedIn, catchErrors(storeController.editStore));

// SHOW all TAGs
router.get('/tags', catchErrors(storeController.getStoresByTag));
//SHOW a certain TAG
router.get('/tags/:tag', catchErrors(storeController.getStoresByTag)); 

//2nd step EDIT STORE -> receive the updated data 
router.post('/add/:id',
    authController.isLoggedIn,
    storeController.verify,
    catchErrors(storeController.upload),
    catchErrors(storeController.updateStore)
);

// Ruta para eliminar una tienda
router.delete('/stores/:id', authController.isLoggedIn, catchErrors(storeController.deleteStore));

//1st step SIGN-UP a USER -> show the form
router.get('/register', userController.registerForm);

//2nd step SIGN-UP a USER -> validate, register, login
router.post('/register',
    userController.validationRules(),
    userController.validationCustomRules(),
    userController.validateRegister,
    userController.register,
    authController.login
);

//1st step LOG IN -> show the form
router.get('/login', authController.loginForm);

//2nd step LOG IN -> do the login
router.post('/login', authController.login);

// SHOW ACCOUNT
router.get('/account',
    authController.isLoggedIn,
    userController.account
);

// EDIT ACCOUNT
router.post('/account',
    authController.isLoggedIn,
    catchErrors(userController.updateAccount)
);

// Rutas para las reservas
router.post('/reservations', authController.isLoggedIn, catchErrors(reservationController.createReservation));
router.get('/reservations', authController.isLoggedIn, catchErrors(reservationController.getReservations));
router.delete('/reservations/:id', authController.isLoggedIn, catchErrors(reservationController.cancelReservation));

router.post('/reviews/:id',
    authController.isLoggedIn,
    catchErrors(reviewController.addReview)
);

//SHOW TOP STORES
router.get('/top', catchErrors(storeController.getTopStores));

//RECEIVE FORGOT ACCOUNT ACTION
router.post('/account/forgot', catchErrors(authController.forgot));

//1st step RESET PASSWD -> show the form
router.get('/account/reset/:token', catchErrors(authController.reset));

//2nd step RESET PASSWD -> change passwd
router.post('/account/reset/:token',
    authController.validationCustomRules(),
    authController.validatePassUpdate,
    catchErrors(authController.updatePassword)
);

//***API REST --> Functions to be consumed by the front end via AJAX  

//req.query -> /api/v1/search?q=hola 
router.get('/api/v1/search', catchErrors(storeController.searchStores)); 

module.exports = router;
