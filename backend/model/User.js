const mongoose = require('mongoose');
const {isEmail} =require('validator');
const bycrpt = require('bcrypt');


const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "can't be number"]
     },
     
        email:{
            type:String,
            required: [true, "can't be number"],
            lowercase: true,
            unique: true,
            index: true,
            validate: [isEmail, "invalid email"]

        }, 
        password:{
            type:String,
            required:[true, "can't be empty"]
        },
        picture:{
            type: String,

        },
        newMessage:{
            type:Object,
            default:{}
        },
        status:{
            type:String,
            default:'online'
        }
     
}, {minimize:false});


UserSchema.pre('save', function(next) {
    const user = this;
    if (!user.isModified('password')) return next();

    bycrpt.genSalt(10, function(err, salt) {
        if (err) return next(err);

        bycrpt.hash(user.password, salt, function(err, hash) {
            if (err) return next(err);

            user.password = hash;
            next();
        });
    });
});


UserSchema.methods.toJSON = function(){
    const user = this;
    const userObject = user.toObject();
    delete userObject.password;
    return userObject;
}

UserSchema.statics.findByCredentials = async function(email, password){
    try {
        const user = await this.findOne({email});
        if(!user) {
            throw new Error('User not found with the provided email');
        }

        const isMatch = await bycrpt.compare(password, user.password);
        if(!isMatch) {
            throw new Error('Invalid password');
        }

        return user;
    } catch (error) {
        throw new Error(error.message);
    }
};





const User = mongoose.model('User', UserSchema);

module.exports = User