/**
 * @jest-environment jsdom
 */

import { getUserInteractionStatus, canUsersInteract } from '@/lib/user-blocking';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock Firebase
jest.mock('@/lib/firebase', () => ({
  db: {},
  auth: { currentUser: null }
}));

// Mock Firestore functions
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  arrayUnion: jest.fn(),
  arrayRemove: jest.fn()
}));

describe('Unified Blocking Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserInteractionStatus', () => {
    it('should return correct status for blocked users (unified system)', async () => {
      const { getDoc } = require('firebase/firestore');
      
      // Mock user documents with blocked status (includes both blocked and disconnected)
      getDoc.mockResolvedValueOnce({
        data: () => ({
          blockedUsers: ['user2'],
          disconnectedUsers: ['user2']
        })
      }).mockResolvedValueOnce({
        data: () => ({
          blockedUsers: ['user1'],
          disconnectedUsers: ['user1']
        })
      });

      const status = await getUserInteractionStatus('user1', 'user2');
      
      expect(status.canInteract).toBe(false);
      expect(status.isBlocked).toBe(true);
      expect(status.isDisconnected).toBe(true);
      expect(status.canInteractInCommunity).toBe(false);
    });

    it('should return correct status for normal users', async () => {
      const { getDoc } = require('firebase/firestore');
      
      // Mock user documents with no restrictions
      getDoc.mockResolvedValueOnce({
        data: () => ({
          blockedUsers: [],
          disconnectedUsers: []
        })
      }).mockResolvedValueOnce({
        data: () => ({
          blockedUsers: [],
          disconnectedUsers: []
        })
      });

      const status = await getUserInteractionStatus('user1', 'user2');
      
      expect(status.canInteract).toBe(true);
      expect(status.isBlocked).toBe(false);
      expect(status.isDisconnected).toBe(false);
      expect(status.canInteractInCommunity).toBe(false); // Community interactions removed - focusing on one-on-one calls only
    });

    it('should treat disconnected-only users as blocked in unified system', async () => {
      const { getDoc } = require('firebase/firestore');
      
      // Mock user documents with only disconnected status (legacy case)
      getDoc.mockResolvedValueOnce({
        data: () => ({
          blockedUsers: [],
          disconnectedUsers: ['user2']
        })
      }).mockResolvedValueOnce({
        data: () => ({
          blockedUsers: [],
          disconnectedUsers: ['user1']
        })
      });

      const status = await getUserInteractionStatus('user1', 'user2');
      
      expect(status.canInteract).toBe(false);
      expect(status.isBlocked).toBe(true); // Treated as blocked in unified system
      expect(status.isDisconnected).toBe(true);
      expect(status.canInteractInCommunity).toBe(false); // No community interaction
    });
  });

  describe('canUsersInteract', () => {
    it('should prevent all interaction if blocked (unified system)', async () => {
      const { getDoc } = require('firebase/firestore');
      
      // Mock user documents with blocked status - need to mock for both calls
      getDoc
        .mockResolvedValueOnce({
          data: () => ({
            blockedUsers: ['user2'],
            disconnectedUsers: ['user2']
          })
        })
        .mockResolvedValueOnce({
          data: () => ({
            blockedUsers: ['user1'],
            disconnectedUsers: ['user1']
          })
        })
        .mockResolvedValueOnce({
          data: () => ({
            blockedUsers: ['user2'],
            disconnectedUsers: ['user2']
          })
        })
        .mockResolvedValueOnce({
          data: () => ({
            blockedUsers: ['user1'],
            disconnectedUsers: ['user1']
          })
        });

      const canInteractDirect = await canUsersInteract('user1', 'user2', false);
      const canInteractCommunity = await canUsersInteract('user1', 'user2', true);
      
      expect(canInteractDirect).toBe(false);
      expect(canInteractCommunity).toBe(false); // No community interaction in unified system
    });

    it('should allow all interaction for normal users', async () => {
      const { getDoc } = require('firebase/firestore');
      
      // Mock user documents with no restrictions - need to mock for both calls
      getDoc
        .mockResolvedValueOnce({
          data: () => ({
            blockedUsers: [],
            disconnectedUsers: []
          })
        })
        .mockResolvedValueOnce({
          data: () => ({
            blockedUsers: [],
            disconnectedUsers: []
          })
        })
        .mockResolvedValueOnce({
          data: () => ({
            blockedUsers: [],
            disconnectedUsers: []
          })
        })
        .mockResolvedValueOnce({
          data: () => ({
            blockedUsers: [],
            disconnectedUsers: []
          })
        });

      const canInteractDirect = await canUsersInteract('user1', 'user2', false);
      const canInteractCommunity = await canUsersInteract('user1', 'user2', true);
      
      expect(canInteractDirect).toBe(true);
      expect(canInteractCommunity).toBe(true);
    });

    it('should prevent all interaction for legacy disconnected users', async () => {
      const { getDoc } = require('firebase/firestore');
      
      // Mock user documents with only disconnected status (legacy case) - need to mock for both calls
      getDoc
        .mockResolvedValueOnce({
          data: () => ({
            blockedUsers: [],
            disconnectedUsers: ['user2']
          })
        })
        .mockResolvedValueOnce({
          data: () => ({
            blockedUsers: [],
            disconnectedUsers: ['user1']
          })
        })
        .mockResolvedValueOnce({
          data: () => ({
            blockedUsers: [],
            disconnectedUsers: ['user2']
          })
        })
        .mockResolvedValueOnce({
          data: () => ({
            blockedUsers: [],
            disconnectedUsers: ['user1']
          })
        });

      const canInteractDirect = await canUsersInteract('user1', 'user2', false);
      const canInteractCommunity = await canUsersInteract('user1', 'user2', true);
      
      expect(canInteractDirect).toBe(false);
      expect(canInteractCommunity).toBe(false); // Treated as blocked in unified system
    });
  });
});