import { Pool } from "pg";
declare global { var __kiaPool: Pool | undefined; }
export const db = global.__kiaPool ?? new Pool({connectionString:process.env.DATABASE_URL,max:5,idleTimeoutMillis:20000,connectionTimeoutMillis:8000,ssl:process.env.DATABASE_URL?.includes("localhost")?undefined:{rejectUnauthorized:true}});
if(process.env.NODE_ENV!=="production") global.__kiaPool=db;
export async function query<T extends import("pg").QueryResultRow=import("pg").QueryResultRow>(sql:string,values:unknown[]=[]){if(!process.env.DATABASE_URL)throw new Error("DATABASE_URL manquant.");return db.query<T>(sql,values);}