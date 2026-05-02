// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // ──────────────────────────────────────────────
  // 1. USUARIO ADMIN
  // ──────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('Steven240', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@baussas.com' },
    update: {},
    create: {
      email: 'admin@baussas.com',
      password: passwordHash,
      name: 'Admin',
      role: 'ADMIN',
    },
  });

  console.log(`✅ Usuario admin creado: ${admin.email}`);

  // ──────────────────────────────────────────────
  // 2. CATEGORÍAS REALES DEL MENÚ
  // ──────────────────────────────────────────────
  const categoriasData = [
    { name: 'Mazorcas' },
    { name: 'Patacón' },
    { name: 'Desgranados' },
    { name: 'Palitos Chuzos' },
    { name: 'Adicionales' },
    { name: 'Bebidas' },
    { name: 'Perros' },
    { name: 'Perros Salvajes' },
    { name: 'Salchipapas' },
    { name: 'Hamburguesas' },
    { name: 'Asados' },
    { name: 'Picadas Salvajadas' },
  ];

  const categorias = {};
  for (const cat of categoriasData) {
    const created = await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
    categorias[cat.name] = created;
  }

  console.log(`✅ Categorías creadas: ${Object.keys(categorias).join(', ')}`);

  // ──────────────────────────────────────────────
  // 3. PRODUCTOS REALES DEL MENÚ
  // ──────────────────────────────────────────────
  const productosData = [
    // MAZORCAS
    { name: 'Mazorca Sencilla',        price: 13000, categoryId: categorias['Mazorcas'].id },
    { name: 'Mazorca Gratinada',       price: 15000, categoryId: categorias['Mazorcas'].id },
    { name: 'Mazorca Tocineta',        price: 15000, categoryId: categorias['Mazorcas'].id },
    { name: 'Mazorca Pollo',           price: 22000, categoryId: categorias['Mazorcas'].id },
    { name: 'Mazorca Mixta',           price: 25000, categoryId: categorias['Mazorcas'].id },
    { name: 'Mazorca Combinada',       price: 27000, categoryId: categorias['Mazorcas'].id },

    // PATACÓN
    { name: 'Patacón Pollo',           price: 17000, categoryId: categorias['Patacón'].id },
    { name: 'Patacón Mixto',           price: 20000, categoryId: categorias['Patacón'].id },
    { name: 'Patacón Carne',           price: 22000, categoryId: categorias['Patacón'].id },
    { name: 'Patacón Combinado',       price: 23000, categoryId: categorias['Patacón'].id },

    // DESGRANADOS
    { name: 'Desgranado Pollo',        price: 17000, categoryId: categorias['Desgranados'].id },
    { name: 'Desgranado Mixto',        price: 20000, categoryId: categorias['Desgranados'].id },
    { name: 'Desgranado Carne',        price: 21000, categoryId: categorias['Desgranados'].id },
    { name: 'Desgranado Combinado',    price: 24000, categoryId: categorias['Desgranados'].id },

    // PALITOS CHUZOS
    { name: 'Chuzo Pollo',             price: 16000, categoryId: categorias['Palitos Chuzos'].id },
    { name: 'Chuzo Carne',             price: 18000, categoryId: categorias['Palitos Chuzos'].id },
    { name: 'Chuzo Mixto',             price: 20000, categoryId: categorias['Palitos Chuzos'].id },
    { name: 'Chuzo Combinada',         price: 23000, categoryId: categorias['Palitos Chuzos'].id },

    // ADICIONALES
    { name: 'Adicional Papa',          price: 7000,  categoryId: categorias['Adicionales'].id },
    { name: 'Adicional Gratinada',     price: 4000,  categoryId: categorias['Adicionales'].id },
    { name: 'Adicional Maíz',          price: 4000,  categoryId: categorias['Adicionales'].id },

    // BEBIDAS
    { name: 'Cerezada',                price: 12000, categoryId: categorias['Bebidas'].id },
    { name: 'Limonada',                price: 12000, categoryId: categorias['Bebidas'].id },
    { name: 'Michelada',               price: 14000, categoryId: categorias['Bebidas'].id },
    { name: 'Gaseosa',                 price: 0,     categoryId: categorias['Bebidas'].id },
    { name: 'Jugo Natural',            price: 0,     categoryId: categorias['Bebidas'].id },
    { name: 'Tee',                     price: 0,     categoryId: categorias['Bebidas'].id },
    { name: 'Agua',                    price: 0,     categoryId: categorias['Bebidas'].id },

    // PERROS
    { name: 'Perro Sencillo',          price: 7000,  categoryId: categorias['Perros'].id },
    { name: 'Perro Plancha',           price: 8000,  categoryId: categorias['Perros'].id },
    { name: 'Perro Mexicano',          price: 8000,  categoryId: categorias['Perros'].id },
    { name: 'Perro Mozarella',         price: 11000, categoryId: categorias['Perros'].id },
    { name: 'Perro Italo Hawaiano',    price: 15000, categoryId: categorias['Perros'].id },
    { name: 'Perro Alemán',            price: 12000, categoryId: categorias['Perros'].id },
    { name: 'Perro Gemelo',            price: 12000, categoryId: categorias['Perros'].id },
    { name: 'Perro Suizo',             price: 17000, categoryId: categorias['Perros'].id },
    { name: 'Perro 1/2 Suizo',        price: 10000, categoryId: categorias['Perros'].id },
    { name: 'Perro Italo Suizo',       price: 20000, categoryId: categorias['Perros'].id },
    { name: 'Perro Ranchero',          price: 14000, categoryId: categorias['Perros'].id },
    { name: 'Buti Perro',              price: 15000, categoryId: categorias['Perros'].id },
    { name: 'Chori Perro',             price: 15000, categoryId: categorias['Perros'].id },
    { name: 'Perro Pollo',             price: 16000, categoryId: categorias['Perros'].id },
    { name: 'Perro 1/2 Salvaje',      price: 13000, categoryId: categorias['Perros'].id },

    // PERROS SALVAJES
    { name: 'Salvaje Sencillo',        price: 14000, categoryId: categorias['Perros Salvajes'].id },
    { name: 'Salvaje Suizo',           price: 20000, categoryId: categorias['Perros Salvajes'].id },
    { name: 'Salvaje Pollo',           price: 21000, categoryId: categorias['Perros Salvajes'].id },
    { name: 'Salvaje Mixto',           price: 23000, categoryId: categorias['Perros Salvajes'].id },
    { name: 'Salvaje Combinado',       price: 26000, categoryId: categorias['Perros Salvajes'].id },

    // SALCHIPAPAS
    { name: 'Salchipapa Sencilla',     price: 14000, categoryId: categorias['Salchipapas'].id },
    { name: 'Salchipapa Pollo',        price: 21000, categoryId: categorias['Salchipapas'].id },
    { name: 'Salchipapa Mixta',        price: 23000, categoryId: categorias['Salchipapas'].id },
    { name: 'Salchipapa Ranchera',     price: 18000, categoryId: categorias['Salchipapas'].id },
    { name: 'Salchipapa Suiza',        price: 20000, categoryId: categorias['Salchipapas'].id },
    { name: 'Salchipapa Combinada',    price: 25000, categoryId: categorias['Salchipapas'].id },

    // HAMBURGUESAS
    { name: 'Hamburguesa Carne',       price: 14000, categoryId: categorias['Hamburguesas'].id },
    { name: 'Hamburguesa Pollo',       price: 17000, categoryId: categorias['Hamburguesas'].id },
    { name: 'Hamburguesa Mixta',       price: 25000, categoryId: categorias['Hamburguesas'].id },

    // ASADOS
    { name: 'Asado Carne',             price: 24000, categoryId: categorias['Asados'].id },
    { name: 'Asado Pechuga',           price: 24000, categoryId: categorias['Asados'].id },
    { name: 'Asado Punta Gorda',       price: 27000, categoryId: categorias['Asados'].id },
    { name: 'Asado Churrasco',         price: 27000, categoryId: categorias['Asados'].id },
    { name: 'Asado Cerdo',             price: 25000, categoryId: categorias['Asados'].id },

    // PICADAS SALVAJADAS
    { name: 'Salvajada #1',            price: 35000, categoryId: categorias['Picadas Salvajadas'].id },
    { name: 'Salvajada #2',            price: 45000, categoryId: categorias['Picadas Salvajadas'].id },
    { name: 'Salvajada #3',            price: 55000, categoryId: categorias['Picadas Salvajadas'].id },
    { name: 'Salvajada #4',            price: 70000, categoryId: categorias['Picadas Salvajadas'].id },
  ];

  for (const prod of productosData) {
    const existing = await prisma.product.findFirst({ where: { name: prod.name } });
    if (!existing) {
      await prisma.product.create({ data: { ...prod, stock: 99, available: true } });
    }
  }

  console.log(`✅ Productos creados: ${productosData.length}`);

  // ──────────────────────────────────────────────
  // 4. MARCAS DE CERVEZA
  // ──────────────────────────────────────────────
  const marcasData = [
    { name: 'Águila' },
    { name: 'Poker' },
    { name: 'Club Colombia' },
    { name: 'Costeña' },
    { name: 'Heineken' },
  ];

  const marcas = {};
  for (const marca of marcasData) {
    const created = await prisma.beerBrand.upsert({
      where: { name: marca.name },
      update: {},
      create: { name: marca.name, active: true },
    });
    marcas[marca.name] = created;
  }

  console.log(`✅ Marcas de cerveza creadas: ${Object.keys(marcas).join(', ')}`);

  const cervezasData = [
    { brandId: marcas['Águila'].id,        presentation: 'Botella 330ml', unitPrice: 3500,  stock: 120, minStock: 24 },
    { brandId: marcas['Águila'].id,        presentation: 'Paca x30',      unitPrice: 90000, stock: 10,  minStock: 3  },
    { brandId: marcas['Poker'].id,         presentation: 'Botella 330ml', unitPrice: 3200,  stock: 96,  minStock: 24 },
    { brandId: marcas['Poker'].id,         presentation: 'Paca x30',      unitPrice: 85000, stock: 8,   minStock: 3  },
    { brandId: marcas['Club Colombia'].id, presentation: 'Botella 330ml', unitPrice: 4500,  stock: 72,  minStock: 12 },
    { brandId: marcas['Club Colombia'].id, presentation: 'Lata 269ml',    unitPrice: 4000,  stock: 48,  minStock: 12 },
    { brandId: marcas['Costeña'].id,       presentation: 'Botella 330ml', unitPrice: 3000,  stock: 100, minStock: 24 },
    { brandId: marcas['Heineken'].id,      presentation: 'Botella 330ml', unitPrice: 6000,  stock: 48,  minStock: 12 },
    { brandId: marcas['Heineken'].id,      presentation: 'Lata 269ml',    unitPrice: 5500,  stock: 36,  minStock: 12 },
  ];

  for (const cerveza of cervezasData) {
    const existing = await prisma.beer.findFirst({
      where: { brandId: cerveza.brandId, presentation: cerveza.presentation },
    });
    if (!existing) {
      await prisma.beer.create({ data: cerveza });
    }
  }

  console.log(`✅ Cervezas creadas: ${cervezasData.length} presentaciones`);

  console.log('\n🎉 Seed completado exitosamente!');
  console.log('─────────────────────────────────');
  console.log('📧 Email:     admin@baussas.com');
  console.log('🔑 Password:  Steven240');
  console.log('👤 Rol:       ADMIN');
  console.log('─────────────────────────────────');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });