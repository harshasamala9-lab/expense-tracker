import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';

export function createAuthController(
  authService,
  googleAuthService = null,
  supabaseAuthService = null,
) {
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

    googleLogin: asyncHandler(async (req, res) => {
      if (!googleAuthService) {
        throw new AppError(503, 'Google sign-in is not configured.');
      }

      const session = await googleAuthService.exchange({
        code: req.body?.code,
        redirectUri: req.body?.redirectUri,
      });
      res.status(200).json(session);
    }),

    supabaseLogin: asyncHandler(async (req, res) => {
      if (!supabaseAuthService) {
        throw new AppError(503, 'Supabase sign-in is not configured.');
      }

      const accessToken =
        typeof req.body?.access_token === 'string'
          ? req.body.access_token.trim()
          : '';

      if (!accessToken || accessToken.length > 8192) {
        throw new AppError(400, 'A Google access token is required.');
      }

      const session = await supabaseAuthService.loginWithToken(accessToken);
      res.status(200).json(session);
    }),

    me: asyncHandler(async (req, res) => {
      const user = await authService.getCurrentUser(req.user.id);
      res.status(200).json({ user });
    }),
  };
}
