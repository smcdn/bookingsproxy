import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const roomsPath = path.resolve(__dirname, "../data/rooms.json");
const roomsData = JSON.parse(fs.readFileSync(roomsPath, "utf-8")).rooms;
export const rooms = roomsData;
export const validRoomNames = Object.keys(roomsData);
