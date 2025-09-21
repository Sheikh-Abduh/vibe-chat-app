import { ChatMessage } from '@/types/app';

/**
 * Check if a message is older than the specified number of days
 */
export function isMessageOlderThan(message: ChatMessage, days: number): boolean {
  if (!message.timestamp) return false;
  
  const messageDate = message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return messageDate < cutoffDate;
}

/**
 * Filter out messages older than the specified number of days
 */
export function filterRecentMessages(messages: ChatMessage[], days: number = 30): ChatMessage[] {
  return messages.filter(message => !isMessageOlderThan(message, days));
}

/**
 * Get the count of messages that would be deleted
 */
export function getOldMessageCount(messages: ChatMessage[], days: number = 30): number {
  return messages.filter(message => isMessageOlderThan(message, days)).length;
}

/**
 * Get messages grouped by age (recent vs old)
 */
export function groupMessagesByAge(messages: ChatMessage[], days: number = 30): {
  recent: ChatMessage[];
  old: ChatMessage[];
} {
  const recent: ChatMessage[] = [];
  const old: ChatMessage[] = [];
  
  messages.forEach(message => {
    if (isMessageOlderThan(message, days)) {
      old.push(message);
    } else {
      recent.push(message);
    }
  });
  
  return { recent, old };
}

/**
 * Format the cleanup schedule description
 */
export function getCleanupScheduleDescription(): string {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(2, 0, 0, 0); // 2:00 AM UTC
  
  return `Next cleanup: ${tomorrow.toLocaleDateString()} at 2:00 AM UTC`;
}

/**
 * Calculate storage saved from cleanup (rough estimate)
 */
export function estimateStorageSaved(messageCount: number): string {
  // Rough estimate: average message is ~200 bytes
  const bytesPerMessage = 200;
  const totalBytes = messageCount * bytesPerMessage;
  
  if (totalBytes < 1024) {
    return `${totalBytes} bytes`;
  } else if (totalBytes < 1024 * 1024) {
    return `${(totalBytes / 1024).toFixed(1)} KB`;
  } else {
    return `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}