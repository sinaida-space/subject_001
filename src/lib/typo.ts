/**
 * Orphan control for running copy: binds any standalone 1-3 letter word to
 * the word that follows it with a non-breaking space, so it can never be
 * stranded alone at the end of a line. Runs repeatedly until the string
 * stops changing so runs of consecutive short words ("as of the year") end
 * up fully bound together.
 */
export function nbsp(text: string): string {
  let result = text;
  let previous: string;

  do {
    previous = result;
    result = result.replace(/(^|\s)(\S{1,3}) /g, '$1$2 ');
  } while (result !== previous);

  return result;
}
