import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import { serviceInfo } from '../info/requests';
import { uploadFile, uploadMultipleFiles, deleteFile } from '../services/cloudinary.service';

const router: Router = Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.get('/', (_req: Request, res: Response) => {
  res.status(200).json(serviceInfo);
});

router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file provided. Use field name "file"' });
      return;
    }

    const folder = (req.body.folder as string) || 'hms';
    const result = await uploadFile(req.file.buffer, req.file.originalname, folder);

    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to upload file', details: error.message });
  }
});

router.post('/upload/multiple', upload.array('files', 5), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No files provided. Use field name "files"' });
      return;
    }

    const folder = (req.body.folder as string) || 'hms';
    const results = await uploadMultipleFiles(
      files.map((f) => ({ buffer: f.buffer, originalName: f.originalname })),
      folder
    );

    res.status(201).json(results);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to upload files', details: error.message });
  }
});

router.delete('/upload/:publicId', async (req: Request<{ publicId: string }>, res: Response) => {
  try {
    const resourceType = (req.query.resourceType as 'image' | 'video' | 'raw') || 'image';
    const result = await deleteFile(req.params.publicId, resourceType);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete file', details: error.message });
  }
});

export default router;
