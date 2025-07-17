import sqlite3 from 'sqlite3';
import bcrypt from 'bcrypt';
import path from 'path';

const db = new sqlite3.Database(path.join(__dirname, '..', 'users.db'));

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      username TEXT PRIMARY KEY,
      password_hash TEXT NOT NULL,
      elo_rating INTEGER DEFAULT 1200
    )
  `);
});

export interface User {
  username: string;
  password_hash: string;
  elo_rating: number;
}

export async function createUser(username: string, password: string): Promise<void> {
  const passwordHash = await bcrypt.hash(password, 10);
  const lowercaseUsername = username.toLowerCase();
  
  return new Promise((resolve, reject) => {
    // First check if username already exists (case-insensitive)
    db.get(
      'SELECT username FROM users WHERE LOWER(username) = ?',
      [lowercaseUsername],
      async (err, row) => {
        if (err) {
          reject(err);
        } else if (row) {
          reject(new Error('Username already exists'));
        } else {
          // Store username in lowercase
          db.run(
            'INSERT INTO users (username, password_hash) VALUES (?, ?)',
            [lowercaseUsername, passwordHash],
            (err) => {
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            }
          );
        }
      }
    );
  });
}

export async function validateUser(username: string, password: string): Promise<boolean> {
  const lowercaseUsername = username.toLowerCase();
  
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT password_hash FROM users WHERE username = ?',
      [lowercaseUsername],
      async (err, row: { password_hash: string } | undefined) => {
        if (err) {
          reject(err);
        } else if (!row) {
          resolve(false);
        } else {
          const valid = await bcrypt.compare(password, row.password_hash);
          resolve(valid);
        }
      }
    );
  });
}

export function getUser(username: string): Promise<User | null> {
  const lowercaseUsername = username.toLowerCase();
  
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT username, password_hash, elo_rating FROM users WHERE username = ?',
      [lowercaseUsername],
      (err, row: User | undefined) => {
        if (err) {
          reject(err);
        } else {
          resolve(row || null);
        }
      }
    );
  });
}

export function updateEloRating(username: string, newRating: number): Promise<void> {
  const lowercaseUsername = username.toLowerCase();
  
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE users SET elo_rating = ? WHERE username = ?',
      [newRating, lowercaseUsername],
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
}

export function getUserElo(username: string): Promise<number> {
  const lowercaseUsername = username.toLowerCase();
  
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT elo_rating FROM users WHERE username = ?',
      [lowercaseUsername],
      (err, row: { elo_rating: number } | undefined) => {
        if (err) {
          reject(err);
        } else if (!row) {
          reject(new Error('User not found'));
        } else {
          resolve(row.elo_rating);
        }
      }
    );
  });
}

export function getAllUsers(): Promise<Array<{ username: string; elo_rating: number }>> {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT username, elo_rating FROM users ORDER BY elo_rating DESC',
      [],
      (err, rows: Array<{ username: string; elo_rating: number }>) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      }
    );
  });
}

export function deleteUser(username: string): Promise<void> {
  const lowercaseUsername = username.toLowerCase();
  
  return new Promise((resolve, reject) => {
    db.run(
      'DELETE FROM users WHERE username = ?',
      [lowercaseUsername],
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
}

export async function resetUserPassword(username: string, newPassword: string): Promise<void> {
  const passwordHash = await bcrypt.hash(newPassword, 10);
  const lowercaseUsername = username.toLowerCase();
  
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE users SET password_hash = ? WHERE username = ?',
      [passwordHash, lowercaseUsername],
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
}

export async function ensureAdminUser(): Promise<void> {
  try {
    const user = await getUser('admin');
    if (!user) {
      await createUser('admin', 'bigboss');
      await updateEloRating('admin', 9999);
    }
  } catch (error) {
    // Admin doesn't exist, create it
    await createUser('admin', 'bigboss');
    await updateEloRating('admin', 9999);
  }
}

export function clearDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Delete all users except admin (case-insensitive)
    db.run(
      'DELETE FROM users WHERE LOWER(username) != ?',
      ['admin'],
      async function(err) {
        if (err) {
          reject(err);
        } else {
          console.log(`Cleared ${this.changes} users from database`);
          // Ensure admin user still exists
          await ensureAdminUser();
          resolve();
        }
      }
    );
  });
}