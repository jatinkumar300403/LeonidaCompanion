"use client";

import { startTransition, type FormEvent } from "react";

/**
 * Submits a form to a `useActionState` action without React 19's automatic form reset, which
 * would blank controlled inputs in the DOM after an error. Keep `action={formAction}` on the form
 * too: it is the fallback before hydration.
 */
export function submitWithoutReset(action: (formData: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const formData = new FormData(event.currentTarget, submitter);
    startTransition(() => action(formData));
  };
}
