import { Router, type Request, type Response } from 'express';
import { serviceInfo } from '../info/requests';

const router: Router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.status(200).json(serviceInfo);
});

export default router;
