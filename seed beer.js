const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("🍺 Cargando marcas y cervezas...");

  const marcas = [
    {
      name: "Águila",
      beers: [
        { presentation: "Botella 330ml",  unitPrice: 3500,  stock: 120 },
        { presentation: "Botella 750ml",  unitPrice: 6000,  stock: 60  },
        { presentation: "Lata 330ml",     unitPrice: 4000,  stock: 60  },
        { presentation: "Paca x30",       unitPrice: 95000, stock: 10  },
      ],
    },
    {
      name: "Águila Light",
      beers: [
        { presentation: "Botella 330ml",  unitPrice: 3500,  stock: 80  },
        { presentation: "Lata 330ml",     unitPrice: 4000,  stock: 40  },
        { presentation: "Paca x30",       unitPrice: 95000, stock: 5   },
      ],
    },
    {
      name: "Poker",
      beers: [
        { presentation: "Botella 330ml",  unitPrice: 3200,  stock: 100 },
        { presentation: "Botella 750ml",  unitPrice: 5500,  stock: 50  },
        { presentation: "Paca x30",       unitPrice: 88000, stock: 8   },
      ],
    },
    {
      name: "Club Colombia",
      beers: [
        { presentation: "Botella 330ml",  unitPrice: 4500,  stock: 60  },
        { presentation: "Lata 330ml",     unitPrice: 5000,  stock: 40  },
        { presentation: "Paca x24",       unitPrice: 98000, stock: 5   },
      ],
    },
    {
      name: "Costeña",
      beers: [
        { presentation: "Botella 330ml",  unitPrice: 3000,  stock: 100 },
        { presentation: "Botella 750ml",  unitPrice: 5000,  stock: 60  },
        { presentation: "Paca x30",       unitPrice: 82000, stock: 8   },
      ],
    },
    {
      name: "Michelob Ultra",
      beers: [
        { presentation: "Lata 330ml",     unitPrice: 6000,  stock: 30  },
        { presentation: "Paca x24",       unitPrice: 130000, stock: 3  },
      ],
    },
    {
      name: "Heineken",
      beers: [
        { presentation: "Botella 330ml",  unitPrice: 7000,  stock: 30  },
        { presentation: "Lata 330ml",     unitPrice: 7500,  stock: 20  },
      ],
    },
  ];

  for (const marca of marcas) {
    const brand = await prisma.beerBrand.upsert({
      where: { name: marca.name },
      update: {},
      create: { name: marca.name },
    });

    for (const beer of marca.beers) {
      await prisma.beer.create({
        data: {
          brandId: brand.id,
          presentation: beer.presentation,
          unitPrice: beer.unitPrice,
          stock: beer.stock,
          minStock: 10,
        },
      });
    }

    console.log(`  ✅ ${marca.name} — ${marca.beers.length} presentaciones`);
  }

  console.log("\n🎉 Cervezas cargadas exitosamente!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());