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
        identifier: z.string({ required_error: 'Either Email or Username Identifier is Required' }).trim(),
        password: z.string({ required_error: "Password is required" }).min(8, "Password must be atleast 8 characters long")
    })
});

export const forgetPasswordSchema = z.object({
    body: z.object({
        username: z.string().trim().min(1, "Username cannot be empty").optional(),
        email: z.string().trim().email("Email is provided in an invalid format").optional(),
    })
        .refine(
            (data) => {
                const hasUsername = !!data.username;
                const hasEmail = !!data.email;
                return hasUsername || hasEmail;
            },
            {
                message: "Please provide either a username or an email address",
                path: ["username"],
            }
        )

        .refine(
            (data) => {
                const hasUsername = !!data.username;
                const hasEmail = !!data.email;
                return !(hasUsername && hasEmail);
            },
            {
                message: "Provide either a username or an email, not both",
                path: ["username"],
            }
        )
});

export const resetPasswordSchema = z.object({
    params: z.object({
        token: z.string().min(1, "Reset token is required")
    }),
    body: z.object({
        newPassword: z
            .string()
            .min(8, "Password must be at least 8 characters long")
            .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
            .regex(/[0-9]/, "Password must contain at least one number"),
        confirmPassword: z.string().min(1, "Please confirm your password")
    }).refine(
        (data) => data.newPassword === data.confirmPassword,
        {
            message: "Passwords do not match",
            path: ["confirmPassword"]
        }
    )
});
