import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  creator: text("creator").notNull(),
  room: text("room").notNull(),
  start_time: timestamp("start_time", { mode: "string" }).notNull(),
  end_time: timestamp("end_time", { mode: "string" }).notNull(),
});

export const insertBookingSchema = createInsertSchema(bookings).pick({
  name: true,
  creator: true,
  room: true,
  start_time: true,
  end_time: true,
});

export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;
