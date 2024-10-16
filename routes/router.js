const express = require('express');
const router = express.Router();
const { catchErrors } = require('../handlers/errorHandlers'); 
const storeController = require('../controllers/storeController');

router.get('/index/', storeController.homePage);

//1st step ADD STORE -> show the form 
router.get('/add/', storeController.addStore); 

//2nd step ADD STORE -> receive the data 
router.post('/add/',  storeController.verify, //verify type image 
    storeController.upload, //resize and upload to file system 
    storeController.createStore //save in DB 
);  

router.post('/add/',  
    storeController.verify, //verify type image 
    catchErrors(storeController.upload), //resize and upload to filesystem 
    catchErrors(storeController.createStore) //save in DB 
);  

// SHOW a certain STORE 
router.get('/store/:slug', catchErrors(storeController.getStoreBySlug));

// SHOW all STOREs 
router.get('/stores', catchErrors(storeController.getStores));

//1st step EDIT STORE -> show the form with current data 
router.get('/stores/:id/edit', catchErrors(storeController.editStore));   

//2nd step EDIT STORE -> receive the updated data 
router.post('/add/:id',   
    storeController.verify,    
    catchErrors(storeController.upload),    
    catchErrors(storeController.updateStore) 
); 

module.exports = router;
