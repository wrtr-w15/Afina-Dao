// Общее хранилище для подтверждений аутентификации
const confirmedRequests = new Map<string, {
  timestamp: number;
  approved: boolean;
}>();

export function setConfirmationStatus(requestId: string, approved: boolean) {
  confirmedRequests.set(requestId, {
    timestamp: Date.now(),
    approved
  });
  console.log(`Confirmation set: ${requestId} - ${approved ? 'approved' : 'denied'}`);
}

export function getConfirmationStatus(requestId: string) {
  return confirmedRequests.get(requestId);
}

export function deleteConfirmationStatus(requestId: string) {
  confirmedRequests.delete(requestId);
}

export function isConfirmationExpired(timestamp: number): boolean {
  return Date.now() - timestamp > 5 * 60 * 1000; // 5 минут
}