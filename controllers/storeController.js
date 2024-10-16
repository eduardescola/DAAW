const multer = require('multer'); 
const mongoose = require('mongoose');
const Store = mongoose.model('Store'); 

const multerOptions = { 
    storage: multer.memoryStorage(), 
    fileFilter: function(req, file, next) { 
        const isPhoto = file.mimetype.startsWith('image/'); 
        if (isPhoto) { 
            next(null, true); //1st value is provided in case of error. 
            } else { 
                next({ message: 'That filetype isn\'t allowed'}, false);  
            } 
        } 
}; 

const uuid = require('uuid'); 
const jimp = require('jimp');

//MIDLEWARE FUNCTION for CREATE STORE 
exports.verify = multer(multerOptions).single('photo');

exports.homePage = (req, res) => {
    req.flash('error', `hola <strong>que</strong> tal`);
    req.flash('info', `hola`);
    req.flash('warning', `hola`);
    req.flash('success', `hola`);

    res.render('extendingLayout'); 
     
};

exports.addStore = (req, res) => {   //same template is used to create and to edit 
    res.render('editStore', { title: 'Add Store' });   

}; 

//MIDLEWARE FUNCTION for CREATE STORE 
exports.upload = async (req, res, next) => {     
    //check if there is no new file to resize     
    if (!req.file) {        
         next(); // no file -> do nothing and go to next middleware         
         return;     
    }     
    console.log(req.body);     
    console.log(req.file);      
    
    const extension = req.file.mimetype.split('/')[1];    
    req.body.photo = `${uuid.v4()}.${extension}`;      
    
    //now we resize and write in hard-drive     
    const photo = await Jimp.read(req.file.buffer);     
    photo.resize({ w: 800, h: Jimp.AUTO }); //width=800, height=AUTO     
    await photo.write(`./public/uploads/${req.body.photo}`);          
    
    //photo saved in file system, keep going with the PIPELINE     
    next(); 
}; 

exports.createStore = async (req, res) => {   
    const store = new Store(req.body);   
    const savedStore = await store.save();   
    console.log('Store saved!');    
    
    req.flash('success', `Successfully Created ${store.name}.`);    
    
    res.redirect(`/store/${savedStore.slug}`);  
}; 

exports.getStoreBySlug = async (req, res, next) => {    
    const store = await Store.findOne({ slug: req.params.slug });    
    
    // If no store -> DB send a NULL -> do nothing and follow the pipeline   
    if (!store) {     
        next();     
        return;   
    }    
    res.render('store', { title: `Store ${store.name}`, store: store}); 
}; 

exports.getStores = async (req, res) => {    
    const stores = await Store.find();   
    res.render('stores', {title: 'Stores', stores: stores}); 
}; 

exports.editStore = async (req, res) => {
    const store = await Store.findOne({ _id: req.params.id });
    res.render('editStore', { title: `Edit ${store.name}`, store: store });
  };
  
exports.updateStore = async (req, res) => {
    // find and update the store
    const store = await Store.findOneAndUpdate(
      { _id: req.params.id },
      req.body,
      {
        new: true, // return new store instead of old one
        runValidators: true
      }
    ).exec();
  
    req.flash('success', `Successfully updated <strong>${store.name}</strong>. <a href="/store/${store.slug}">View store</a>`);
    res.redirect(`/stores/${store._id}/edit`);
};

exports.searchStores = async (req, res) => {   

    const stores = await Store.find({         
        $text: { //1er param: query filter -> conditions             
            $search: req.query.q         
        }     
    }, { //2n param: query projection -> fields to include/exclude from the results         
        score: { $meta: 'textScore' }     
    }).sort({ //first filter          
        score: { $meta: 'textScore' }     
    }).limit(5); //second filter      
    res.json({ stores, length: stores.length }); 
}; 