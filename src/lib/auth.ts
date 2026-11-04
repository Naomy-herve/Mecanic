import { SignJWT,jwtVerify } from "jose";
import { cookies } from "next/headers";
const cookieName="kia_session";
function secret(){const s=process.env.AUTH_SECRET;if(!s||s.length<32)throw new Error("AUTH_SECRET doit contenir au moins 32 caractères.");return new TextEncoder().encode(s);}
export type User={id:string;fullName:string;email:string;role:"customer"|"admin"};
export async function createSession(user:User){const token=await new SignJWT({name:user.fullName,email:user.email,role:user.role}).setProtectedHeader({alg:"HS256"}).setSubject(user.id).setIssuedAt().setExpirationTime("7d").sign(secret());(await cookies()).set(cookieName,token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:604800});}
export async function getSession():Promise<User|null>{const token=(await cookies()).get(cookieName)?.value;if(!token)return null;try{const {payload}=await jwtVerify(token,secret());if(!payload.sub||typeof payload.name!=="string"||typeof payload.email!=="string"||(payload.role!=="admin"&&payload.role!=="customer"))return null;return{id:payload.sub,fullName:payload.name,email:payload.email,role:payload.role};}catch{return null;}}
export async function requireAdmin(){const u=await getSession();return u?.role==="admin"?u:null;}