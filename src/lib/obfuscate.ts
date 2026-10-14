export function splitEmail(email: string): { user: string; domain: string } {
  const atIndex = email.indexOf('@');
  if (atIndex < 1 || atIndex === email.length - 1) throw new Error(`splitEmail: not a valid email address: ${email}`);
  return { user: email.slice(0, atIndex), domain: email.slice(atIndex + 1) };
}

export function readableEmailFallback(email: string): string {
  const { user, domain } = splitEmail(email);
  return `${user} [at] ${domain.replace(/\./g, ' [dot] ')}`;
}
