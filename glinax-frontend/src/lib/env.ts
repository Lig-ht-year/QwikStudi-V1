/**
 * Environment Variables Validation
 * 
 * Validates required environment variables at runtime to catch configuration errors early.
 */

const requiredEnvVars = [
    // Add your required environment variables here
    // Examples:
    'NEXT_PUBLIC_API_URL',
    // 'NEXT_PUBLIC_AI_API_KEY',
] as const;

const optionalEnvVars = [
    'NEXT_PUBLIC_GA_ID',
    'NEXT_PUBLIC_SENTRY_DSN',
] as const;

interface EnvVars {
    // Required
    NEXT_PUBLIC_API_URL: string;
    // NEXT_PUBLIC_AI_API_KEY: string;

    // Optional
    NEXT_PUBLIC_GA_ID?: string;
    NEXT_PUBLIC_SENTRY_DSN?: string;
}

/**
 * Validates that all required environment variables are set
 * Throws an error if any required variables are missing
 */
export function validateEnv(): EnvVars {
    const missing: string[] = [];

    // Check required variables
    for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
            missing.push(envVar);
        }
    }

    if (missing.length > 0) {
        throw new Error(
            `Missing required environment variables:\n${missing.map(v => `  - ${v}`).join('\n')}\n\n` +
            `Please add them to your .env.local file.`
        );
    }

    // Return typed environment object
    return {
        // Required (uncomment when you add them)
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL!,
        // NEXT_PUBLIC_AI_API_KEY: process.env.NEXT_PUBLIC_AI_API_KEY!,

        // Optional
        NEXT_PUBLIC_GA_ID: process.env.NEXT_PUBLIC_GA_ID,
        NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    };
}

/**
 * Get environment variables (validated)
 * Only call this after validateEnv() has been called
 */
export function getEnv(): EnvVars {
    return {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL!,
        NEXT_PUBLIC_GA_ID: process.env.NEXT_PUBLIC_GA_ID,
        NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    };
}

// Validate environment on module load (only in browser/server, not during build)
if (typeof window !== 'undefined' || process.env.NODE_ENV === 'production') {
    try {
        validateEnv();
    } catch (error) {
        if (process.env.NODE_ENV === 'production') {
            console.error('Environment validation failed:', error);
        }
    }
}
