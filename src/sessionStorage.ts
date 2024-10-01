// // SQLiteSessionStorage.ts
// import sqlite3 from 'sqlite3';
// import { Session } from '@shopify/shopify-app-session-storage-sqlite';

// // Initialize SQLite database
// const db = new sqlite3.Database(
//   './shopify_sessions.db'
// );

// // Create the table for storing sessions if it doesn't exist
// db.serialize(() => {
//   db.run(`
//     CREATE TABLE IF NOT EXISTS sessions (
//       id TEXT PRIMARY KEY,
//       session_data TEXT
//     )
//   `);
// });

// // Implementing the session storage functionality
// export const SQLiteSessionStorage = {
//   async storeSession(
//     session: Session
//   ): Promise<boolean> {
//     return new Promise((resolve, reject) => {
//       db.run(
//         `REPLACE INTO sessions (id, session_data) VALUES (?, ?)`,
//         [session.id, JSON.stringify(session)],
//         (error) => {
//           if (error) {
//             console.error(
//               'Error storing session:',
//               error
//             );
//             reject(error);
//           } else {
//             resolve(true);
//           }
//         }
//       );
//     });
//   },

//   async loadSession(
//     id: string
//   ): Promise<Session | undefined> {
//     return new Promise((resolve, reject) => {
//       db.get(
//         `SELECT session_data FROM sessions WHERE id = ?`,
//         [id],
//         (error, row) => {
//           if (error) {
//             console.error(
//               'Error loading session:',
//               error
//             );
//             reject(error);
//           } else {
//             resolve(
//               row
//                 ? JSON.parse(row.session_data)
//                 : undefined
//             );
//           }
//         }
//       );
//     });
//   },

//   async deleteSession(
//     id: string
//   ): Promise<boolean> {
//     return new Promise((resolve, reject) => {
//       db.run(
//         `DELETE FROM sessions WHERE id = ?`,
//         [id],
//         (error) => {
//           if (error) {
//             console.error(
//               'Error deleting session:',
//               error
//             );
//             reject(error);
//           } else {
//             resolve(true);
//           }
//         }
//       );
//     });
//   },

//   async deleteSessions(
//     ids: string[]
//   ): Promise<boolean> {
//     return new Promise((resolve, reject) => {
//       const placeholders = ids
//         .map(() => '?')
//         .join(',');
//       db.run(
//         `DELETE FROM sessions WHERE id IN (${placeholders})`,
//         ids,
//         (error) => {
//           if (error) {
//             console.error(
//               'Error deleting multiple sessions:',
//               error
//             );
//             reject(error);
//           } else {
//             resolve(true);
//           }
//         }
//       );
//     });
//   },

//   async findSessionsByShop(
//     shop: string
//   ): Promise<Session[]> {
//     return new Promise((resolve, reject) => {
//       db.all(
//         `SELECT session_data FROM sessions WHERE session_data LIKE ?`,
//         [`%"shop":"${shop}"%`],
//         (error, rows) => {
//           if (error) {
//             console.error(
//               'Error finding sessions by shop:',
//               error
//             );
//             reject(error);
//           } else {
//             const sessions = rows.map((row) =>
//               JSON.parse(row.session_data)
//             );
//             resolve(sessions);
//           }
//         }
//       );
//     });
//   },
// };
