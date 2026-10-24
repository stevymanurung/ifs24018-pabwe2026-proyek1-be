export const createDashboardController = (service) => ({
  get: async (req, res) => res.json(await service.build(req.query.now, req.user.id)),
});
