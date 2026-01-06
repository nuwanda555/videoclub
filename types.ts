export type Role = 'administrador' | 'empleado';

export interface User {
  id: string | number;
  nombre: string;
  email: string;
  rol: Role;
}

export interface Category {
  id: number;
  nombre: string;
  precio_dia: number;
  descripcion: string;
}

export interface Genre {
  id: number;
  nombre: string;
}

export interface Movie {
  id: number;
  titulo: string;
  titulo_original?: string;
  director?: string;
  año?: number;
  duracion?: number; // minutos
  sinopsis?: string;
  portada_url?: string;
  categoria_id: number;
  generos_ids: number[];
}

export type CopyFormat = 'DVD' | 'Blu-ray' | '4K';
export type CopyStatus = 'disponible' | 'alquilada' | 'dañada' | 'perdida';

export interface Copy {
  id: number;
  pelicula_id: number;
  codigo_barras: string;
  formato: CopyFormat;
  estado: CopyStatus;
  notas?: string;
}

export interface Member {
  id: number;
  numero_socio: string;
  nombre: string;
  apellidos: string;
  dni: string;
  email?: string;
  telefono?: string;
  activo: boolean;
  fecha_alta: string;
  notas?: string;
}

export type RentalStatus = 'activo' | 'devuelto' | 'vencido';

export interface Rental {
  id: number;
  socio_id: number;
  copia_id: number;
  fecha_alquiler: string; // ISO String
  fecha_devolucion_prevista: string; // ISO String
  fecha_devolucion_real?: string; // ISO String
  precio_dia: number;
  empleado_alquiler_id: string | number;
  empleado_devolucion_id?: string | number;
  estado: RentalStatus;
}

export interface Fine {
  id: number;
  alquiler_id: number;
  socio_id: number;
  dias_retraso: number;
  importe: number;
  pagada: boolean;
  fecha_pago?: string; // ISO String
}

export interface Config {
  dias_alquiler_defecto: number;
  multa_por_dia: number;
  max_alquileres_socio: number;
}
