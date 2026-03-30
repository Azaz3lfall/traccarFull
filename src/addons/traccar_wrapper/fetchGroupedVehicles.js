import axios from 'axios';
import pool from './db/index.js';

/**
 * Busca todos os devices do Traccar, filtra os com atributo PLACA,
 * enriquece com dados do Postgres (vehicles + clients) e retorna
 * veículos agrupados por placa (conforme BLUEPRINT §4).
 *
 * Env vars (fallback quando options não informa):
 
 *
 * @param {Object} [options]
 * @param {string} [options.baseURL] - URL base da API Traccar (default: process.env.TRACCAR_API_URL)
 * @param {Object} [options.auth] - { username, password } (default: TRACCAR_EMAIL, TRACCAR_PASSWORD)
 * @returns {Promise<Array<{ plate: string, client_name: string|null, make: string|null, model: string|null, devices: Object[] }>>}
 * @throws {Error} Em falha de rede ou resposta erro da API. Use try/catch no caller.
 */
export async function fetchGroupedVehicles(options = {}) {
  const baseURL = options.baseURL ?? process.env.TRACCAR_API_URL;
  const auth = options.auth ?? {
    username: process.env.TRACCAR_EMAIL,
    password: process.env.TRACCAR_PASSWORD,
  };

  if (!baseURL) {
    throw new Error('fetchGroupedVehicles: baseURL obrigatório (options.baseURL ou TRACCAR_API_URL)');
  }
  if (!auth?.username || !auth?.password) {
    throw new Error('fetchGroupedVehicles: auth obrigatório (options.auth ou TRACCAR_EMAIL/TRACCAR_PASSWORD)');
  }

  const { data } = await axios.get(`${baseURL}/api/devices`, {
    params: { all: true, excludeAttributes: false },
    auth: { username: auth.username, password: auth.password },
  });

  const raw = Array.isArray(data) ? data : [];
  const withPlaca = raw.filter((d) => {
    const placa = d?.attributes?.PLACA;
    return placa != null && String(placa).trim() !== '';
  });

  const byPlate = new Map();
  for (const d of withPlaca) {
    const plate = String(d.attributes.PLACA).trim();
    if (!byPlate.has(plate)) byPlate.set(plate, []);
    byPlate.get(plate).push(d);
  }

  /** Map: placa -> { client_name, make, model } (enriquecimento Postgres) */
  const dbByPlate = new Map();
  if (pool && process.env.DATABASE_URL) {
    try {
      const { rows } = await pool.query(
        `SELECT v.plate, v.make, v.model, v.color, c.name AS client_name
         FROM vehicles v
         LEFT JOIN clients c ON v.client_id = c.id`,
      );
      for (const r of rows) {
        const plate = r.plate != null ? String(r.plate).trim() : '';
        if (plate) {
          dbByPlate.set(plate, {
            client_name: r.client_name ?? null,
            make: r.make ?? null,
            model: r.model ?? null,
          });
        }
      }
    } catch (err) {
      console.error('[fetchGroupedVehicles] Erro ao buscar dados do Postgres:', err?.message);
    }
  } else {
    if (!process.env.DATABASE_URL) {
      console.warn('[fetchGroupedVehicles] DATABASE_URL não definida; retornando sem enriquecimento.');
    } else if (!pool) {
      console.warn('[fetchGroupedVehicles] Pool do PostgreSQL não disponível; retornando sem enriquecimento.');
    }
  }

  return Array.from(byPlate.entries()).map(([plate, devices]) => {
    const extra = dbByPlate.get(plate) ?? {};
    return {
      plate,
      client_name: extra.client_name ?? null,
      make: extra.make ?? null,
      model: extra.model ?? null,
      devices,
    };
  });
}
