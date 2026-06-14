import { Prisma } from "@prisma/client";
import { Router } from "express";
import { asyncHandler } from "../middleware/async-handler";
import { requireOwner } from "../middleware/require-owner";
import { prisma } from "../prisma";
import { publicRoom } from "../rooms/public-room";
import { newShareToken } from "../rooms/share-token";

/**
 * Applies a partial update to a room the owner owns and returns it, or null when
 * no such room exists (unknown id, or owned by someone else). Scoping the write
 * by ownerId is what enforces the 404-not-403 boundary between owners.
 */
async function updateOwnedRoom(
  ownerId: string,
  id: string,
  data: Prisma.RoomUpdateManyMutationInput,
) {
  const { count } = await prisma.room.updateMany({ where: { id, ownerId }, data });
  if (count === 0) return null;
  return prisma.room.findUniqueOrThrow({ where: { id } });
}

export function roomsRouter(): Router {
  const router = Router();

  router.post(
    "/rooms",
    asyncHandler(requireOwner),
    asyncHandler(async (req, res) => {
      const { name } = req.body ?? {};
      const room = await prisma.room.create({
        data: { name, ownerId: req.ownerId!, shareToken: newShareToken() },
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
      const room = await prisma.room.findFirst({
        where: { id: req.params.id, ownerId: req.ownerId },
      });
      if (!room) {
        res.status(404).json({ error: "Room not found." });
        return;
      }
      res.json(publicRoom(room));
    }),
  );

  router.patch(
    "/rooms/:id",
    asyncHandler(requireOwner),
    asyncHandler(async (req, res) => {
      const { name, linkEnabled } = req.body ?? {};
      const data: Prisma.RoomUpdateManyMutationInput = {};
      if (name !== undefined) data.name = name;
      if (linkEnabled !== undefined) data.linkEnabled = linkEnabled;
      const room = await updateOwnedRoom(req.ownerId!, req.params.id, data);
      if (!room) {
        res.status(404).json({ error: "Room not found." });
        return;
      }
      res.json(publicRoom(room));
    }),
  );

  router.post(
    "/rooms/:id/share-token",
    asyncHandler(requireOwner),
    asyncHandler(async (req, res) => {
      const room = await updateOwnedRoom(req.ownerId!, req.params.id, {
        shareToken: newShareToken(),
      });
      if (!room) {
        res.status(404).json({ error: "Room not found." });
        return;
      }
      res.json(publicRoom(room));
    }),
  );

  router.delete(
    "/rooms/:id",
    asyncHandler(requireOwner),
    asyncHandler(async (req, res) => {
      const { count } = await prisma.room.deleteMany({
        where: { id: req.params.id, ownerId: req.ownerId },
      });
      if (count === 0) {
        res.status(404).json({ error: "Room not found." });
        return;
      }
      res.status(204).end();
    }),
  );

  return router;
}
