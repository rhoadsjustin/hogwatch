import { mockHogWatchRepository, type HogWatchRepository } from '@hogwatch/data';
import { createHogWatchWorkerClient, type HogWatchChatClient } from './worker-client';

/**
 * The app uses the Worker when a public API URL is configured. It otherwise
 * remains useful in Expo Go with clearly labeled fixture data. The OpenAI key
 * never enters the bundle; only the Worker holds that server-side secret.
 */
const apiUrl = process.env.EXPO_PUBLIC_HOGWATCH_API_URL;
const workerClient = apiUrl ? createHogWatchWorkerClient(apiUrl) : undefined;

export const hogWatchMobileRepository: HogWatchRepository = workerClient?.repository ?? mockHogWatchRepository;
export const hogWatchMobileChat: HogWatchChatClient | undefined = workerClient?.chat;
