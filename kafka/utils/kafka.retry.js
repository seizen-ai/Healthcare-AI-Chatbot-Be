export const retryOperation = async (
    operation,
    { retries = 10, delayMs = 3000, label = "Operation" } = {}
) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            if (attempt === retries) {
                throw error;
            }

            console.warn(
                `${label} failed (attempt ${attempt}/${retries}): ${error.message}. Retrying in ${delayMs}ms...`
            );

            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
    }
};
