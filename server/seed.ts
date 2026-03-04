import * as dotenv from "dotenv";
import { join } from "path";

// Carrega o .env e o .env.local IMEDIATAMENTE usando o caminho absoluto
dotenv.config({ path: join(process.cwd(), ".env") });
dotenv.config({ path: join(process.cwd(), ".env.local") });

import { db } from "./routers/_utils/db.js";
import { users, sebos, books } from "./_schema.js";

async function seed() {
  console.log("🌱 Iniciando seed...");

  try {
    // 1. Criar Usuário Admin/Livreiro de exemplo
    const [user] = await db.insert(users).values({
      openId: "seed-user-1",
      name: "Livreiro de Exemplo",
      email: "contato@teka.com.br",
      whatsapp: "51996263385",
      role: "livreiro",
    }).$returningId();

    console.log("✅ Usuário criado");

    // 2. Criar Sebos de exemplo
    const [sebo1] = await db.insert(sebos).values({
      userId: user.id,
      name: "Sebo do Porto",
      description: "Especializado em clássicos e literatura brasileira.",
      whatsapp: "51996263385",
      city: "Porto Alegre",
      state: "RS",
      verified: true,
    }).$returningId();

    const [sebo2] = await db.insert(sebos).values({
      userId: user.id,
      name: "Livraria Releitura",
      description: "Livros raros e edições esgotadas.",
      whatsapp: "51996263385",
      city: "São Paulo",
      state: "SP",
      verified: true,
    }).$returningId();

    console.log("✅ Sebos criados");

    // 3. Criar Livros de exemplo com ISBNs reais para as capas funcionarem
    const exampleBooks = [
      {
        seboId: sebo1.id,
        title: "Dom Casmurro",
        author: "Machado de Assis",
        isbn: "9788535923148",
        category: "Literatura Brasileira",
        description: "Um dos maiores clássicos da nossa literatura. Edição em ótimo estado.",
        price: "25.00",
        condition: "Bom estado",
        year: 2013,
      },
      {
        seboId: sebo1.id,
        title: "1984",
        author: "George Orwell",
        isbn: "9788535914849",
        category: "Ficção Científica",
        description: "A distopia mais famosa de todos os tempos.",
        price: "32.50",
        condition: "Excelente",
        year: 2009,
      },
      {
        seboId: sebo2.id,
        title: "O Pequeno Príncipe",
        author: "Antoine de Saint-Exupéry",
        isbn: "9788522031436",
        category: "Infantil",
        description: "O essencial é invisível aos olhos.",
        price: "18.00",
        condition: "Usado",
        year: 2015,
      },
      {
        seboId: sebo2.id,
        title: "Sapiens: Uma Breve História da Humanidade",
        author: "Yuval Noah Harari",
        isbn: "9788525432186",
        category: "História",
        description: "Best-seller mundial sobre a evolução humana.",
        price: "45.00",
        condition: "Excelente",
        year: 2015,
      },
      {
        seboId: sebo1.id,
        title: "O Alquimista",
        author: "Paulo Coelho",
        isbn: "9788575427583",
        category: "Literatura Brasileira",
        description: "A jornada de Santiago em busca do seu tesouro.",
        price: "20.00",
        condition: "Bom estado",
        year: 2012,
      },
      {
        seboId: sebo2.id,
        title: "Harry Potter e a Pedra Filosofal",
        author: "J.K. Rowling",
        isbn: "9788532511010",
        category: "Fantasia",
        description: "O início da saga do bruxo mais famoso do mundo.",
        price: "35.00",
        condition: "Bom estado",
        year: 2000,
      }
    ];

    for (const book of exampleBooks) {
      await db.insert(books).values(book as any);
    }

    console.log("✅ Livros criados");
    console.log("✨ Seed finalizado com sucesso!");
  } catch (err) {
    console.error("❌ Erro no seed:", err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

seed();
