
# Usage Examples

This document provides examples of how to use the voice/video API.

## Starting a new call

```typescript
import { CommunicationManager } from '@/lib/voice-video-api/managers/communication-manager';

const communicationManager = CommunicationManager.getInstance();

const callOptions = {
  callId: 'my-call-id',
  userId: 'my-user-id',
  callType: 'video',
};

communicationManager.startCall(callOptions);
```

## Joining an existing call

```typescript
import { CommunicationManager } from '@/lib/voice-video-api/managers/communication-manager';

const communicationManager = CommunicationManager.getInstance();

communicationManager.joinCall('existing-call-id', 'my-user-id', 'video');
```

## Handling connection events

```typescript
import { CommunicationManager } from '@/lib/voice-video-api/managers/communication-manager';
import { ConnectionMonitor } from '@/lib/voice-video-api/managers/connection-monitor';

const communicationManager = CommunicationManager.getInstance();
const connectionMonitor = new ConnectionMonitor();

connectionMonitor.startMonitoring(communicationManager.getCurrentProvider(), {
  onQualityChange: (quality, metrics) => {
    console.log('Connection quality changed:', quality);
  },
  onFailoverRequired: () => {
    console.log('Failover required!');
    communicationManager.switchToNextProvider();
  },
});
```
