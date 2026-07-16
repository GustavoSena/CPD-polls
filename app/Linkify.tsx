import { Fragment } from "react";

// Only http(s) links are turned into anchors — never javascript: and friends.
// The capture group makes String.split keep the URLs, at every odd index.
// The last character class keeps trailing punctuation ("… ver x.com/a.") out
// of the link itself.
const URL_PATTERN = /(https?:\/\/[^\s<]*[^\s<.,;:!?)\]}'"])/g;

// Renders free text written by residents, with any links made clickable.
export function Linkify({ text }: { text: string }) {
  return (
    <>
      {text.split(URL_PATTERN).map((part, i) =>
        i % 2 === 1 ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer">
            {part}
          </a>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </>
  );
}
