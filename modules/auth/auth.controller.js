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

export const login = catchAsync(async (req, res) => {
    const data = {
        username : req.body.username,
        email : req.body.email,
        password : req.body.password,
        cookie : res.cookie.bind(res)
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
    const refreshToken = req.signedCookies.refreshToken;
    const accessToken =  req.headers.authorization?.split(' ')[1];

   
    
    await authService.logout(refreshToken, accessToken);



    res.clearCookie('refreshToken', {
        httpOnly : true,
        secure : process.env.NODE_ENV === 'production',
        sameSite : 'strict',
        signed : true
    });

    console.log(req.signedCookies.refreshToken);
    

    return res.status(200).json({ message : 'Logout Successful' });
});
