const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Cargando datos de El Nuevo Baratón...");

  // ─── Categorías ───────────────────────────────────────────────────────────
  const categorias = await prisma.category.createMany({
    data: [
      { name: "Perros" },
      { name: "Perros Salvajes" },
      { name: "Salchipapas" },
      { name: "Hamburguesas" },
      { name: "Asados" },
      { name: "Picadas Salvajadas" },
      { name: "Mazorcas" },
      { name: "Patacón" },
      { name: "Desgranados" },
      { name: "Palitos Chuzos" },
      { name: "Adicionales" },
      { name: "Bebidas" },
    ],
    skipDuplicates: true,
  });
  console.log(`✅ ${categorias.count} categorías creadas`);

   const cats = await prisma.category.findMany();
  const id = (name) => cats.find((c) => c.name === name).id;

  // ─── Productos ────────────────────────────────────────────────────────────
  const productos = await prisma.product.createMany({
    data: [
      // PERROS
      { name: "Perro Sencillo",        price: 7000,  stock: 100, categoryId: id("Perros") },
      { name: "Perro Plancha",         price: 8000,  stock: 100, categoryId: id("Perros") },
      { name: "Perro Mexicano",        price: 8000,  stock: 100, categoryId: id("Perros") },
      { name: "Perro Mozarella",       price: 11000, stock: 100, categoryId: id("Perros") },
      { name: "Perro Italo Hawaiano",  price: 15000, stock: 100, categoryId: id("Perros") },
      { name: "Perro Alemán",          price: 12000, stock: 100, categoryId: id("Perros") },
      { name: "Perro Gemelo",          price: 12000, stock: 100, categoryId: id("Perros") },
      { name: "Perro Suizo",           price: 17000, stock: 100, categoryId: id("Perros") },
      { name: "1/2 Suizo",             price: 10000, stock: 100, categoryId: id("Perros") },
      { name: "Perro Italo Suizo",     price: 20000, stock: 100, categoryId: id("Perros") },
      { name: "Perro Ranchero",        price: 14000, stock: 100, categoryId: id("Perros") },
      { name: "Buti Perro",            price: 15000, stock: 100, categoryId: id("Perros") },
      { name: "Chori Perro",           price: 15000, stock: 100, categoryId: id("Perros") },
      { name: "Perro Pollo",           price: 16000, stock: 100, categoryId: id("Perros") },
      { name: "1/2 Salvaje",           price: 13000, stock: 100, categoryId: id("Perros") },

      // PERROS SALVAJES
      { name: "Salvaje Sencillo",      price: 14000, stock: 100, categoryId: id("Perros Salvajes") },
      { name: "Salvaje Suizo",         price: 20000, stock: 100, categoryId: id("Perros Salvajes") },
      { name: "Salvaje Pollo",         price: 21000, stock: 100, categoryId: id("Perros Salvajes") },
      { name: "Salvaje Mixto",         price: 23000, stock: 100, categoryId: id("Perros Salvajes") },
      { name: "Salvaje Combinado",     price: 26000, stock: 100, categoryId: id("Perros Salvajes") },

      // SALCHIPAPAS
      { name: "Salchipapa Sencilla",   price: 14000, stock: 100, categoryId: id("Salchipapas") },
      { name: "Salchipapa Pollo",      price: 21000, stock: 100, categoryId: id("Salchipapas") },
      { name: "Salchipapa Mixta",      price: 23000, stock: 100, categoryId: id("Salchipapas") },
      { name: "Salchipapa Ranchera",   price: 18000, stock: 100, categoryId: id("Salchipapas") },
      { name: "Salchipapa Suiza",      price: 20000, stock: 100, categoryId: id("Salchipapas") },
      { name: "Salchipapa Combinada",  price: 25000, stock: 100, categoryId: id("Salchipapas") },

      // HAMBURGUESAS
      { name: "Hamburguesa Carne",     price: 14000, stock: 100, categoryId: id("Hamburguesas") },
      { name: "Hamburguesa Pollo",     price: 17000, stock: 100, categoryId: id("Hamburguesas") },
      { name: "Hamburguesa Mixta",     price: 25000, stock: 100, categoryId: id("Hamburguesas") },

      // ASADOS
      { name: "Asado Carne",           price: 24000, stock: 50,  categoryId: id("Asados") },
      { name: "Asado Pechuga",         price: 24000, stock: 50,  categoryId: id("Asados") },
      { name: "Asado Punta Gorda",     price: 27000, stock: 50,  categoryId: id("Asados") },
      { name: "Churrascos",            price: 27000, stock: 50,  categoryId: id("Asados") },
      { name: "Asado Cerdo",           price: 25000, stock: 50,  categoryId: id("Asados") },

      // PICADAS SALVAJADAS
      { name: "Salvajada Pequeña",     price: 35000, stock: 50,  categoryId: id("Picadas Salvajadas") },
      { name: "Salvajada Mediana",     price: 45000, stock: 50,  categoryId: id("Picadas Salvajadas") },
      { name: "Salvajada Grande",      price: 55000, stock: 50,  categoryId: id("Picadas Salvajadas") },
      { name: "Salvajada Familiar",    price: 70000, stock: 50,  categoryId: id("Picadas Salvajadas") },

      // MAZORCAS
      { name: "Mazorca Sencilla",      price: 13000, stock: 80,  categoryId: id("Mazorcas") },
      { name: "Mazorca Gratinada",     price: 15000, stock: 80,  categoryId: id("Mazorcas") },
      { name: "Mazorca Tocineta",      price: 15000, stock: 80,  categoryId: id("Mazorcas") },
      { name: "Mazorca Pollo",         price: 22000, stock: 80,  categoryId: id("Mazorcas") },
      { name: "Mazorca Mixta",         price: 25000, stock: 80,  categoryId: id("Mazorcas") },
      { name: "Mazorca Combinada",     price: 27000, stock: 80,  categoryId: id("Mazorcas") },

      // PATACÓN
      { name: "Patacón Pollo",         price: 17000, stock: 80,  categoryId: id("Patacón") },
      { name: "Patacón Mixto",         price: 20000, stock: 80,  categoryId: id("Patacón") },
      { name: "Patacón Carne",         price: 22000, stock: 80,  categoryId: id("Patacón") },
      { name: "Patacón Combinado",     price: 23000, stock: 80,  categoryId: id("Patacón") },

      // DESGRANADOS
      { name: "Desgranado Pollo",      price: 17000, stock: 80,  categoryId: id("Desgranados") },
      { name: "Desgranado Mixto",      price: 20000, stock: 80,  categoryId: id("Desgranados") },
      { name: "Desgranado Carne",      price: 21000, stock: 80,  categoryId: id("Desgranados") },
      { name: "Desgranado Combinado",  price: 24000, stock: 80,  categoryId: id("Desgranados") },

      // PALITOS CHUZOS
      { name: "Chuzo Pollo",           price: 16000, stock: 80,  categoryId: id("Palitos Chuzos") },
      { name: "Chuzo Carne",           price: 18000, stock: 80,  categoryId: id("Palitos Chuzos") },
      { name: "Chuzo Mixto",           price: 20000, stock: 80,  categoryId: id("Palitos Chuzos") },
      { name: "Chuzo Combinado",       price: 23000, stock: 80,  categoryId: id("Palitos Chuzos") },

      // ADICIONALES
      { name: "Papa",                  price: 7000,  stock: 200, categoryId: id("Adicionales") },
      { name: "Gratinada",             price: 4000,  stock: 200, categoryId: id("Adicionales") },
      { name: "Maíz",                  price: 4000,  stock: 200, categoryId: id("Adicionales") },

      // BEBIDAS
      { name: "Cerezada",              price: 12000, stock: 100, categoryId: id("Bebidas") },
      { name: "Limonada",              price: 12000, stock: 100, categoryId: id("Bebidas") },
      { name: "Michelada",             price: 14000, stock: 100, categoryId: id("Bebidas") },
      { name: "Gaseosa",               price: 4000,  stock: 100, categoryId: id("Bebidas") },
      { name: "Jugo",                  price: 5000,  stock: 100, categoryId: id("Bebidas") },
      { name: "Tee",                   price: 4000,  stock: 100, categoryId: id("Bebidas") },
      { name: "Agua",                  price: 2000,  stock: 100, categoryId: id("Bebidas") },
    ],
    skipDuplicates: true,
  });
  console.log(`✅ ${productos.count} productos creados`);

  // ─── Usuario Admin ────────────────────────────────────────────────────────
  const hash = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { email: "admin@baraton.com" },
    update: {},
    create: { name: "Administrador", email: "admin@baraton.com", password: hash, role: "ADMIN" },
  });

  const hashCaj = await bcrypt.hash("caja123", 10);
  await prisma.user.upsert({
    where: { email: "caja@baraton.com" },
    update: {},
    create: { name: "Cajero", email: "caja@baraton.com", password: hashCaj, role: "CASHIER" },
  });

  console.log("✅ Usuarios creados");
  console.log("\n🎉 Base de datos lista!\n");
  console.log("👤 Admin   → admin@baraton.com  / admin123");
  console.log("👤 Cajero  → caja@baraton.com   / caja123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());