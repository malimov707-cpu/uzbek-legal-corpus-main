const redactions = [
  /(?<!\d)(?:\d[ -]?){13}\d(?!\d)/g,
  /(?<!\d)(?:\d[ -]?){15}\d(?!\d)/g,
  /(?<![A-Z0-9])[A-Z]{2}\s?\d{7}(?!\d)/gi,
  /(?<!\d)(?:\+?998[ -]?)?(?:\d[ -]?){8}\d(?!\d)/g,
];

export function redactSensitiveText(value: string): string {
  return redactions.reduce(
    (text, pattern) => text.replace(pattern, "[maxfiy maʼlumot olib tashlandi]"),
    value,
  );
}
