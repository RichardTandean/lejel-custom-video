import { z } from "zod";

export type ValidationT = (key: string) => string;

function getMessage(t: ValidationT, key: string, fallback: string) {
  try {
    return t(key) || fallback;
  } catch {
    return fallback;
  }
}

export function getLoginSchema(t: ValidationT) {
  return z.object({
    email: z
      .string()
      .min(1, getMessage(t, "emailRequired", "Email is required"))
      .email(getMessage(t, "emailInvalid", "Please enter a valid email address")),
    password: z
      .string()
      .min(1, getMessage(t, "passwordRequired", "Password is required")),
  });
}
