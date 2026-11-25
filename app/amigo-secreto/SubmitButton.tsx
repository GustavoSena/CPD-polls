"use client";

import { useFormStatus } from "react-dom";

// Fetching a link preview can take a few seconds — show that it's working.
export function SubmitButton({
  idle,
  pending,
}: {
  idle: string;
  pending: string;
}) {
  const status = useFormStatus();
  return (
    <button className="button" type="submit" disabled={status.pending}>
      {status.pending ? pending : idle}
    </button>
  );
}
