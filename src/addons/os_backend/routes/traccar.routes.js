import { Router } from 'express';
import * as traccarController from '../controllers/traccar.controller.js';

const router = Router();

router.post('/login', traccarController.login);
router.get('/users', traccarController.listUsers);
router.post('/users', traccarController.createClient);
router.post('/toggle-technician', traccarController.toggleTechnicianStatus);
router.post('/link-device', traccarController.verifyAndLinkDevice);

export default router;
