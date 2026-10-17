#!/usr/bin/env node
/* Creates the newsletter's database, role and tables on the cluster (idempotent). Run once by an operator with the
   cluster's admin connection; prints no secret.
   Usage: (cd functions/packages/newsletter/confirm && npm install) then
   DATABASE_ADMIN_URL=postgres://doadmin:…@host:port/defaultdb DATABASE_NEWSLETTER_PASSWORD=… node scripts/newsletter-db.mjs */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

// The functions' own `pg` (the site itself has no database driver).
const pg = createRequire(new URL("../functions/packages/newsletter/confirm/package.json", import.meta.url))("pg");

const admin = process.env.DATABASE_ADMIN_URL;
const password = process.env.DATABASE_NEWSLETTER_PASSWORD;
if (!admin || !password) throw new Error("DATABASE_ADMIN_URL and DATABASE_NEWSLETTER_PASSWORD are required");
const connect = async (database) => {
  const url = new URL(admin);
  url.pathname = `/${database}`;
  url.searchParams.delete("sslmode");
  const c = new pg.Client({ connectionString: url.toString(), ssl: { rejectUnauthorized: false } });
  await c.connect();
  return c;
};
const root = await connect("defaultdb");
const role = await root.query("select 1 from pg_roles where rolname = 'krizaka_newsletter'");
if (!role.rowCount) await root.query(`create role krizaka_newsletter login password '${password.replace(/'/g, "''")}'`);
const db = await root.query("select 1 from pg_database where datname = 'krizaka_newsletter'");
if (!db.rowCount) await root.query("create database krizaka_newsletter owner krizaka_newsletter");
await root.end();
const c = await connect("krizaka_newsletter");
await c.query("revoke all on database krizaka_newsletter from public");
await c.query("set role krizaka_newsletter");
await c.query(readFileSync(new URL("../db/newsletter.sql", import.meta.url), "utf8"));
const tables = await c.query("select tablename from pg_tables where schemaname = 'public' order by 1");
console.log(`newsletter-db: role, database and tables ready (${tables.rows.map((r) => r.tablename).join(", ")})`);
await c.end();
