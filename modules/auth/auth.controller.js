import authService from "./auth.service.js";
import { catchAsync } from "../../utils/CatchAsync.js";



export const signup = catchAsync(async (req, res) => {
    const result = await authService.signup(req.body);

    return res.status(201).json(result);
});

export const verifyEmail = catchAsync(async (req, res) => {
    const result = await authService.verifyEmail(req.params.token);

    return res.status(200).json(result);
});

export const login = catchAsync(async (req, res) => {
    const data = {
        identifier: req.body.identifier,
        password: req.body.password,
        cookie: res.cookie.bind(res)
    }
    const result = await authService.login(data);

    return res.status(200).json(result);
});

//We'll make this route as a protected route with a middleware as only users with valid JWT and refresh token can hit this route because without those tokens logout doesn't make any sense
//Blacklist this token in redis
//clear the cookie 
//delete that particular refresh token from the refresh token collection in the database
//and do not nuke all the sessions just nuke the current device -> current session
export const logout = catchAsync(async (req, res) => {
    const refreshToken = req.signedCookies?.refreshToken;
    const accessToken = req.headers.authorization?.split(' ')[1];



    await authService.logout(refreshToken, accessToken);



    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        signed: true
    });




    return res.status(200).json({ message: 'Logout Successful' });
});


export const refresh = catchAsync(async (req, res) => {
    // Pack all necessary context & methods to pass to the service
    const data = {
        refreshToken: req.signedCookies?.refreshToken,
        cookie: res.cookie.bind(res),
        clearCookie: res.clearCookie.bind(res) // Pass this so the service can clear cookies on security alerts
    };

    const accessToken = await authService.refresh(data);

    // Send the standard express response
    return res.status(200).json({
        message: 'Session Refresh Successful',
        accessToken
    });
});

export const forgetPassword = catchAsync(async (req, res) => {

    const result = await authService.forgetPassword(req.body.identifier);

    return res.status(200).json(result);
});

export const resetPassword = catchAsync(async (req, res) => {
    const result = await authService.resetPassword({
        rawToken: req.params.token,
        newPassword: req.body.newPassword
    });

    return res.status(200).json(result);
});
