const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const slug = require('slugs');

const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,  // this normalizes names
    required: 'Please enter a store name!' //"name" is mandatory
  },
  slug: String,  // this element will be autogenerated
  description: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  latitude: {
    type: Number,
    required: 'Please enter the latitude!'
  },
  longitude: {
    type: Number,
    required: 'Please enter the longitude!'
  },
  tags: [String],  // array of strings
  created: {
    type: Date,
    default: Date.now
  },
  photo: String
});

// ********PRE-SAVE HOOK*********
storeSchema.pre('save', async function(next) {
  if (!this.isModified('name')) {
    next();
    return; // stop this function from running
  }
  this.slug = slug(this.name);
  const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i');
  const storesWithSlug = await this.constructor.find({ slug: slugRegEx });
  if (storesWithSlug.length) { // if slug exists -> increment
    this.slug = `${this.slug}-${storesWithSlug.length + 1}`;
  }
  next(); // follow the PIPELINE -> do the SAVE
});

// link “Store” with the storeSchema and make it importable
module.exports = mongoose.model('Store', storeSchema);

// *********INDEXES********** 
storeSchema.index({     
  name: 'text',  //we will search in the name attribute     
  description: 'text' //we will search in the desc. attribute 
}); 