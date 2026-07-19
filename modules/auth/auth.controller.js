import authService  from "./auth.service.js";
import { catchAsync } from "../../utils/CatchAsync.js";



export const signup = catchAsync(async (req, res) => {
    const result = await authService.signup(req.body);

    return res.status(201).json(result);
});

export const verifyEmail = catchAsync(async (req, res) => {
    const result = await authService.verifyEmail(req.params.token);

    return res.status(200).json(result);
});
