export const createAlarmController = (service) => ({
  list: async (req, res) => res.json(await service.list(req.user.id)),
  create: async (req, res) => res.status(201).json(await service.create(req.body, req.user.id)),
  update: async (req, res) => res.json(await service.setEnabled(req.params.id, req.body.enabled, req.user.id)),
  remove: async (req, res) => {
    await service.remove(req.params.id, req.user.id);
    res.sendStatus(204);
  },
});
