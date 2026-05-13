// ══════════════════════════════════════════════════
//  GraphQL Demo — Introducción a Sistemas Distribuidos
//  Stack: Node.js + Apollo Server 4
// ══════════════════════════════════════════════════
//
//  SETUP:
//    npm init -y
//    npm install @apollo/server graphql graphql-subscriptions graphql-ws ws
//
//  CORRER:
//    node server.js   →   http://localhost:4000
//    (Abre Apollo Sandbox automáticamente en el navegador)
// ══════════════════════════════════════════════════

import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { PubSub } from "graphql-subscriptions";

const pubsub = new PubSub();
const NUEVO_LIBRO = "NUEVO_LIBRO";

// ─── 1. SCHEMA (SDL) ──────────────────────────────
const typeDefs = `#graphql

  """Un libro de la biblioteca"""
  type Libro {
    id:      ID!
    titulo:  String!
    autor:   String!
    paginas: Int!
    genero:  Genero!
  }

  """Géneros disponibles"""
  enum Genero {
    CIENCIA_FICCION
    FANTASIA
    HISTORIA
    TECNOLOGIA
    LITERATURA
  }

  """Entrada para crear un libro"""
  input NuevoLibroInput {
    titulo:  String!
    autor:   String!
    paginas: Int!
    genero:  Genero!
  }

  type Query {
    "Devuelve todos los libros"
    libros: [Libro!]!

    "Busca un libro por ID"
    libro(id: ID!): Libro

    "Filtra por género"
    librosPorGenero(genero: Genero!): [Libro!]!
  }

  type Mutation {
    "Agrega un nuevo libro y notifica a los suscriptores"
    agregarLibro(input: NuevoLibroInput!): Libro!

    "Elimina un libro por ID"
    eliminarLibro(id: ID!): Boolean!
  }

  type Subscription {
    "Se dispara cada vez que se agrega un libro nuevo"
    libroAgregado: Libro!
  }
`;

// ─── 2. DATA (en memoria para la demo) ───────────
let libros = [
  { id: "1", titulo: "El Problema de los Tres Cuerpos", autor: "Liu Cixin",    paginas: 400, genero: "CIENCIA_FICCION" },
  { id: "2", titulo: "Dune",                            autor: "Frank Herbert", paginas: 688, genero: "CIENCIA_FICCION" },
  { id: "3", titulo: "Clean Code",                      autor: "Robert Martin", paginas: 431, genero: "TECNOLOGIA"      },
  { id: "4", titulo: "Cien Años de Soledad",            autor: "García Márquez",paginas: 471, genero: "LITERATURA"      },
  { id: "5", titulo: "Sapiens",                         autor: "Yuval Harari",  paginas: 443, genero: "HISTORIA"        },
];

// ─── 3. RESOLVERS ────────────────────────────────
const resolvers = {
  Query: {
    // parent=_, args=vacíos, context=ctx
    libros: () => libros,

    libro: (_, { id }) => {
      const libro = libros.find((l) => l.id === id);
      if (!libro) return null; // GraphQL devuelve null, no 404
      return libro;
    },

    librosPorGenero: (_, { genero }) =>
      libros.filter((l) => l.genero === genero),
  },

  Mutation: {
    agregarLibro: (_, { input }) => {
      const nuevoLibro = {
        id: String(Date.now()),
        ...input,
      };
      libros.push(nuevoLibro);

      // Publicar evento para subscriptores
      pubsub.publish(NUEVO_LIBRO, { libroAgregado: nuevoLibro });
      console.log(`📚 Libro agregado: "${nuevoLibro.titulo}"`);

      return nuevoLibro;
    },

    eliminarLibro: (_, { id }) => {
      const antes = libros.length;
      libros = libros.filter((l) => l.id !== id);
      return libros.length < antes;
    },
  },

  Subscription: {
    libroAgregado: {
      subscribe: () => pubsub.asyncIterator([NUEVO_LIBRO]),
    },
  },
};

// ─── 4. SERVIDOR ─────────────────────────────────
const server = new ApolloServer({ typeDefs, resolvers });

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
});

console.log(`
🚀 Servidor GraphQL corriendo en: ${url}
📖 Apollo Sandbox disponible en:  ${url}

Prueba estas queries en el Sandbox:
─────────────────────────────────────
# Ver todos los libros
query {
  libros { id titulo autor paginas genero }
}

# Buscar por ID
query {
  libro(id: "1") { titulo autor }
}

# Filtrar por género
query {
  librosPorGenero(genero: TECNOLOGIA) { titulo }
}

# Agregar un libro
mutation {
  agregarLibro(input: {
    titulo: "Designing Data-Intensive Applications"
    autor: "Martin Kleppmann"
    paginas: 616
    genero: TECNOLOGIA
  }) { id titulo }
}

# Subscription (en una pestaña aparte del Sandbox)
subscription {
  libroAgregado { id titulo autor }
}
─────────────────────────────────────
`);
