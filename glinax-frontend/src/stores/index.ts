/**
 * Store Index - Re-exports all stores
 * 
 * New Architecture:
 * - useUIStore: Transient UI state (NOT persisted)
 * - useDataStore: Persistent user data (persisted)
 * - useChatStore: Legacy facade (backward compatible, uses both stores internally)
 */

export { useUIStore } from './uiStore';
export { useDataStore, type PlanType, type ResponseStyle } from './dataStore';

// Legacy export for backward compatibility
export { useChatStore, type ActiveMode } from './chatStore';
