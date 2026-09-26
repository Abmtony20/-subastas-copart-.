import { Router } from 'express';
import { pool } from './db.js';

export const CATALOGOS = {
  tipos: ['Automóvil', 'SUV', 'Pickup', 'Van', 'Camión', 'Motocicleta', 'Coupé', 'Hatchback'],
  transmisiones: ['Automática', 'Manual', 'CVT'],
  combustibles: ['Gasolina', 'Diésel', 'Híbrido', 'Eléctrico', 'Gas LP'],
  tracciones: ['AWD', 'FWD', 'RWD', '4WD'],
  danios: [
    { id: 'verde', nombre: 'Verde', desc: 'Daño menor / Limpio' },
    { id: 'amarillo', nombre: 'Amarillo', desc: 'Daño medio / Reparable' },
    { id: 'rojo', nombre: 'Rojo', desc: 'Daño severo / Salvamento' },
  ],
};

export const router = Router();

router.get('/', async (_req, res) => {
  const r = await pool.request().query('SELECT DISTINCT Marca FROM Vehiculos ORDER BY Marca');
  res.json({ ...CATALOGOS, marcas: r.recordset.map((x) => x.Marca) });
});
