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

        
        import('fs').then(fs => {
            fs.writeFileSync('/tmp/val_err.json', JSON.stringify({
                body: req.body,
                params: req.params,
                errors: formattedErrors
            }, null, 2));
        }).catch(() => {});
        console.error('Validation Error:', JSON.stringify(formattedErrors, null, 2));
        return next(new AppError('Input validation error', 400, formattedErrors));
        }

        
        req.body = data.body;
        req.query = data.query;
        req.params = data.params;

        next();
    };
};
