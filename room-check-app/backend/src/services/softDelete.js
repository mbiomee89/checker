// Soft-delete identifier mangling: frees a unique value (room number, email) for reuse
// by a new row without ever removing the deleted row itself. Always reversible since
// a plain space never occurs in a room number or a validated email address.
export function mangle(value, id) {
  return `${value} ${id}`;
}

export function unmangle(value) {
  return value.split(' ')[0];
}
