import { Category, Config, Copy, Fine, Genre, Member, Movie, Rental, RentalStatus, User } from '../types';
import { supabase } from './supabase';

// DB Service Object - Migrated to Supabase (Async)
export const db = {
  config: {
    get: async () => {
      const { data, error } = await supabase.from('config').select('*').eq('id', 1).single();
      if (error) throw error;
      return data as Config;
    },
    update: async (cfg: Config) => {
      const { error } = await supabase.from('config').update(cfg).eq('id', 1);
      if (error) throw error;
    }
  },
  users: {
    getAll: async () => {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw error;
      return data as User[];
    },
    getByEmail: async (email: string) => {
      const { data, error } = await supabase.from('profiles').select('*').eq('email', email).single();
      if (error) return null;
      return data as User;
    },
  },
  categories: {
    getAll: async () => {
      const { data, error } = await supabase.from('categories').select('*').order('nombre');
      if (error) throw error;
      return data as Category[];
    },
    update: async (cats: Category[]) => {
      // Supabase handle individual updates better, but for compatibility with existing bulk save:
      const { error } = await supabase.from('categories').upsert(cats);
      if (error) throw error;
    }
  },
  genres: {
    getAll: async () => {
      const { data, error } = await supabase.from('genres').select('*').order('nombre');
      if (error) throw error;
      return data as Genre[];
    },
  },
  movies: {
    getAll: async () => {
      const { data, error } = await supabase.from('movies').select('*, movie_genres(genre_id)').order('titulo');
      if (error) throw error;
      return data.map(m => ({
        ...m,
        generos_ids: m.movie_genres.map((mg: any) => mg.genre_id)
      })) as Movie[];
    },
    save: async (movies: Movie[]) => {
      const { error } = await supabase.from('movies').upsert(movies);
      if (error) throw error;
    },
    add: async (movie: Omit<Movie, 'id'>) => {
      const { generos_ids, ...movieData } = movie;
      const { data, error } = await supabase.from('movies').insert(movieData).select().single();
      if (error) throw error;

      if (generos_ids && generos_ids.length > 0) {
        const relations = generos_ids.map(gid => ({ movie_id: data.id, genre_id: gid }));
        await supabase.from('movie_genres').insert(relations);
      }
      return data as Movie;
    },
    update: async (movie: Movie) => {
      const { generos_ids, ...movieData } = movie;
      const { error } = await supabase.from('movies').update(movieData).eq('id', movie.id);
      if (error) throw error;

      // Update genres (delete and re-insert for simplicity in this migration)
      await supabase.from('movie_genres').delete().eq('movie_id', movie.id);
      if (generos_ids && generos_ids.length > 0) {
        const relations = generos_ids.map(gid => ({ movie_id: movie.id, genre_id: gid }));
        await supabase.from('movie_genres').insert(relations);
      }
    }
  },
  copies: {
    getAll: async () => {
      const { data, error } = await supabase.from('copies').select('*');
      if (error) throw error;
      return data as Copy[];
    },
    getByMovieId: async (movieId: number) => {
      const { data, error } = await supabase.from('copies').select('*').eq('pelicula_id', movieId);
      if (error) throw error;
      return data as Copy[];
    },
    getByBarcode: async (barcode: string) => {
      const { data, error } = await supabase.from('copies').select('*').eq('codigo_barras', barcode).single();
      if (error) return null;
      return data as Copy;
    },
    updateStatus: async (id: number, status: Copy['estado']) => {
      const { error } = await supabase.from('copies').update({ estado: status }).eq('id', id);
      if (error) throw error;
    },
    add: async (copy: Omit<Copy, 'id'>) => {
      const { error } = await supabase.from('copies').insert(copy);
      if (error) throw error;
    }
  },
  members: {
    getAll: async () => {
      const { data, error } = await supabase.from('members').select('*').order('apellidos');
      if (error) throw error;
      return data as Member[];
    },
    save: async (members: Member[]) => {
      const { error } = await supabase.from('members').upsert(members);
      if (error) throw error;
    },
    add: async (member: Omit<Member, 'id'>) => {
      const { data, error } = await supabase.from('members').insert(member).select().single();
      if (error) throw error;
      return data as Member;
    },
    update: async (member: Member) => {
      const { error } = await supabase.from('members').update(member).eq('id', member.id);
      if (error) throw error;
    }
  },
  rentals: {
    getAll: async () => {
      const { data, error } = await supabase.from('rentals').select('*').order('fecha_alquiler', { ascending: false });
      if (error) throw error;
      return data as Rental[];
    },
    getActiveByMember: async (memberId: number) => {
      const { data, error } = await supabase.from('rentals').select('*').eq('socio_id', memberId).eq('estado', 'activo');
      if (error) throw error;
      return data as Rental[];
    },
    getActiveByCopy: async (copyId: number) => {
      const { data, error } = await supabase.from('rentals').select('*').eq('copia_id', copyId).eq('estado', 'activo').single();
      if (error) return null;
      return data as Rental;
    },
    create: async (rental: Omit<Rental, 'id' | 'estado'>) => {
      const { data, error } = await supabase.from('rentals').insert({ ...rental, estado: 'activo' }).select().single();
      if (error) throw error;

      // Update copy status
      await db.copies.updateStatus(rental.copia_id, 'alquilada');
      return data as Rental;
    },
    return: async (id: number, returnDate: string, employeeId: number) => {
      const { data: rental, error: fetchError } = await supabase.from('rentals').select('*').eq('id', id).single();
      if (fetchError || !rental) return null;

      const { data, error } = await supabase.from('rentals')
        .update({ fecha_devolucion_real: returnDate, empleado_devolucion_id: employeeId, estado: 'devuelto' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await db.copies.updateStatus(rental.copia_id, 'disponible');
      return data as Rental;
    }
  },
  fines: {
    getAll: async () => {
      const { data, error } = await supabase.from('fines').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as Fine[];
    },
    getPendingByMember: async (memberId: number) => {
      const { data, error } = await supabase.from('fines').select('*').eq('socio_id', memberId).eq('pagada', false);
      if (error) throw error;
      return data as Fine[];
    },
    create: async (fine: Omit<Fine, 'id'>) => {
      const { data, error } = await supabase.from('fines').insert(fine).select().single();
      if (error) throw error;
      return data as Fine;
    },
    pay: async (id: number) => {
      const { error } = await supabase.from('fines').update({ pagada: true, fecha_pago: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    }
  }
};