"use client";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ReactNode } from "react";

export function ClientErrorBoundary({ children }: { children: ReactNode }) {
    return <ErrorBoundary>{children}</ErrorBoundary>;
}
