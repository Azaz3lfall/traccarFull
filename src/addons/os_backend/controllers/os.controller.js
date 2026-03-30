import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../db/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsOsBase = path.resolve(__dirname, '../../../../uploads/os');

function toOsUploadUrl(filePath) {
  if (!filePath) return null;
  if (filePath.includes('/var/www/os_system/uploads/')) {
    return filePath.replace('/var/www/os_system/uploads/', '/os-uploads/');
  }
  try {
    const relative = path.relative(uploadsOsBase, filePath);
    if (relative.startsWith('..')) return filePath;
    return '/os-uploads/' + relative.replace(/\\/g, '/');
  } catch {
    return filePath;
  }
}

export const createWorkOrder = async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Módulo OS não configurado. Verifique DATABASE_OS_URL.' });
  }
  const { customer_id, technician_id, device_id, type, description, vehicle_plate, vehicle_model, scheduled_at } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO os_module.work_orders 
      (customer_id, technician_id, device_id, type, description, vehicle_plate, vehicle_model, scheduled_at) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [customer_id, technician_id, device_id, type, description, vehicle_plate, vehicle_model, scheduled_at]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar ordem de serviço' });
  }
};

export const getWorkOrders = async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Módulo OS não configurado. Verifique DATABASE_OS_URL.' });
  }
  const { technician_id } = req.query;
  try {
    let query = 'SELECT * FROM os_module.work_orders';
    let params = [];

    if (technician_id) {
      query += ' WHERE technician_id = $1';
      params.push(technician_id);
    }

    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar ordens de serviço' });
  }
};

export const getWorkOrderDetails = async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Módulo OS não configurado. Verifique DATABASE_OS_URL.' });
  }
  const { id } = req.params;
  try {
    const os = await pool.query('SELECT * FROM os_module.work_orders WHERE id = $1', [id]);
    if (os.rows.length === 0) {
      return res.status(404).json({ error: 'Ordem de serviço não encontrada' });
    }

    const checklist = await pool.query('SELECT * FROM os_module.checklists WHERE work_order_id = $1', [id]);
    const attachments = await pool.query('SELECT * FROM os_module.attachments WHERE work_order_id = $1', [id]);

    const checklistRow = checklist.rows[0] || null;
    const attachmentsWithUrl = attachments.rows.map(a => {
      const url = toOsUploadUrl(a.file_path) || a.file_path.replace(/^.*[/\\]uploads[/\\]os[/\\]/, '/os-uploads/');
      return { ...a, file_path: url };
    });

    const signatureUrl = checklistRow?.client_signature_path
      ? (toOsUploadUrl(checklistRow.client_signature_path) || checklistRow.client_signature_path)
      : null;

    res.json({
      ...os.rows[0],
      checklist: checklistRow ? { ...checklistRow, client_signature_path: signatureUrl } : null,
      attachments: attachmentsWithUrl
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar detalhes da OS' });
  }
};

export const updateWorkOrder = async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Módulo OS não configurado. Verifique DATABASE_OS_URL.' });
  }
  const { id } = req.params;
  const { customer_id, technician_id, device_id, type, description, vehicle_plate, vehicle_model, scheduled_at } = req.body;
  try {
    const result = await pool.query(
      `UPDATE os_module.work_orders SET
        customer_id = COALESCE($1, customer_id),
        technician_id = COALESCE($2, technician_id),
        device_id = COALESCE($3, device_id),
        type = COALESCE($4, type),
        description = COALESCE($5, description),
        vehicle_plate = COALESCE($6, vehicle_plate),
        vehicle_model = COALESCE($7, vehicle_model),
        scheduled_at = COALESCE($8, scheduled_at)
      WHERE id = $9 RETURNING *`,
      [customer_id, technician_id, device_id, type, description, vehicle_plate, vehicle_model, scheduled_at, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ordem de serviço não encontrada' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar ordem de serviço' });
  }
};

export const updateStatus = async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Módulo OS não configurado. Verifique DATABASE_OS_URL.' });
  }
  const { id } = req.params;
  const { status } = req.body;
  const fleetPool = req.fleetPool;
  try {
    if (status === 'COMPLETED') {
      const checklist = await pool.query(
        'SELECT id FROM os_module.checklists WHERE work_order_id = $1',
        [id]
      );

      if (checklist.rows.length === 0) {
        return res.status(400).json({
          error: 'Não é possível finalizar a OS sem preencher o checklist.'
        });
      }
    }

    const completed_at = status === 'COMPLETED' ? new Date() : null;
    const result = await pool.query(
      `UPDATE os_module.work_orders 
       SET status = $1, completed_at = COALESCE($2, completed_at) 
       WHERE id = $3 RETURNING *`,
      [status, completed_at, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ordem de serviço não encontrada' });
    }

    const workOrder = result.rows[0];

    if (status === 'COMPLETED' && fleetPool && workOrder.vehicle_plate) {
      const plate = String(workOrder.vehicle_plate || '').trim();
      const customerId = workOrder.customer_id || null;
      const osType = (workOrder.type || 'INSTALACAO').toUpperCase();
      let vehicleQuery = 'SELECT id FROM vehicles WHERE LOWER(TRIM(plate)) = LOWER($1)';
      const vehicleParams = [plate];
      if (customerId) {
        vehicleQuery += ' AND client_id = $2';
        vehicleParams.push(customerId);
      }
      vehicleQuery += ' LIMIT 1';
      const vehicleRes = await fleetPool.query(vehicleQuery, vehicleParams);
      if (vehicleRes.rows.length > 0) {
        const vehicleId = vehicleRes.rows[0].id;

        let devicesToRemove = workOrder.devices_to_remove;
        if (!Array.isArray(devicesToRemove)) {
          devicesToRemove = [];
        }
        devicesToRemove = devicesToRemove.filter((d) => d != null && Number.isInteger(Number(d))).map((d) => parseInt(d, 10));

        const deleteVehicleIfEmpty = Boolean(workOrder.delete_vehicle_if_empty);

        if (osType === 'REMOCAO') {
          let idsToRemove = devicesToRemove;
          if (idsToRemove.length === 0) {
            const vdRes = await fleetPool.query(
              'SELECT device_id FROM vehicle_devices WHERE vehicle_id = $1::uuid',
              [vehicleId]
            );
            idsToRemove = vdRes.rows.map((r) => r.device_id).filter((id) => id != null);
          }
          if (idsToRemove.length > 0) {
            try {
              await fleetPool.query(
                'DELETE FROM vehicle_devices WHERE vehicle_id = $1::uuid AND device_id = ANY($2::int[])',
                [vehicleId, idsToRemove]
              );
            } catch (err) {
              console.error('Erro ao remover devices do veículo:', err?.message || err);
            }
          }
          if (deleteVehicleIfEmpty) {
            const remainRes = await fleetPool.query(
              'SELECT 1 FROM vehicle_devices WHERE vehicle_id = $1::uuid LIMIT 1',
              [vehicleId]
            );
            if (remainRes.rows.length === 0) {
              try {
                await fleetPool.query('DELETE FROM vehicles WHERE id = $1::uuid', [vehicleId]);
              } catch (err) {
                console.error('Erro ao excluir veículo:', err?.message || err);
              }
            }
          }
        } else if (osType === 'MANUTENCAO') {
          if (devicesToRemove.length > 0) {
            try {
              await fleetPool.query(
                'DELETE FROM vehicle_devices WHERE vehicle_id = $1::uuid AND device_id = ANY($2::int[])',
                [vehicleId, devicesToRemove]
              );
            } catch (err) {
              console.error('Erro ao remover devices do veículo (manutenção):', err?.message || err);
            }
          }
          let equipmentItems = workOrder.equipment_items;
          if (!Array.isArray(equipmentItems)) {
            try {
              equipmentItems = typeof equipmentItems === 'string' ? JSON.parse(equipmentItems) : [];
            } catch {
              equipmentItems = [];
            }
          }
          const deviceIds = equipmentItems
            .map((it) => it?.device_id)
            .filter((d) => d != null && Number.isInteger(Number(d)));
          for (let i = 0; i < deviceIds.length; i++) {
            const deviceId = parseInt(deviceIds[i], 10);
            if (!Number.isNaN(deviceId)) {
              try {
                await fleetPool.query(
                  `INSERT INTO vehicle_devices (vehicle_id, device_id, is_primary)
                   VALUES ($1::uuid, $2, $3)
                   ON CONFLICT (vehicle_id, device_id) DO NOTHING`,
                  [vehicleId, deviceId, i === 0]
                );
              } catch (err) {
                console.error('Erro ao vincular device ao veículo:', err?.message || err);
              }
            }
          }
        } else {
          let equipmentItems = workOrder.equipment_items;
          if (!Array.isArray(equipmentItems)) {
            try {
              equipmentItems = typeof equipmentItems === 'string' ? JSON.parse(equipmentItems) : [];
            } catch {
              equipmentItems = [];
            }
          }
          const deviceIds = equipmentItems
            .map((it) => it?.device_id)
            .filter((d) => d != null && Number.isInteger(Number(d)));
          for (let i = 0; i < deviceIds.length; i++) {
            const deviceId = parseInt(deviceIds[i], 10);
            if (!Number.isNaN(deviceId)) {
              try {
                await fleetPool.query(
                  `INSERT INTO vehicle_devices (vehicle_id, device_id, is_primary)
                   VALUES ($1::uuid, $2, $3)
                   ON CONFLICT (vehicle_id, device_id) DO NOTHING`,
                  [vehicleId, deviceId, i === 0]
                );
              } catch (err) {
                console.error('Erro ao vincular device ao veículo:', err?.message || err);
              }
            }
          }
        }

        let installationNotes = (workOrder.installation_details || '').trim();
        if (!installationNotes) {
          const checklistRes = await pool.query(
            'SELECT technician_notes FROM os_module.checklists WHERE work_order_id = $1',
            [id]
          );
          installationNotes = (checklistRes.rows[0]?.technician_notes || '').trim();
        }
        if (installationNotes) {
          try {
            await fleetPool.query(
              'UPDATE vehicles SET installation_details = $1 WHERE id = $2::uuid',
              [installationNotes, vehicleId]
            );
          } catch (err) {
            console.error('Erro ao atualizar detalhes da instalação do veículo:', err?.message || err);
          }
        }

        const vehiclePhotoPath = (workOrder.vehicle_photo_path || '').trim();
        if (vehiclePhotoPath) {
          try {
            await fleetPool.query(
              'UPDATE vehicles SET foto_veiculo = $1 WHERE id = $2::uuid',
              [vehiclePhotoPath, vehicleId]
            );
          } catch (err) {
            console.error('Erro ao atualizar foto do veículo:', err?.message || err);
          }
        }
      }
    }

    res.json(workOrder);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar status' });
  }
};

export const deleteWorkOrder = async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Módulo OS não configurado. Verifique DATABASE_OS_URL.' });
  }
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM os_module.work_orders WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ordem de serviço não encontrada' });
    }

    res.json({ message: 'Ordem de serviço excluída com sucesso' });
  } catch (error) {
    console.error('❌ Erro ao excluir OS:', error);
    res.status(500).json({ error: 'Erro ao excluir ordem de serviço' });
  }
};

export const saveChecklist = async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Módulo OS não configurado. Verifique DATABASE_OS_URL.' });
  }
  const {
    work_order_id,
    items,
    technician_notes,
    installation_details,
    installationDetails,
    osDetails,
    equipment_items: equipmentItems,
    vehicle_photo_path: vehiclePhotoPath,
    devices_to_remove: devicesToRemove,
    delete_vehicle_if_empty: deleteVehicleIfEmpty
  } = req.body;

  try {
    const notes = technician_notes ||
      installation_details ||
      installationDetails ||
      (osDetails && (osDetails.installationDetails || osDetails.installation_details)) ||
      '';

    const eqType = req.body.equipment_type !== undefined ? req.body.equipment_type : (osDetails && (osDetails.equipmentType || osDetails.equipment_type));
    const eqModel = req.body.equipment_model !== undefined ? req.body.equipment_model : (req.body.equipmentModel || (osDetails && (osDetails.equipmentModel || osDetails.equipment_model)));
    const eqSerial = req.body.equipment_serial !== undefined ? req.body.equipment_serial : (req.body.equipmentSerial || (osDetails && (osDetails.equipmentSerial || osDetails.equipment_serial)));
    const chipNum = req.body.chip_number !== undefined ? req.body.chip_number : (req.body.chipNumber || (osDetails && (osDetails.chipNumber || osDetails.chip_number)));
    const lkType = req.body.lock_type !== undefined ? req.body.lock_type : (req.body.lockType || (osDetails && (osDetails.lockType || osDetails.lock_type)));
    const devImei = req.body.device_imei !== undefined ? req.body.device_imei : (req.body.deviceImei || (osDetails && (osDetails.deviceImei || osDetails.device_imei)));

    const woId = parseInt(work_order_id, 10);
    if (isNaN(woId)) {
      return res.status(400).json({ error: 'work_order_id inválido' });
    }

    await pool.query(
      `INSERT INTO os_module.checklists (work_order_id, items, technician_notes) 
       VALUES ($1, $2, $3)
       ON CONFLICT (work_order_id) 
       DO UPDATE SET items = $2, technician_notes = $3`,
      [woId, JSON.stringify(items || []), notes]
    );

    const hasEquipmentItems = Array.isArray(equipmentItems);
    const hasEquipmentInfo = [eqType, eqModel, eqSerial, chipNum, lkType, devImei, notes].some(v => v !== undefined);
    const hasVehiclePhoto = vehiclePhotoPath !== undefined;
    const hasDevicesToRemove = devicesToRemove !== undefined;
    const hasDeleteVehicleFlag = deleteVehicleIfEmpty !== undefined;

    if (hasEquipmentItems || hasEquipmentInfo || hasVehiclePhoto || hasDevicesToRemove || hasDeleteVehicleFlag) {
      const updates = [];
      const params = [];
      let paramIdx = 1;

      if (hasEquipmentItems) {
        updates.push(`equipment_items = $${paramIdx}`);
        params.push(JSON.stringify(equipmentItems));
        paramIdx++;
      }

      if (hasEquipmentInfo) {
        let formattedEqType = null;
        if (eqType !== undefined) {
          formattedEqType = Array.isArray(eqType) ? eqType : (eqType ? String(eqType).split(',').map(s => s.trim()) : []);
        }
        let formattedLkType = null;
        if (lkType !== undefined) {
          formattedLkType = Array.isArray(lkType) ? lkType : (lkType ? String(lkType).split(',').map(s => s.trim()) : []);
        }
        updates.push(`equipment_type = COALESCE($${paramIdx}, equipment_type)`);
        params.push(formattedEqType);
        paramIdx++;
        updates.push(`equipment_model = COALESCE($${paramIdx}, equipment_model)`);
        params.push(eqModel !== undefined ? eqModel : null);
        paramIdx++;
        updates.push(`equipment_serial = COALESCE($${paramIdx}, equipment_serial)`);
        params.push(eqSerial !== undefined ? eqSerial : null);
        paramIdx++;
        updates.push(`chip_number = COALESCE($${paramIdx}, chip_number)`);
        params.push(chipNum !== undefined ? chipNum : null);
        paramIdx++;
        updates.push(`lock_type = COALESCE($${paramIdx}, lock_type)`);
        params.push(formattedLkType);
        paramIdx++;
        updates.push(`device_imei = COALESCE($${paramIdx}, device_imei)`);
        params.push(devImei !== undefined ? devImei : null);
        paramIdx++;
      }

      if (hasVehiclePhoto) {
        updates.push(`vehicle_photo_path = COALESCE($${paramIdx}, vehicle_photo_path)`);
        params.push(vehiclePhotoPath ? String(vehiclePhotoPath).trim().slice(0, 512) : null);
        paramIdx++;
      }

      if (hasDevicesToRemove) {
        const arr = Array.isArray(devicesToRemove)
          ? devicesToRemove.filter((d) => d != null && Number.isInteger(Number(d))).map((d) => parseInt(d, 10))
          : [];
        updates.push(`devices_to_remove = $${paramIdx}`);
        params.push(arr);
        paramIdx++;
      }

      if (hasDeleteVehicleFlag) {
        updates.push(`delete_vehicle_if_empty = $${paramIdx}`);
        params.push(Boolean(deleteVehicleIfEmpty));
        paramIdx++;
      }

      updates.push(`installation_details = COALESCE($${paramIdx}, installation_details)`);
      params.push(notes !== undefined ? notes : null);
      paramIdx++;
      params.push(woId);

      try {
        await pool.query(
          `UPDATE os_module.work_orders SET ${updates.join(', ')} WHERE id = $${paramIdx}`,
          params
        );
      } catch (updateErr) {
        const colNotFound = updateErr?.code === '42703' || /column "equipment_items" does not exist/i.test(updateErr?.message || '');
        if (colNotFound && hasEquipmentItems) {
          const eqIdx = updates.findIndex(u => u.startsWith('equipment_items'));
          if (eqIdx >= 0) {
            const updatesNoEq = updates.filter((_, i) => i !== eqIdx);
            const paramsNoEq = params.filter((_, i) => i !== eqIdx);
            const renumbered = updatesNoEq.map((u, i) => u.replace(/\$\d+/, `$${i + 1}`));
            await pool.query(
              `UPDATE os_module.work_orders SET ${renumbered.join(', ')} WHERE id = $${paramsNoEq.length}`,
              paramsNoEq
            );
          }
          console.warn('equipment_items column not found - run: psql -d gestao_os -f scripts/migrations/add_equipment_items.sql');
        } else {
          throw updateErr;
        }
      }
    }

    res.status(201).json({ message: 'Checklist e detalhes salvos com sucesso' });
  } catch (error) {
    console.error('❌ Erro ao salvar checklist:', error?.message || error);
    console.error('Stack:', error?.stack);
    res.status(500).json({
      error: 'Erro ao salvar checklist e detalhes',
      details: process.env.NODE_ENV !== 'production' ? (error?.message || String(error)) : undefined
    });
  }
};

export const saveSignature = async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Módulo OS não configurado. Verifique DATABASE_OS_URL.' });
  }
  const { id } = req.params;
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: 'Nenhum arquivo de assinatura enviado' });
  }

  try {
    const filePath = file.path;
    await pool.query(
      `INSERT INTO os_module.checklists (work_order_id, items, client_signature_path) 
       VALUES ($1, $2, $3)
       ON CONFLICT (work_order_id) 
       DO UPDATE SET client_signature_path = $3`,
      [id, '[]', filePath]
    );
    res.status(200).json({ message: 'Assinatura salva com sucesso', path: filePath });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao salvar assinatura' });
  }
};

export const uploadPhotos = async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Módulo OS não configurado. Verifique DATABASE_OS_URL.' });
  }
  const { id } = req.params;
  const files = req.files;
  const { type } = req.body;

  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'Nenhuma foto enviada' });
  }

  try {
    const insertPromises = files.map(file => {
      const filePath = file.path || file.filename;
      if (!filePath) {
        throw new Error(`Arquivo sem path: ${file.originalname}`);
      }
      return pool.query(
        'INSERT INTO os_module.attachments (work_order_id, file_path, file_type) VALUES ($1, $2, $3)',
        [parseInt(id, 10), filePath, type || 'PHOTO']
      );
    });

    await Promise.all(insertPromises);
    res.status(201).json({ message: `${files.length} fotos enviadas com sucesso` });
  } catch (error) {
    console.error('uploadPhotos error:', error?.message || error);
    console.error('Stack:', error?.stack);
    res.status(500).json({
      error: 'Erro ao salvar fotos',
      details: process.env.NODE_ENV !== 'production' ? error?.message : undefined
    });
  }
};
