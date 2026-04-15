const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function cleanDuplicates() {
  console.log("🧹 Limpiando duplicados de cervezas...\n");

  const beers = await prisma.beer.findMany({
    include: { brand: true },
    orderBy: { id: "asc" }, // conservar el de menor ID (el primero creado)
  });

  // Agrupar por brandId + presentation
  const seen = new Map();
  const toDelete = [];

  for (const beer of beers) {
    const key = `${beer.brandId}-${beer.presentation}`;
    if (seen.has(key)) {
      toDelete.push(beer.id);
      console.log(`  🗑️  Duplicado: ${beer.brand.name} — ${beer.presentation} (ID ${beer.id})`);
    } else {
      seen.set(key, beer.id);
    }
  }

  if (toDelete.length === 0) {
    console.log("  ✅ No hay duplicados, la base de datos está limpia.");
    return;
  }

  // Primero borrar los BeerSaleItems que referencian estas cervezas duplicadas
  const deletedItems = await prisma.beerSaleItem.deleteMany({
    where: { beerId: { in: toDelete } },
  });

  // Borrar movimientos de stock de duplicados
  await prisma.beerStockMovement.deleteMany({
    where: { beerId: { in: toDelete } },
  });

  // Ahora borrar las cervezas duplicadas
  const deleted = await prisma.beer.deleteMany({
    where: { id: { in: toDelete } },
  });

  console.log(`\n✅ ${deleted.count} cervezas duplicadas eliminadas.`);
  if (deletedItems.count > 0) {
    console.log(`⚠️  También se eliminaron ${deletedItems.count} items de venta asociados.`);
  }
}

async function main() {
  await cleanDuplicates();

  console.log("\n📊 Estado actual de la base de datos:");
  const brands = await prisma.beerBrand.findMany({
    include: { beers: true },
    orderBy: { name: "asc" },
  });

  for (const brand of brands) {
    console.log(`  🍺 ${brand.name} — ${brand.beers.length} presentaciones`);
    for (const beer of brand.beers) {
      console.log(`      • ${beer.presentation} | $${beer.unitPrice.toLocaleString()} | stock: ${beer.stock}`);
    }
  }

  console.log("\n🎉 Listo!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());