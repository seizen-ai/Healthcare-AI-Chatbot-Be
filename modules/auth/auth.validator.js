import { z } from "zod";

export const signupSchema = z.object({
    body: z.object({
        username: z.string().trim().min(3, "Username must be at least 3 characters long"),
        email: z.string().trim().email("Email is provided in an invalid format"),
        password: z.string().min(8, "Password must be at least 8 characters long")
    })
});

export const verifyEmailSchema = z.object({
    params: z.object({
        token: z.string().min(1, "Verification token is required")
    })
});

export const loginSchema = z.object({
    body: z.object({
        username: z.string().trim().optional(),
        email: z.string().trim().email("Email is provided in an invalid format").optional(),
        password: z.string().min(1, "Password is required")
    }).refine(
        (data) => {
            const hasUsername = data.username !== undefined && data.username.length > 0;
            const hasEmail = data.email !== undefined && data.email.length > 0;
            
            return hasUsername || hasEmail;
        },
        {
            message: "Either username or email is required",
            path: ["username"], 
        }
    )
});
