import { Router } from "express";
import { asyncHandler } from "../middleware/async-handler";
import { requireOwner } from "../middleware/require-owner";
import { prisma } from "../prisma";
import { publicRoom } from "../rooms/public-room";

export function roomsRouter(): Router {
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
