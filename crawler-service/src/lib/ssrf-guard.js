const PRIVATE_IP_PATTERNS = [
    /^10\./,
    /^172\.(1[6-9]|2\d|3[01])\./,
    /^192\.168\./,
    /^127\./,
    /^0\./,
    /^169\.254\./,
    /^(::1|fc|fd|fe80)/i,
];

const BLOCKED_HOSTNAMES = new Set([
    'localhost',
    'metadata.google.internal',
    'metadata.google',
    '169.254.169.254',
]);

export const isUrlSafe = (urlString) => {
    try {
        const parsed = new URL(urlString);
        const hostname = parsed.hostname.toLowerCase();

        if (!['http:', 'https:'].includes(parsed.protocol)) return false;
        if (BLOCKED_HOSTNAMES.has(hostname)) return false;
        if (PRIVATE_IP_PATTERNS.some((re) => re.test(hostname))) return false;

        return true;
    } catch {
        return false;
    }
};
