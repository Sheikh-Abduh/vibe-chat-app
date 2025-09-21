
# Migration Guide

This document provides a guide for migrating from the old WebRTC implementation to the new voice/video API.

## Key Differences

- **Abstraction:** The new API provides a higher level of abstraction, so you no longer need to interact directly with the WebRTC APIs.
- **Multi-Provider Support:** The new API supports multiple providers, allowing for better quality and reliability.
- **Automatic Failover:** The new API automatically handles failover between providers, so you don't need to implement this logic yourself.

## Migration Steps

1. **Remove old WebRTC code:** Remove all code related to the old WebRTC implementation.
2. **Configure providers:** Configure the desired providers in the `src/lib/voice-video-api/config.ts` file.
3. **Update call initiation:** Replace the old call initiation logic with the `CommunicationManager.startCall()` method.
4. **Update event handling:** Replace the old event handling logic with the `ConnectionMonitor` and its callbacks.
