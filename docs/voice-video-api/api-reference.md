
# API Reference

This document provides a detailed reference for the public interfaces of the voice/video API.

## CommunicationManager

The `CommunicationManager` is the main entry point for interacting with the voice/video API.

### Methods

- `startCall(options: CallStartOptions): Promise<void>`: Starts a new call.
- `endCall(): Promise<void>`: Ends the current call.
- `joinCall(callId: string, userId: string, callType: CallType): Promise<boolean>`: Joins an existing call.
- `leaveCall(): Promise<void>`: Leaves the current call.
- `toggleMute(): Promise<void>`: Toggles the microphone mute state.
- `toggleVideo(): Promise<void>`: Toggles the camera video state.
- `toggleScreenShare(): Promise<void>`: Toggles screen sharing.

## ProviderRouter

The `ProviderRouter` is responsible for selecting the best provider for a call.

### Methods

- `selectProvider(requirements: CallRequirements): Promise<BaseProvider>`: Selects the best available provider for the given requirements.
- `switchToNextProvider(): Promise<boolean>`: Switches to the next available provider in the priority list.

## ConnectionMonitor

The `ConnectionMonitor` is responsible for monitoring the connection quality and triggering failover when necessary.

### Methods

- `startMonitoring(provider: BaseProvider, callbacks: MonitoringCallbacks): void`: Starts monitoring the connection quality.
- `stopMonitoring(): void`: Stops monitoring the connection quality.
