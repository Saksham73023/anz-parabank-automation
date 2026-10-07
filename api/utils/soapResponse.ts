/**
 * Extracts SOAP record elements and the requested fields from each record.
 * Throws an explicit error if the document contains a SOAP fault.
 * @param xml SOAP response body.
 * @param recordName Repeating record element to extract.
 * @param fields Child element names to include in each record.
 * @returns Normalized records containing the requested string fields.
 */
export function soapRecords(
  xml: string,
  recordName: string,
  fields: string[]
): Record<string, string>[] {
  if (/<(?:[\w.-]+:)?Fault(?:\s|>)/i.test(xml)) {
    throw new Error(`SOAP returned a fault: ${soapText(xml, 'faultstring') || 'unknown fault'}`);
  }

  const records: Record<string, string>[] = [];
  for (const block of soapElements(xml, recordName)) {
    const record: Record<string, string> = {};
    for (const field of fields) {
      const value = soapText(block, field);
      if (value !== undefined) record[field] = value;
    }
    records.push(record);
  }
  return records;
}

/** Extracts and XML-decodes the text of the first matching SOAP element. */
export function soapText(xml: string, elementName: string): string | undefined {
  const escapedName = elementName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const element = new RegExp(
    `<(?:[\\w.-]+:)?${escapedName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[\\w.-]+:)?${escapedName}\\s*>`,
    'i'
  ).exec(xml)?.[1];
  if (element === undefined) return undefined;
  return decodeXml(element.replace(/<\!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim());
}

/** Returns the inner XML for each matching, optionally namespace-prefixed element. */
export function soapElements(xml: string, elementName: string): string[] {
  const escapedName = elementName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const expression = new RegExp(
    `<((?:[\\w.-]+:)?${escapedName})(?:\\s[^>]*)?>([\\s\\S]*?)<\\/\\1\\s*>`,
    'gi'
  );
  return [...xml.matchAll(expression)].map((match) => match[2]);
}

/** Decodes the five predefined XML entities used in SOAP text values. */
function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}
