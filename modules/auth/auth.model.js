import mongoose from 'mongoose';



const userSchema = new mongoose.Schema({
    username : { type : String, required : true, unique : true },
    email : { type : String, required : true, unique : true },
    isVerfied : { type : Boolean, default : false },//Send e-mail to user for email verification
    password : { type : String, required : true },
    role : { type : String, enum : ['user', 'admin'], default : 'user' }
},
{ timestamps : true });
//here,
//user -> hospitals
//admin -> seizen-ai
// NOSQL -> MONGODB

//COLLECTION
export const User = mongoose.model('User', userSchema);


