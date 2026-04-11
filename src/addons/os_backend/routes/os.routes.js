import { Router } from 'express';
import * as osController from '../controllers/os.controller.js';
import upload from '../config/multer.js';

const router = Router();

router.post('/work-orders', osController.createWorkOrder);
router.get('/work-orders', osController.getWorkOrders);
router.get('/work-orders/by-plate/:plate', osController.getWorkOrdersByPlate);
router.get('/work-orders/:id', osController.getWorkOrderDetails);
router.patch('/work-orders/:id', osController.updateWorkOrder);
router.patch('/work-orders/:id/status', osController.updateStatus);
router.delete('/work-orders/:id', osController.deleteWorkOrder);
router.post('/checklist', osController.saveChecklist);

// Upload de fotos com tratamento de erro do multer
router.post('/work-orders/:id/photos', (req, res, next) => {
  upload.array('photos', 10)(req, res, (err) => {
    if (err) {
      console.error('Multer upload error:', err);
      return res.status(500).json({ error: 'Erro ao processar upload', details: err.message });
    }
    next();
  });
}, osController.uploadPhotos);
router.post('/work-orders/:id/signature', upload.single('signature'), osController.saveSignature);

export default router;
