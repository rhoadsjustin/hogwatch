import { mockHogWatchRepository, type HogWatchRepository } from '@hogwatch/data';

/**
 * The native app's composition root. It intentionally uses fixture-backed
 * analytics until a mobile-safe, authenticated API is introduced. Screens only
 * know this repository contract, so that change does not alter their UI code.
 */
export const hogWatchMobileRepository: HogWatchRepository = mockHogWatchRepository;
