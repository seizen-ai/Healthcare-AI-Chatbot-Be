import { AppError } from "./AppError.js";


export const inputValidation = (schema) => {
    return (req, res, next) => {
        const validated = schema.safeParse({
          body: req.body,
          query: req.query,
          params: req.params
        });

        if(!validated.success){
        const formattedErrors = validated.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
        }));

        
        return next(new AppError('Input validation error', 400, formattedErrors));
        }

        
        req.body = validated.body;
        req.query = validated.query;
        req.params = validated.params;

        next();
    };
};