import { Router, type Request, type Response } from 'express';
import { serviceInfo } from '../info/requests';
import {
  getMessages,
  getMessageById,
  sendMessage,
  markMessageAsRead,
  deleteMessage,
} from '../services/message.service';

const router: Router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.status(200).json(serviceInfo);
});

router.get('/messages', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string | undefined;
    const otherUserId = req.query.otherUserId as string | undefined;
    const messages = await getMessages(userId, otherUserId);
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

router.get('/messages/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const message = await getMessageById(req.params.id);
    if (!message) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }
    res.status(200).json(message);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch message' });
  }
});

router.post('/messages', async (req: Request, res: Response) => {
  try {
    const { senderId, receiverId, content } = req.body;
    if (!senderId || !receiverId || !content) {
      res.status(400).json({ error: 'senderId, receiverId, and content are required' });
      return;
    }
    const message = await sendMessage({ senderId, receiverId, content });
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

router.patch('/messages/:id/read', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const message = await markMessageAsRead(req.params.id);
    res.status(200).json(message);
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
});

router.delete('/messages/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    await deleteMessage(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

export default router;
