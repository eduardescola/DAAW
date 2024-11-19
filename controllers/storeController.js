const multer = require('multer'); 
const mongoose = require('mongoose');
const Store = mongoose.model('Store'); 
const Reservation = mongoose.model('Reservation');

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
const { Jimp } = require('jimp'); 

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

exports.deleteStore = async (req, res) => {
    const { id } = req.params;
    await Store.findByIdAndDelete(id);
    req.flash('success', 'Store deleted successfully');
    res.redirect('/stores');
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
    req.body.author = req.user._id; 
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
    const page = req.params.page || 1;
    const limit = 4; // items in each page
    const skip = (page * limit) - limit;

    const storesPromise = Store
        .find() //look for ALL
        .skip(skip) //Skip items of former pages
        .limit(limit) //Take the desired number of items
        .sort({ created: 'desc' }); //sort them

    const countPromise = Store.countDocuments();
    
    const [stores, count] = await Promise.all([storesPromise,countPromise]);
    
    const pages = Math.ceil(count / limit);
    if (!stores.length && skip) {
        req.flash('info', `You asked for page ${page}. But that does not exist. So
        I put you on page ${pages}`);
        res.redirect(`/stores/page/${pages}`);
        return;
    }
    res.render('stores', {
        title: 'Stores', stores: stores, page: page,
        pages: pages, count: count
    });
};

exports.getStoresMap = async (req, res) => {
    const stores = await Store.find();
    res.render('storesMap', { title: 'Stores Map', stores: stores });
};

exports.editStore = async (req, res) => {
    const store = await Store.findOne({ _id: req.params.id });
    confirmOwner(store, req.user);
    res.render('editStore', { title: `Edit ${store.name}`, store: store });
};
  
exports.updateStore = async (req, res) => {
    try {
        // Verificar si el usuario es un administrador o el dueño de la tienda
        const store = await Store.findOne({ _id: req.params.id });

        // Si no se encuentra la tienda, devolver un error 404
        if (!store) {
            req.flash('error', 'La tienda no fue encontrada.');
            return res.redirect('/stores');
        }

        // Si el usuario no es administrador, asegurarse de que es el dueño de la tienda
        if (req.user.role !== 'admin' && store.author.toString() !== req.user._id.toString()) {
            req.flash('error', 'No tienes permiso para editar esta tienda.');
            return res.redirect(`/stores/${store._id}`);
        }

        // Si el usuario tiene permiso (es el dueño o admin), proceder con la actualización
        const updatedStore = await Store.findOneAndUpdate(
            { _id: req.params.id },
            req.body,
            {
                new: true, // Devolver el objeto actualizado
                runValidators: true // Ejecutar las validaciones del modelo
            }
        ).exec();

        // Si no se ha actualizado, devolver un mensaje de error
        if (!updatedStore) {
            req.flash('error', 'No se pudo actualizar la tienda.');
            return res.redirect(`/stores/${store._id}/edit`);
        }

        // Si la actualización es exitosa, mostrar mensaje de éxito
        req.flash('success', `Se actualizó correctamente <strong>${updatedStore.name}</strong>. <a href="/store/${updatedStore.slug}">Ver tienda</a>`);
        res.redirect(`/stores/${updatedStore._id}/edit`);

    } catch (error) {
        console.error(error);
        req.flash('error', 'Ocurrió un error al actualizar la tienda.');
        res.redirect(`/stores/${req.params.id}/edit`);
    }
};



exports.getStoresByTag = async (req, res) => {
    const tag = req.params.tag;
    const tagQuery = tag || { $exists: true};
    //Promise1: AGGREGATE operation
    const tagsPromise = Store.getTagsList();
    //Promise2: find all the stores where the tag property
    //of a store includes the tag passed by (or any tag)
    const storesPromise = Store.find({ tags: tagQuery });
    const [tags, stores] = await Promise.all([tagsPromise, storesPromise]);
   
    res.render('tags', { title: 'Tags', tags: tags, stores: stores, tag: tag});
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

exports.getTopStores = async (req, res) => {
    const stores = await Store.getTopStores();
    res.render('topStores', { stores, title: 'Top Stores'});
};

//*** Verify Credentials
const confirmOwner = (store, user) => {
    if (!(store.author == user._id || user.role === 'admin')) {
        throw Error('You must own the store in order to edit it');
    }
};