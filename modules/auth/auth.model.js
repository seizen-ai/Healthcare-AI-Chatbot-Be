import mongoose from 'mongoose';
import { email } from 'zod/v4';


// blueprint of user's blueprint!
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
// collection= array

//DB Indexing -> Improves performance
//createIndex -> actual database operation -> that creates the index on our specified fields at the instant it is called -> mongoDB engine starts the process of creating index the moment it sees createIndex()
//index -> using this we define the index on the schema and mongoDB engine parses it during reading our collection schema
//Compound indexing -> creating a single index on multiple fields

userSchema.index({ email : 1 });

export const User = mongoose.model('User', userSchema);


