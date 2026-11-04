import { z } from "zod";

export const LoginResponseSchema = z.object({
  token: z.string().min(1),
});

export const DeviceStatusSchema = z.object({
  level_percent: z.number().min(0).max(100),
  pump_state: z.enum(["on", "off"]),
  last_seen: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), "last_seen must be a valid timestamp"),
});

export type DeviceStatus = z.infer<typeof DeviceStatusSchema>;