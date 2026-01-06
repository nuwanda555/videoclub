import { db } from './db';
import { supabase } from './supabase';

const TEST_CATEGORIES = [
    { nombre: 'Estrenos', precio_dia: 3.50, descripcion: 'Películas de reciente lanzamiento' },
    { nombre: 'Clásicos', precio_dia: 1.50, descripcion: 'Cine de culto y clásicos' },
    { nombre: 'Infantil', precio_dia: 2.00, descripcion: 'Películas para niños' },
    { nombre: 'General', precio_dia: 2.50, descripcion: 'Catálogo general' }
];

const TEST_GENRES = [
    { nombre: 'Acción' }, { nombre: 'Comedia' }, { nombre: 'Drama' },
    { nombre: 'Terror' }, { nombre: 'Ciencia Ficción' }
];

const TEST_MOVIES = [
    {
        titulo: 'Inception', titulo_original: 'Inception', director: 'Christopher Nolan', año: 2010, duracion: 148,
        sinopsis: 'Dom Cobb es un ladrón con una extraña habilidad para entrar a los sueños de la gente.',
        portada_url: 'https://picsum.photos/200/300?random=1'
    },
    {
        titulo: 'The Godfather', titulo_original: 'The Godfather', director: 'Francis Ford Coppola', año: 1972, duracion: 175,
        sinopsis: 'El patriarca de una organización criminal transfiere el control a su hijo.',
        portada_url: 'https://picsum.photos/200/300?random=2'
    }
];

const TEST_MEMBERS = [
    { numero_socio: 'S001', nombre: 'Juan', apellidos: 'Pérez García', dni: '12345678A', email: 'juan@example.com', telefono: '600123456', activo: true, fecha_alta: new Date().toISOString() },
    { numero_socio: 'S002', nombre: 'Maria', apellidos: 'Lopez', dni: '87654321B', email: 'maria@example.com', telefono: '600987654', activo: true, fecha_alta: new Date().toISOString() }
];

export async function seedTestData() {
    console.log('Iniciando carga de datos...');

    // 1. Categories
    const { data: cats } = await supabase.from('categories').select('id');
    if (cats?.length === 0) {
        await supabase.from('categories').insert(TEST_CATEGORIES);
    }

    // 2. Genres
    const { data: genres } = await supabase.from('genres').select('id');
    if (genres?.length === 0) {
        await supabase.from('genres').insert(TEST_GENRES);
    }

    // 3. Movies & Copies
    const { data: movies } = await supabase.from('movies').select('id');
    if (movies?.length === 0) {
        // Get actual category IDs
        const { data: freshCats } = await supabase.from('categories').select('*');
        const { data: freshGenres } = await supabase.from('genres').select('*');

        for (const mData of TEST_MOVIES) {
            const { data: newMovie } = await supabase.from('movies').insert({
                ...mData,
                categoria_id: freshCats?.[0]?.id
            }).select().single();

            if (newMovie) {
                // Add some copies
                await supabase.from('copies').insert([
                    { pelicula_id: newMovie.id, codigo_barras: `BC-${newMovie.id}-1`, formato: 'DVD', estado: 'disponible' },
                    { pelicula_id: newMovie.id, codigo_barras: `BC-${newMovie.id}-2`, formato: 'Blu-ray', estado: 'disponible' }
                ]);

                // Add genres
                if (freshGenres && freshGenres.length >= 2) {
                    await supabase.from('movie_genres').insert([
                        { movie_id: newMovie.id, genre_id: freshGenres[0].id },
                        { movie_id: newMovie.id, genre_id: freshGenres[1].id }
                    ]);
                }
            }
        }
    }

    // 4. Members
    const { data: members } = await supabase.from('members').select('id');
    if (members?.length === 0) {
        await supabase.from('members').insert(TEST_MEMBERS);
    }

    // 5. Profiles (Special Case)
    // Since we don't have Supabase Auth users, we create a mock profiles table if needed.
    // However, profiles table in schema references auth.users.
    // For the sake of the login demo working WITHOUT real Supabase Auth yet:
    // We'll create a dummy user entry if the user allows it or if we can handle the error.
    // BETTER: Update db.users.getByEmail to return mock if no profile found for demo purposes, 
    // OR update schema to allow non-auth users temporarily.

    // For now, let's just use the current login logic: "if (email === admin@videoclub.com)"
    // But wait, my db.ts uses supabase.from('profiles').
    // I will insert a mock profile with a static UUID if the DB allows it (unlikely due to FK).

    console.log('Carga finalizada.');
    return true;
}
