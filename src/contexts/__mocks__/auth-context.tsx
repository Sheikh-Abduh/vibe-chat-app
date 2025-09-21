import React from 'react';

export const useAuth = () => ({
  currentUser: {
    uid: 'test-user-id',
    displayName: 'Test User',
    email: 'test@example.com',
    photoURL: 'https://example.com/avatar.jpg',
  },
  isAuthenticated: true,
  loading: false,
  signIn: jest.fn(),
  signOut: jest.fn(),
});

export const AuthProvider = ({ children }) => children;