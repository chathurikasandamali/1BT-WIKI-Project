import { createAuthClient } from '@neondatabase/auth/next';
const c = createAuthClient();
console.log('Keys:', Object.keys(c));
let proto = Object.getPrototypeOf(c);
const methods = new Set();
while (proto && proto !== Object.prototype) {
  Object.getOwnPropertyNames(proto).forEach((m) => methods.add(m));
  proto = Object.getPrototypeOf(proto);
}
console.log('Methods:', Array.from(methods));
