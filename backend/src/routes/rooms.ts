import { randomUUID } from "node:crypto";
import { Room } from "@prisma/client";
import { Request, Response, Router } from "express";
import { asyncHandler } from "../middleware/async-handler";
import { requireOwner } from "../middleware/require-owner";
import { prisma } from "../prisma";
import { publicFile } from "../rooms/public-file";
import { publicRoom } from "../rooms/public-room";
import { StorageService } from "../storage/storage-service";

/** Maximum size, in bytes, of a single uploaded file (50 MB). */
const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Loads the room named in `:id` if the requester owns it. Sends a 404 and
 * returns null otherwise, so callers can write:
 *   const room = await findOwnedRoom(req, res);
 *   if (!room) return;
 */
async function findOwnedRoom(
  req: Request,
  res: Response,
): Promise<Room | null> {
  const room = await prisma.room.findFirst({
    where: { id: req.params.id, ownerId: req.ownerId },
  });
  if (!room) {
    res.status(404).json({ error: "Room not found." });
    return null;
  }
  return room;
}

export function roomsRouter(storage: StorageService): Router {
  const router = Router();

  router.post(
    "/rooms",
    asyncHandler(requireOwner),
    asyncHandler(async (req, res) => {
      const { name } = req.body ?? {};
      const room = await prisma.room.create({
        data: { name, ownerId: req.ownerId! },
      });
      res.status(201).json(publicRoom(room));
    }),
  );

  router.get(
    "/rooms",
    asyncHandler(requireOwner),
    asyncHandler(async (req, res) => {
      const rooms = await prisma.room.findMany({
        where: { ownerId: req.ownerId },
        orderBy: { createdAt: "desc" },
      });
      res.json(rooms.map(publicRoom));
    }),
  );

  router.get(
    "/rooms/:id",
    asyncHandler(requireOwner),
    asyncHandler(async (req, res) => {
      const room = await findOwnedRoom(req, res);
      if (!room) return;
      res.json(publicRoom(room));
    }),
  );

  router.patch(
    "/rooms/:id",
    asyncHandler(requireOwner),
    asyncHandler(async (req, res) => {
      const { name } = req.body ?? {};
      const { count } = await prisma.room.updateMany({
        where: { id: req.params.id, ownerId: req.ownerId },
        data: { name },
      });
      if (count === 0) {
        res.status(404).json({ error: "Room not found." });
        return;
      }
      const room = await prisma.room.findUniqueOrThrow({
        where: { id: req.params.id },
      });
      res.json(publicRoom(room));
    }),
  );

  router.post(
    "/rooms/:id/files/presign",
    asyncHandler(requireOwner),
    asyncHandler(async (req, res) => {
      const room = await findOwnedRoom(req, res);
      if (!room) return;

      const { contentType, size } = req.body ?? {};
      if (typeof size === "number" && size > MAX_FILE_SIZE) {
        res.status(413).json({ error: "File exceeds the 50 MB limit." });
        return;
      }

      const key = `rooms/${room.id}/${randomUUID()}`;
      const { url } = await storage.presignUpload(key, contentType);
      res.json({ url, key });
    }),
  );

  router.post(
    "/rooms/:id/files",
    asyncHandler(requireOwner),
    asyncHandler(async (req, res) => {
      const room = await findOwnedRoom(req, res);
      if (!room) return;

      const { name, contentType, size, key } = req.body ?? {};
      const file = await prisma.file.create({
        data: { roomId: room.id, name, contentType, size, storageKey: key },
      });
      res.status(201).json(publicFile(file));
    }),
  );

  router.get(
    "/rooms/:id/files",
    asyncHandler(requireOwner),
    asyncHandler(async (req, res) => {
      const room = await findOwnedRoom(req, res);
      if (!room) return;

      const files = await prisma.file.findMany({
        where: { roomId: room.id },
        orderBy: { createdAt: "desc" },
      });
      res.json(files.map(publicFile));
    }),
  );

  router.delete(
    "/rooms/:id/files/:fileId",
    asyncHandler(requireOwner),
    asyncHandler(async (req, res) => {
      const file = await prisma.file.findFirst({
        where: {
          id: req.params.fileId,
          room: { id: req.params.id, ownerId: req.ownerId },
        },
      });
      if (!file) {
        res.status(404).json({ error: "File not found." });
        return;
      }

      await storage.delete(file.storageKey);
      await prisma.file.delete({ where: { id: file.id } });
      res.status(204).end();
    }),
  );

  router.delete(
    "/rooms/:id",
    asyncHandler(requireOwner),
    asyncHandler(async (req, res) => {
      const room = await findOwnedRoom(req, res);
      if (!room) return;

      // Remove the storage objects first; the DB cascade clears the File rows
      // when the room row goes.
      const files = await prisma.file.findMany({ where: { roomId: room.id } });
      await Promise.all(files.map((file) => storage.delete(file.storageKey)));
      await prisma.room.delete({ where: { id: room.id } });
      res.status(204).end();
    }),
  );

  return router;
}
