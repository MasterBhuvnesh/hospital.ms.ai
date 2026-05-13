import { Router, type Request, type Response } from 'express';

const router: Router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', service: 'medical-records-service' });
});

export default router;
