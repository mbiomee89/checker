import crypto from 'node:crypto';

const WORDS = ['Camp', 'Gulf', 'Room', 'Check', 'Blue', 'Palm', 'Coast', 'Field'];
const SYMBOLS = ['!', '#', '$', '%'];

export function generateTempPassword() {
  const word = WORDS[crypto.randomInt(WORDS.length)];
  const digits = crypto.randomInt(1000, 10000);
  const symbol = SYMBOLS[crypto.randomInt(SYMBOLS.length)];
  return `${word}${digits}${symbol}`;
}

export function serializeAdminUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    roles: user.roleAssignments.map((r) => r.role),
    campId: user.campId,
    active: user.isActive,
    hasCredentials: user.hasCredentials,
  };
}
