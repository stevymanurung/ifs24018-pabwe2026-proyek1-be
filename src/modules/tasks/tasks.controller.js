export const createTaskController = (service) => ({
  list: async (req, res) => res.json(await service.list(req.query.status, req.user.id)),
  create: async (req, res) => res.status(201).json(await service.create(req.body, req.user.id)),
  update: async (req, res) => res.json(await service.setDone(req.params.id, req.body.done, req.user.id)),
  remove: async (req, res) => {
    await service.remove(req.params.id, req.user.id);
    res.sendStatus(204);
  },
});
