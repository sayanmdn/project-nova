import { Server } from 'http';
import { audioStore } from '../routes/audio';
import { transcriptionStore } from '../routes/transcription';
import { statusStore } from '../routes/status';

declare global {
  var testServer: Server;
}

// Set NODE_ENV to test for all tests
process.env.NODE_ENV = 'test';

beforeEach(() => {
  jest.clearAllMocks();
  // Clear all in-memory stores before each test
  audioStore.clear();
  transcriptionStore.clear();
  statusStore.clear();
});

afterEach(() => {
  if (global.testServer) {
    global.testServer.close();
  }
});