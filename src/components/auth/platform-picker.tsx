"use client";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PLATFORMS } from "@/config/auth";

/** PS5 / Xbox Series / Both as three tappable pills (short labels fit narrow cards), posted as `name`. */
export function PlatformPicker({
  name = "platform",
  value,
  onChange,
  idPrefix = "platform",
}: {
  name?: string;
  value: string;
  onChange: (value: string) => void;
  idPrefix?: string;
}) {
  return (
    <fieldset className="space-y-3">
      <legend id={`${idPrefix}-label`} className="text-sm font-medium">
        Platform <span className="font-normal text-muted-foreground">(optional)</span>
      </legend>
      <RadioGroup
        name={name}
        value={value}
        onValueChange={onChange}
        aria-labelledby={`${idPrefix}-label`}
        className="grid grid-cols-3 gap-2"
      >
        {PLATFORMS.map((option) => (
          <Label
            key={option.value}
            htmlFor={`${idPrefix}-${option.value}`}
            className="flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-input px-2 py-1.5 text-center text-xs leading-tight has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring has-[[data-state=checked]]:border-pink has-[[data-state=checked]]:bg-pink/12 has-[[data-state=checked]]:font-semibold sm:text-sm"
          >
            <RadioGroupItem id={`${idPrefix}-${option.value}`} value={option.value} className="sr-only" />
            {option.short}
          </Label>
        ))}
      </RadioGroup>
    </fieldset>
  );
}
