export const createSettingsController = (service) => ({
  get: async (req, res) => res.json(await service.get(req.user.id)),
  update: async (req, res) => res.json(await service.update(req.body, req.user.id)),
});
