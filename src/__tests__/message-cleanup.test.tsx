import { 
  isMessageOlderThan, 
  filterRecentMessages, 
  getOldMessageCount, 
  groupMessagesByAge,
  estimateStorageSaved 
} from '@/lib/message-cleanup-utils';
import type { ChatMessage } from '@/types/app';

// Mock chat messages for testing
const createMockMessage = (daysAgo: number, id: string = 'test'): ChatMessage => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  
  return {
    id,
    text: `Test message ${id}`,
    senderId: 'user1',
    senderName: 'Test User',
    timestamp: date,
    type: 'text',
  };
};

describe('Message Cleanup Utils', () => {
  describe('isMessageOlderThan', () => {
    it('should return true for messages older than specified days', () => {
      const oldMessage = createMockMessage(35); // 35 days ago
      expect(isMessageOlderThan(oldMessage, 30)).toBe(true);
    });

    it('should return false for messages newer than specified days', () => {
      const recentMessage = createMockMessage(25); // 25 days ago
      expect(isMessageOlderThan(recentMessage, 30)).toBe(false);
    });

    it('should return false for messages without timestamp', () => {
      const messageWithoutTimestamp = {
        ...createMockMessage(35),
        timestamp: undefined as any
      };
      expect(isMessageOlderThan(messageWithoutTimestamp, 30)).toBe(false);
    });

    it('should handle edge case of exactly 30 days', () => {
      const exactlyThirtyDaysAgo = createMockMessage(30);
      expect(isMessageOlderThan(exactlyThirtyDaysAgo, 30)).toBe(false);
    });
  });

  describe('filterRecentMessages', () => {
    it('should filter out old messages and keep recent ones', () => {
      const messages = [
        createMockMessage(35, 'old1'),
        createMockMessage(25, 'recent1'),
        createMockMessage(40, 'old2'),
        createMockMessage(15, 'recent2'),
      ];

      const recentMessages = filterRecentMessages(messages, 30);
      
      expect(recentMessages).toHaveLength(2);
      expect(recentMessages.map(m => m.id)).toEqual(['recent1', 'recent2']);
    });

    it('should return all messages if none are old', () => {
      const messages = [
        createMockMessage(10, 'recent1'),
        createMockMessage(20, 'recent2'),
        createMockMessage(5, 'recent3'),
      ];

      const recentMessages = filterRecentMessages(messages, 30);
      expect(recentMessages).toHaveLength(3);
    });

    it('should return empty array if all messages are old', () => {
      const messages = [
        createMockMessage(35, 'old1'),
        createMockMessage(40, 'old2'),
        createMockMessage(50, 'old3'),
      ];

      const recentMessages = filterRecentMessages(messages, 30);
      expect(recentMessages).toHaveLength(0);
    });
  });

  describe('getOldMessageCount', () => {
    it('should count old messages correctly', () => {
      const messages = [
        createMockMessage(35, 'old1'),
        createMockMessage(25, 'recent1'),
        createMockMessage(40, 'old2'),
        createMockMessage(15, 'recent2'),
      ];

      const oldCount = getOldMessageCount(messages, 30);
      expect(oldCount).toBe(2);
    });

    it('should return 0 if no messages are old', () => {
      const messages = [
        createMockMessage(10, 'recent1'),
        createMockMessage(20, 'recent2'),
      ];

      const oldCount = getOldMessageCount(messages, 30);
      expect(oldCount).toBe(0);
    });
  });

  describe('groupMessagesByAge', () => {
    it('should group messages correctly by age', () => {
      const messages = [
        createMockMessage(35, 'old1'),
        createMockMessage(25, 'recent1'),
        createMockMessage(40, 'old2'),
        createMockMessage(15, 'recent2'),
      ];

      const grouped = groupMessagesByAge(messages, 30);
      
      expect(grouped.recent).toHaveLength(2);
      expect(grouped.old).toHaveLength(2);
      expect(grouped.recent.map(m => m.id)).toEqual(['recent1', 'recent2']);
      expect(grouped.old.map(m => m.id)).toEqual(['old1', 'old2']);
    });

    it('should handle empty arrays', () => {
      const grouped = groupMessagesByAge([], 30);
      expect(grouped.recent).toHaveLength(0);
      expect(grouped.old).toHaveLength(0);
    });
  });

  describe('estimateStorageSaved', () => {
    it('should format bytes correctly', () => {
      expect(estimateStorageSaved(1)).toBe('200 bytes');
      expect(estimateStorageSaved(2)).toBe('400 bytes');
    });

    it('should format KB correctly', () => {
      expect(estimateStorageSaved(10)).toBe('2.0 KB'); // 2000 bytes = ~2KB
      expect(estimateStorageSaved(100)).toBe('19.5 KB'); // 20000 bytes = ~19.5KB
    });

    it('should format MB correctly', () => {
      expect(estimateStorageSaved(10000)).toBe('1.9 MB'); // 2MB
    });

    it('should handle zero messages', () => {
      expect(estimateStorageSaved(0)).toBe('0 bytes');
    });
  });
});