/**
 * Notification channel ids are versioned because Android channel sound and
 * vibration settings become immutable after the channel is first created.
 */
export const MESSAGE_NOTIFICATION_CHANNEL_ID = "travel_messages_v5";
export const CALL_NOTIFICATION_CHANNEL_ID = "travel_calls_v5";

export const MESSAGE_NOTIFICATION_SOUND = "messenger.mp3";
export const CALL_NOTIFICATION_SOUND = "call.mp3";

export const MESSAGE_VIBRATION_PATTERN = [0, 90, 55, 140] as const;
export const CALL_VIBRATION_PATTERN = [0, 650, 350, 650] as const;
