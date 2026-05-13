import { Router, type Request, type Response } from 'express';
import { serviceInfo } from '../info/requests';
import { registerUser, loginUser, getAllUsers, getUserById } from '../services/auth.service';

const router: Router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.status(200).json(serviceInfo);
});

router.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, password, role, firstName, lastName, specialization, licenseNumber, dob, gender, phone } = req.body;

    if (!email || !password || !role || !firstName || !lastName) {
      res.status(400).json({ error: 'Missing required fields: email, password, role, firstName, lastName' });
      return;
    }

    if (!['PATIENT', 'DOCTOR', 'ADMIN'].includes(role)) {
      res.status(400).json({ error: 'Invalid role. Must be PATIENT, DOCTOR, or ADMIN' });
      return;
    }

    const result = await registerUser({ email, password, role, firstName, lastName, specialization, licenseNumber, dob, gender, phone });
    res.status(201).json(result);
  } catch (error: any) {
    if (error.message === 'User with this email already exists') {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Missing required fields: email, password' });
      return;
    }

    const result = await loginUser({ email, password });
    res.status(200).json(result);
  } catch (error: any) {
    if (error.message === 'Invalid email or password') {
      res.status(401).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

router.get('/auth/users', async (_req: Request, res: Response) => {
  try {
    const users = await getAllUsers();
    res.status(200).json(users);
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/auth/users/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const user = await getUserById(req.params.id);
    res.status(200).json(user);
  } catch (error: any) {
    if (error.message === 'User not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

export default router;
