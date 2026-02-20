let googleScriptPromise: Promise<void> | null = null;

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleAccountsIdApi {
  initialize: (options: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
  }) => void;
  prompt: () => void;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: GoogleAccountsIdApi;
      };
    };
  }
}

export type GoogleCredentialHandler = (credential: string) => void;

export async function loadGoogleIdentityScript(): Promise<void> {
  if (typeof window === "undefined") return;
  if (window.google?.accounts?.id) return;
  if (googleScriptPromise) return googleScriptPromise;

  googleScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]'
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load Google script.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google script."));
    document.head.appendChild(script);
  });

  return googleScriptPromise;
}

export function initializeGoogleSignIn(clientId: string, onCredential: GoogleCredentialHandler): void {
  if (typeof window === "undefined") return;
  if (!window.google?.accounts?.id) {
    throw new Error("Google Sign-In is not available.");
  }

  window.google.accounts.id.initialize({
    client_id: clientId,
    callback: (response: GoogleCredentialResponse) => {
      if (response?.credential) {
        onCredential(response.credential);
      }
    },
    auto_select: false,
    cancel_on_tap_outside: true,
  });
}

export function promptGoogleSignIn(): void {
  if (typeof window === "undefined") return;
  if (!window.google?.accounts?.id) {
    throw new Error("Google Sign-In is not available.");
  }
  window.google.accounts.id.prompt();
}
