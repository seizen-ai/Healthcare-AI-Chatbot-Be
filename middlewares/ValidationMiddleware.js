import { AppError } from "../utils/AppError.js";


export const inputValidation = (schema) => {
    return (req, res, next) => {
        const { data, success, error } = schema.safeParse({
          body: req.body,
          query: req.query,
          params: req.params
        });
        

        if(!success){
        const formattedErrors = error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
        }));

        
        return next(new AppError('Input validation error', 400, formattedErrors));
        }

        
        req.body = data.body;
        req.query = data.query;
        req.params = data.params;

        next();
    };
};