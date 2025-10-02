import fs from 'fs';
import path from 'path';

const STATE_FILE = path.join(process.cwd(), '.auth-state.json');

interface AuthState {
  [requestId: string]: {
    timestamp: number;
    approved: boolean;
  };
}

function readState(): AuthState {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = fs.readFileSync(STATE_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading auth state:', error);
  }
  return {};
}

function writeState(state: AuthState): void {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (error) {
    console.error('Error writing auth state:', error);
  }
}

export function setConfirmationStatus(requestId: string, approved: boolean): void {
  const state = readState();
  state[requestId] = {
    timestamp: Date.now(),
    approved
  };
  writeState(state);
  console.log(`Confirmation set: ${requestId} - ${approved ? 'approved' : 'denied'}`);
}

export function getConfirmationStatus(requestId: string) {
  const state = readState();
  return state[requestId];
}

export function deleteConfirmationStatus(requestId: string): void {
  const state = readState();
  delete state[requestId];
  writeState(state);
}

export function isConfirmationExpired(timestamp: number): boolean {
  return Date.now() - timestamp > 5 * 60 * 1000; // 5 минут
}
