import { asyncHandler } from '../utils/asyncHandler.js';

export function createAuthController(authService) {
  return {
    login: asyncHandler(async (req, res) => {
      const { email, password } = req.validatedLogin;
      const session = await authService.login(email, password);
      res.status(200).json(session);
    }),

    signup: asyncHandler(async (req, res) => {
      const { email, password } = req.validatedSignup;
      const session = await authService.createAdmin({ email, password });
      res.status(201).json(session);
    }),

    me: asyncHandler(async (req, res) => {
      const user = await authService.getCurrentUser(req.user.id);
      res.status(200).json({ user });
    }),
  };
}
