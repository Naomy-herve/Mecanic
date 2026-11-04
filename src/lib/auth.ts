import { SignJWT,jwtVerify } from "jose";
import { cookies } from "next/headers";
import {query} from "@/lib/db";
const cookieName="kia_session";
function secret(){const s=process.env.AUTH_SECRET;if(!s||s.length<32)throw new Error("AUTH_SECRET doit contenir au moins 32 caractères.");return new TextEncoder().encode(s);}
export type User={id:string;fullName:string;email:string;role:"customer"|"admin"};
export async function createSession(user:User){const token=await new SignJWT({name:user.fullName,email:user.email,role:user.role}).setProtectedHeader({alg:"HS256"}).setSubject(user.id).setIssuedAt().setExpirationTime("7d").sign(secret());(await cookies()).set(cookieName,token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:604800});}
export async function getSession():Promise<User|null>{const token=(await cookies()).get(cookieName)?.value;if(!token)return null;try{const {payload}=await jwtVerify(token,secret());if(!payload.sub||typeof payload.name!=="string"||typeof payload.email!=="string"||(payload.role!=="admin"&&payload.role!=="customer"))return null;return{id:payload.sub,fullName:payload.name,email:payload.email,role:payload.role};}catch{return null;}}
/** Re-check the current database role on every privileged request.
 * A role removed from the database therefore loses admin access immediately,
 * even if the browser still holds an unexpired JWT.
 */
export async function requireAdmin():Promise<User|null>{
 const session=await getSession();if(!session)return null;
 try{
  const result=await query<{id:string;email:string;role:"customer"|"admin"}>("SELECT id,email,role FROM users WHERE id=$1 LIMIT 1",[session.id]);
  const current=result.rows[0];if(!current||current.email.toLowerCase()!==session.email.toLowerCase())return null;
  const configuredAdmin=process.env.KIA_ADMIN_EMAIL?.trim().toLowerCase();
  if(current.role!=="admin"&&(!configuredAdmin||current.email.toLowerCase()!==configuredAdmin))return null;
  return {...session,email:current.email,role:"admin"};
 }catch{return null;}
}
