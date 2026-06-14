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

  return router;
}
