const multer = require('multer'); 
const mongoose = require('mongoose');
const Store = mongoose.model('Store'); 
const Reservation = mongoose.model('Reservation');
const TimeSlot = mongoose.model('TimeSlot');

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

    try {
        if (req.body.timeSlots) {
            let timeSlots = req.body.timeSlots;
            if (!Array.isArray(timeSlots.slot)) {
                timeSlots.slot = [timeSlots.slot];
                timeSlots.maxReservations = [timeSlots.maxReservations];
            }

            // Asegurarse de que maxReservations tenga el mismo número de elementos que slots
            if (timeSlots.slot.length !== timeSlots.maxReservations.length) {
                const firstMaxReservation = timeSlots.maxReservations[0] || '0';
                // Rellenar maxReservations con el valor del primero si es necesario
                while (timeSlots.maxReservations.length < timeSlots.slot.length) {
                    timeSlots.maxReservations.push(firstMaxReservation);
                }
            }

            timeSlots = timeSlots.slot.map((slot, index) => ({
                start: slot.split('-')[0],
                end: slot.split('-')[1],
                maxReservations: Number(timeSlots.maxReservations[index])
            }));

            const savedTimeSlots = await Promise.all(timeSlots.map(async (slot) => {
                const newSlot = new TimeSlot(slot);
                await newSlot.save();
                return newSlot._id;
            }));

            store.timeSlots = savedTimeSlots;
        }

        const savedStore = await store.save();
        req.flash('success', `Successfully Created ${store.name}.`);
        res.redirect(`/store/${savedStore.slug}`);
    } catch (err) {
        console.error('Error timeSlots:', err);
        req.flash('error', 'Uno o más intervalos de tiempo no se pudieron guardar.');
        res.redirect('back');
    }
};

exports.getStoreBySlug = async (req, res, next) => {
    const store = await Store.findOne({ slug: req.params.slug })
        .populate('timeSlots')
        .populate('reviews');

    if (!store) {
        return next();
    }

    // Calcular la media de las valoraciones
    const rating = store.reviews.length
        ? store.reviews.reduce((acc, review) => acc + review.rating, 0) / store.reviews.length
        : 0;

    res.render('store', { title: store.name, store: { ...store.toObject(), rating } });
};

exports.getStores = async (req, res) => {
    const page = req.params.page || 1;
    const limit = 4; // items in each page
    const skip = (page * limit) - limit;

    const storesPromise = Store
        .find() //look for ALL
        .skip(skip) //Skip items of former pages
        .limit(limit) //Take the desired number of items
        .sort({ created: 'desc' }) //sort them
        .populate('timeSlots'); // Populate timeSlots

    const countPromise = Store.countDocuments();
    
    const [stores, count] = await Promise.all([storesPromise, countPromise]);
    
    const pages = Math.ceil(count / limit);
    if (!stores.length && skip) {
        req.flash('info', `You asked for page ${page}. But that does not exist. So I put you on page ${pages}`);
        res.redirect(`/stores/page/${pages}`);
        return;
    }
    res.render('stores', {
        title: 'Stores', stores: stores, page: page,
        pages: pages, count: count
    });
};

exports.getStoresMap = async (req, res) => {
    // Obtén las tiendas con las reseñas ya pobladas
    const stores = await Store.find().populate('reviews');
    
    // Agrega el promedio de valoraciones a cada tienda
    const storesWithRatings = stores.map(store => {
        const reviews = store.reviews || [];
        const averageRating = reviews.length
            ? (reviews.reduce((sum, review) => sum + (review.rating || 0), 0) / reviews.length).toFixed(1)
            : 0;
        return {
            ...store.toObject(), // Convierte el documento Mongoose a un objeto JS normal
            averageRating,
        };
    });

    // Renderiza la vista con los datos actualizados
    res.render('storesMap', { title: 'Stores Map', stores: storesWithRatings });
};


exports.editStore = async (req, res) => {
    const store = await Store.findOne({ _id: req.params.id });
    confirmOwner(store, req.user);
    res.render('editStore', { title: `Edit ${store.name}`, store: store });
};
  
exports.updateStore = async (req, res) => {
    try {
        const store = await Store.findOne({ _id: req.params.id });

        if (req.user.role !== 'admin' && store.author.toString() !== req.user._id.toString()) {
            req.flash('error', 'No tienes permiso para editar esta tienda.');
            return res.redirect(`/stores/${store._id}`);
        }

        if (req.body.timeSlots) {
            await TimeSlot.deleteMany({ _id: { $in: store.timeSlots } });

            let timeSlots = req.body.timeSlots;
            if (!Array.isArray(timeSlots.slot)) {
                timeSlots.slot = [timeSlots.slot];
                timeSlots.maxReservations = [timeSlots.maxReservations];
            }

            // Asegurarse de que maxReservations tenga el mismo número de elementos que slots
            if (timeSlots.slot.length !== timeSlots.maxReservations.length) {
                const firstMaxReservation = timeSlots.maxReservations[0] || '0';
                // Rellenar maxReservations con el valor del primero si es necesario
                while (timeSlots.maxReservations.length < timeSlots.slot.length) {
                    timeSlots.maxReservations.push(firstMaxReservation);
                }
            }

            timeSlots = timeSlots.slot.map((slot, index) => {
                const maxReservations = Number(timeSlots.maxReservations[index]);
                console.log('slot:', slot, 'maxReservations:', maxReservations);
                if (isNaN(maxReservations)) {
                    throw new Error('Invalid maxReservations value');
                }
                return {
                    start: slot.split('-')[0],
                    end: slot.split('-')[1],
                    maxReservations: maxReservations
                };
            });

            const savedTimeSlots = await Promise.all(timeSlots.map(async (slot) => {
                const newSlot = new TimeSlot(slot);
                await newSlot.save();
                return newSlot._id;
            }));

            req.body.timeSlots = savedTimeSlots;
        }

        const updatedStore = await Store.findOneAndUpdate(
            { _id: req.params.id },
            req.body,
            {
                new: true,
                runValidators: true
            }
        ).exec();

        req.flash('success', `Successfully updated ${updatedStore.name}.`);
        res.redirect(`/store/${updatedStore.slug}`);
    } catch (error) {
        console.error('Error timeSlots:', error);
        req.flash('error', 'Hubo un problema al actualizar la tienda.');
        res.redirect('back');
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
    if (!(store.author.toString() === user._id.toString() || user.role === 'admin')) {
        throw Error('You must own the store in order to edit it');
    }
}; 