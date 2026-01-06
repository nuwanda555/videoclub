import { supabase } from './supabase';

const TEST_CATEGORIES = [
    { nombre: 'Estrenos', precio_dia: 3.50, descripcion: 'Películas de reciente lanzamiento' },
    { nombre: 'Clásicos', precio_dia: 1.50, descripcion: 'Cine de culto y clásicos' },
    { nombre: 'Infantil', precio_dia: 2.00, descripcion: 'Películas para niños' },
    { nombre: 'General', precio_dia: 2.50, descripcion: 'Catálogo general' },
    { nombre: 'Documentales', precio_dia: 1.00, descripcion: 'Cultura y naturaleza' },
    { nombre: 'Series TV', precio_dia: 3.00, descripcion: 'Temporadas completas' }
];

const TEST_GENRES = [
    { nombre: 'Acción' }, { nombre: 'Comedia' }, { nombre: 'Drama' },
    { nombre: 'Terror' }, { nombre: 'Ciencia Ficción' }, { nombre: 'Aventura' },
    { nombre: 'Fantasía' }, { nombre: 'Romance' }, { nombre: 'Suspense' },
    { nombre: 'Animación' }
];

const TEST_MOVIES = [
    { titulo: 'Inception', titulo_original: 'Inception', director: 'Christopher Nolan', año: 2010, duracion: 148, sinopsis: 'Un ladrón que roba secretos a través de los sueños.', portada_url: 'https://picsum.photos/200/300?random=1' },
    { titulo: 'The Godfather', titulo_original: 'The Godfather', director: 'Francis Ford Coppola', año: 1972, duracion: 175, sinopsis: 'La historia de una familia mafiosa en Nueva York.', portada_url: 'https://picsum.photos/200/300?random=2' },
    { titulo: 'Interstellar', titulo_original: 'Interstellar', director: 'Christopher Nolan', año: 2014, duracion: 169, sinopsis: 'Un viaje a través de un agujero de gusano para salvar la humanidad.', portada_url: 'https://picsum.photos/200/300?random=3' },
    { titulo: 'Pulp Fiction', titulo_original: 'Pulp Fiction', director: 'Quentin Tarantino', año: 1994, duracion: 154, sinopsis: 'Historias entrelazadas de criminales en Los Ángeles.', portada_url: 'https://picsum.photos/200/300?random=4' },
    { titulo: 'Spirited Away', titulo_original: 'Sen to Chihiro no Kamikakushi', director: 'Hayao Miyazaki', año: 2001, duracion: 125, sinopsis: 'Una niña se pierde en un mundo mágico de dioses y espíritus.', portada_url: 'https://picsum.photos/200/300?random=5' },
    { titulo: 'The Dark Knight', titulo_original: 'The Dark Knight', director: 'Christopher Nolan', año: 2008, duracion: 152, sinopsis: 'Batman se enfrenta a su mayor desafío: el Joker.', portada_url: 'https://picsum.photos/200/300?random=6' },
    { titulo: 'Parasite', titulo_original: 'Gisaengchung', director: 'Bong Joon-ho', año: 2019, duracion: 132, sinopsis: 'Una familia pobre se infiltra en una casa rica.', portada_url: 'https://picsum.photos/200/300?random=7' },
    { titulo: 'Matrix', titulo_original: 'The Matrix', director: 'Lana & Lilly Wachowski', año: 1999, duracion: 136, sinopsis: 'Un hacker descubre que el mundo es una simulación.', portada_url: 'https://picsum.photos/200/300?random=8' },
    { titulo: 'Joker', titulo_original: 'Joker', director: 'Todd Phillips', año: 2019, duracion: 122, sinopsis: 'El origen del icónico villano de Batman.', portada_url: 'https://picsum.photos/200/300?random=9' },
    { titulo: 'Your Name', titulo_original: 'Kimi no Na wa', director: 'Makoto Shinkai', año: 2016, duracion: 106, sinopsis: 'Dos jóvenes intercambian cuerpos en sus sueños.', portada_url: 'https://picsum.photos/200/300?random=10' },
    { titulo: 'Gladiator', titulo_original: 'Gladiator', director: 'Ridley Scott', año: 2000, duracion: 155, sinopsis: 'Un general romano busca venganza como gladiador.', portada_url: 'https://picsum.photos/200/300?random=11' },
    { titulo: 'Toy Story', titulo_original: 'Toy Story', director: 'John Lasseter', año: 1995, duracion: 81, sinopsis: 'Los juguetes de Andy cobran vida.', portada_url: 'https://picsum.photos/200/300?random=12' },
    { titulo: 'Avatar', titulo_original: 'Avatar', director: 'James Cameron', año: 2009, duracion: 162, sinopsis: 'Un humano se une a los Na\'vi en Pandora.', portada_url: 'https://picsum.photos/200/300?random=13' },
    { titulo: 'The Lion King', titulo_original: 'The Lion King', director: 'Roger Allers', año: 1994, duracion: 88, sinopsis: 'Un cachorro de león debe recuperar su trono.', portada_url: 'https://picsum.photos/200/300?random=14' },
    { titulo: 'Mad Max: Fury Road', titulo_original: 'Mad Max: Fury Road', director: 'George Miller', año: 2015, duracion: 120, sinopsis: 'Carrera por la supervivencia en un mundo post-apocalíptico.', portada_url: 'https://picsum.photos/200/300?random=15' },
    { titulo: 'Alien', titulo_original: 'Alien', director: 'Ridley Scott', año: 1979, duracion: 117, sinopsis: 'Una criatura aterradora acecha a una nave espacial.', portada_url: 'https://picsum.photos/200/300?random=16' },
    { titulo: 'Jurassic Park', titulo_original: 'Jurassic Park', director: 'Steven Spielberg', año: 1993, duracion: 127, sinopsis: 'Dinosaurios vuelven a la vida en un parque temático.', portada_url: 'https://picsum.photos/200/300?random=17' },
    { titulo: 'Seven', titulo_original: 'Se7en', director: 'David Fincher', año: 1995, duracion: 127, sinopsis: 'Dos detectives persiguen a un asesino en serie.', portada_url: 'https://picsum.photos/200/300?random=18' },
    { titulo: 'The Shawshank Redemption', titulo_original: 'The Shawshank Redemption', director: 'Frank Darabont', año: 1994, duracion: 142, sinopsis: 'Amistad y esperanza en una prisión.', portada_url: 'https://picsum.photos/200/300?random=19' },
    { titulo: 'Blade Runner 2049', titulo_original: 'Blade Runner 2049', director: 'Denis Villeneuve', año: 2017, duracion: 164, sinopsis: 'Un nuevo blade runner descubre un secreto enterrado.', portada_url: 'https://picsum.photos/200/300?random=20' }
];

const TEST_MEMBERS = [
    { numero_socio: 'S001', nombre: 'Juan', apellidos: 'Pérez García', dni: '12345678A', email: 'juan@example.com', activo: true },
    { numero_socio: 'S002', nombre: 'Maria', apellidos: 'López', dni: '87654321B', email: 'maria@example.com', activo: true },
    { numero_socio: 'S003', nombre: 'Carlos', apellidos: 'Ruiz', dni: '11223344C', email: 'carlos@example.com', activo: true },
    { numero_socio: 'S004', nombre: 'Ana', apellidos: 'Sánchez', dni: '44332211D', email: 'ana@example.com', activo: true },
    { numero_socio: 'S005', nombre: 'Luis', apellidos: 'Martínez', dni: '55667788E', email: 'luis@example.com', activo: true },
    { numero_socio: 'S006', nombre: 'Elena', apellidos: 'Gómez', dni: '99887766F', email: 'elena@example.com', activo: true },
    { numero_socio: 'S007', nombre: 'Pedro', apellidos: 'Díaz', dni: '33445566G', email: 'pedro@example.com', activo: false },
    { numero_socio: 'S008', nombre: 'Lucía', apellidos: 'Vázquez', dni: '77889900H', email: 'lucia@example.com', activo: true },
    { numero_socio: 'S009', nombre: 'Jorge', apellidos: 'Castro', dni: '22334455I', email: 'jorge@example.com', activo: true },
    { numero_socio: 'S010', nombre: 'Sofía', apellidos: 'Blanco', dni: '66778899J', email: 'sofia@example.com', activo: true }
];

export async function seedTestData() {
    console.log('--- Iniciando Seed de Datos Masivos ---');

    // 1. Categorías
    const { data: categories } = await supabase.from('categories').upsert(TEST_CATEGORIES, { onConflict: 'nombre' }).select();

    // 2. Géneros
    const { data: genres } = await supabase.from('genres').upsert(TEST_GENRES, { onConflict: 'nombre' }).select();

    // 3. Películas
    for (let i = 0; i < TEST_MOVIES.length; i++) {
        const movie = TEST_MOVIES[i];
        const catId = categories?.[i % categories.length].id;

        const { data: insertedMovie } = await supabase.from('movies').upsert({
            ...movie,
            categoria_id: catId
        }, { onConflict: 'titulo' }).select().single();

        if (insertedMovie) {
            // Añadir copias (2-4 por película)
            const numCopies = Math.floor(Math.random() * 3) + 2;
            const copies = [];
            for (let j = 1; j <= numCopies; j++) {
                copies.push({
                    pelicula_id: insertedMovie.id,
                    codigo_barras: `BC-${insertedMovie.id.toString().padStart(3, '0')}-${j}`,
                    formato: j % 2 === 0 ? 'Blu-ray' : 'DVD',
                    estado: 'disponible'
                });
            }
            await supabase.from('copies').upsert(copies, { onConflict: 'codigo_barras' });

            // Añadir géneros (1-2 por película)
            const movieGenres = [];
            movieGenres.push({ movie_id: insertedMovie.id, genre_id: genres?.[i % genres.length].id });
            if (genres && genres.length > (i + 1) % genres.length) {
                movieGenres.push({ movie_id: insertedMovie.id, genre_id: genres?.[(i + 5) % genres.length].id });
            }
            await supabase.from('movie_genres').upsert(movieGenres);
        }
    }

    // 4. Socios
    await supabase.from('members').upsert(TEST_MEMBERS, { onConflict: 'dni' });

    console.log('--- Seed Finalizado con Éxito ---');
}
