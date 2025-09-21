import '@testing-library/jest-dom'

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Phone: () => 'Phone',
  PhoneOff: () => 'PhoneOff',
  Video: () => 'Video',
  VideoOff: () => 'VideoOff',
  User: () => 'User',
  Mic: () => 'Mic',
  MicOff: () => 'MicOff',
  Camera: () => 'Camera',
  CameraOff: () => 'CameraOff',
  Share: () => 'Share',
  Monitor: () => 'Monitor',
  Settings: () => 'Settings',
  LogOut: () => 'LogOut',
  X: () => 'X',
  Plus: () => 'Plus',
  Minus: () => 'Minus',
}))

// Mock Firebase
jest.mock('./src/lib/firebase', () => ({
  auth: {
    onAuthStateChanged: jest.fn(),
    currentUser: {
      uid: 'test-user-id',
      displayName: 'Test User',
      email: 'test@example.com',
      photoURL: 'https://example.com/avatar.jpg'
    }
  },
  db: {
    collection: jest.fn(),
    doc: jest.fn(),
    getDoc: jest.fn(),
    getDocs: jest.fn(),
    addDoc: jest.fn(),
    updateDoc: jest.fn(),
    deleteDoc: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    onSnapshot: jest.fn(),
    serverTimestamp: jest.fn(() => ({ toDate: () => new Date() })) // Modified: simpler mock for serverTimestamp
  }
}))

// Mock VideoSDK
jest.mock('@videosdk.live/react-sdk', () => ({
  MeetingProvider: ({ children }) => children,
  useMeeting: () => ({
    localMicOn: true,
    localWebcamOn: true,
    leave: jest.fn(),
    toggleMic: jest.fn(),
    toggleWebcam: jest.fn(),
    participants: new Map(),
  }),
  useParticipant: () => ({
    webcamStream: null,
    micStream: null,
    webcamOn: true,
    micOn: true,
    isLocal: false,
  }),
}))

// Mock WebRTC APIs
global.navigator.mediaDevices = {
  getUserMedia: jest.fn().mockImplementation((constraints) => {
    // Simulate permission behavior
    if (constraints.video && Math.random() < 0.1) {
      // Occasionally deny video permission to test fallback
      return Promise.reject(new Error('Permission denied'))
    }
    return Promise.resolve({
      getTracks: jest.fn().mockReturnValue([{
        stop: jest.fn(),
        enabled: true
      }]),
      getAudioTracks: jest.fn().mockReturnValue([{
        stop: jest.fn(),
        enabled: true
      }]),
      getVideoTracks: jest.fn().mockReturnValue(constraints.video ? [{
        stop: jest.fn(),
        enabled: true
      }] : []),
      addTrack: jest.fn(),
      removeTrack: jest.fn()
    })
  }),
  getDisplayMedia: jest.fn().mockResolvedValue({
    getTracks: jest.fn().mockReturnValue([{
      stop: jest.fn(),
      enabled: true,
      onended: null
    }]),
    getVideoTracks: jest.fn().mockReturnValue([{
      stop: jest.fn(),
      enabled: true,
      onended: null
    }])
  })
}

// Mock MediaStream
global.MediaStream = jest.fn().mockImplementation(() => ({
  getTracks: jest.fn().mockReturnValue([]),
  getAudioTracks: jest.fn().mockReturnValue([]),
  getVideoTracks: jest.fn().mockReturnValue([]),
  addTrack: jest.fn(),
  removeTrack: jest.fn(),
}));


// Mock RTCPeerConnection
global.RTCPeerConnection = jest.fn().mockImplementation(() => ({
  createOffer: jest.fn().mockResolvedValue({}),
  createAnswer: jest.fn().mockResolvedValue({}),
  setLocalDescription: jest.fn().mockResolvedValue(),
  setRemoteDescription: jest.fn().mockResolvedValue(),
  addIceCandidate: jest.fn().mockResolvedValue(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  close: jest.fn(),
  iceConnectionState: 'connected',
  connectionState: 'connected'
}))

// Mock permissions API
Object.defineProperty(navigator, 'permissions', {
  value: {
    query: jest.fn().mockResolvedValue({
      state: 'granted',
      onchange: null
    })
  },
  writable: true
})

// Mock audio context for audio notifications
global.AudioContext = jest.fn().mockImplementation(() => ({
  createOscillator: jest.fn().mockReturnValue({
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    frequency: { value: 440 }
  }),
  createGain: jest.fn().mockReturnValue({
    connect: jest.fn(),
    gain: { value: 0.1 }
  }),
  destination: {}
}))

// Mock Socket.IO
jest.mock('socket.io-client', () => {
  return {
    io: jest.fn(() => ({
      on: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
      connect: jest.fn(),
      connected: true
    }))
  }
})

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
    getAll: jest.fn(),
    has: jest.fn(),
  }),
  usePathname: () => '/test-path',
}))

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.sessionStorage = sessionStorageMock

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock HTMLCanvasElement.prototype.getContext
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  clearRect: jest.fn(),
  fillRect: jest.fn(),
  getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(100) })),
  putImageData: jest.fn(),
  createImageData: jest.fn(() => ({ data: new Uint8ClampedArray(100) })),
  setTransform: jest.fn(),
  drawImage: jest.fn(),
  stroke: jest.fn(),
  fill: jest.fn(),
  beginPath: jest.fn(),
  lineTo: jest.fn(),
  moveTo: jest.fn(),
  closePath: jest.fn(),
  arc: jest.fn(),
  bezierCurveTo: jest.fn(),
  quadraticCurveTo: jest.fn(),
  scale: jest.fn(),
  rotate: jest.fn(),
  translate: jest.fn(),
  save: jest.fn(),
  restore: jest.fn(),
  fillText: jest.fn(),
  measureText: jest.fn(() => ({ width: 10 })),
  strokeText: jest.fn(),
  createLinearGradient: jest.fn(),
  createRadialGradient: jest.fn(),
  createPattern: jest.fn(),
  setLineDash: jest.fn(),
  getLineDash: jest.fn(),
  lineCap: '',
  lineJoin: '',
  lineWidth: 0,
  miterLimit: 0,
  shadowBlur: 0,
  shadowColor: '',
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  globalAlpha: 1,
  globalCompositeOperation: '',
  font: '',
  textAlign: '',
  textBaseline: '',
  direction: '',
  imageSmoothingEnabled: true,
  imageSmoothingQuality: 'low',
  fillStyle: '',
  strokeStyle: '',
}));

// Mock @/contexts/auth-context


// Mock @/contexts/accessibility-context
jest.mock('@/contexts/accessibility-context', () => ({
  useAccessibility: () => ({
    highContrast: false, // Default value
    toggleHighContrast: jest.fn(),
  }),
  AccessibilityProvider: ({ children }) => children,
}));


// Console warnings that we want to suppress during tests
const originalConsoleError = console.error
console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning: ReactDOM.render is no longer supported') ||
     args[0].includes('Warning: An invalid form control') ||
     args[0].includes('act() is not supported'))
  ) {
    return
  }
  originalConsoleError.apply(console, args)
}