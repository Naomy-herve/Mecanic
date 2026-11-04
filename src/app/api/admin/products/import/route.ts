import {NextResponse} from "next/server";
import {z} from "zod";
import {db} from "@/lib/db";
import {requireAdmin} from "@/lib/auth";

export const runtime="nodejs";
const rowSchema=z.object({
 sku:z.string().trim().min(2).max(64),
 name:z.string().trim().min(2).max(180),
 slug:z.string().trim().min(2).max(180).regex(/^[a-z0-9-]+$/),
 description:z.string().max(5000),
 categorySlug:z.string().trim().max(120),
 price:z.coerce.number().finite().nonnegative(),
 currency:z.string().trim().length(3).transform(v=>v.toUpperCase()),
 stockQuantity:z.coerce.number().int().nonnegative(),
 condition:z.enum(["new","used","refurbished"]),
 imageUrl:z.union([z.literal(""),z.string().url()]),
 manufacturer:z.string().max(120),
 manufacturerPartNumber:z.string().max(120),
 oemReference:z.string().max(120)
});
function parseCSV(input:string){
 const rows:string[][]=[];let row:string[]=[],field="",quoted=false;
 for(let i=0;i<input.length;i++){const ch=input[i];if(quoted){if(ch==='"'&&input[i+1]==='"'){field+='"';i++;}else if(ch==='"')quoted=false;else field+=ch;}else if(ch==='"'&&field.length===0)quoted=true;else if(ch===","){row.push(field);field="";}else if(ch==="\n"){row.push(field);rows.push(row);row=[];field="";}else if(ch!=="\r")field+=ch;}
 if(quoted)throw new Error("CSV invalide : guillemet non fermé.");
 if(field.length||row.length){row.push(field);rows.push(row);}
 return rows.filter(r=>r.some(v=>v.trim()!==""));
}
const slugify=(v:string)=>v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"").slice(0,180);
export async function POST(req:Request){
 if(!await requireAdmin())return NextResponse.json({error:"Accès refusé."},{status:403});
 const form=await req.formData();const file=form.get("file");
 if(!(file instanceof File))return NextResponse.json({error:"Fichier CSV manquant."},{status:400});
 if(file.size>1_000_000)return NextResponse.json({error:"Fichier trop volumineux (maximum 1 Mo)."}, {status:413});
 try{
  const text=await file.text();const rows=parseCSV(text.replace(/^\uFEFF/,""));
  if(rows.length<2)return NextResponse.json({error:"Le CSV doit contenir un en-tête et au moins une ligne."},{status:400});
  if(rows.length>501)return NextResponse.json({error:"Maximum 500 pièces par importation."},{status:400});
  const headers=rows[0].map(h=>h.trim());
  const required=["sku","name","price","currency","stockQuantity"];
  const missing=required.filter(h=>!headers.includes(h));
  if(missing.length)return NextResponse.json({error:"Colonnes obligatoires manquantes : "+missing.join(", ")},{status:400});
  if(new Set(headers).size!==headers.length)return NextResponse.json({error:"Le fichier contient des noms de colonnes en double."},{status:400});
  const client=await db.connect();let imported=0;const errors:{line:number;message:string}[]=[];
  try{
   await client.query("BEGIN");
   for(let i=1;i<rows.length;i++){
    const values=rows[i];if(values.length!==headers.length){errors.push({line:i+1,message:"Nombre de colonnes incorrect."});continue;}
    const raw=Object.fromEntries(headers.map((h,j)=>[h,values[j].trim()]));
    const name=raw.name||"";const parsed=rowSchema.safeParse({
     sku:raw.sku,name,slug:raw.slug||slugify(name),description:raw.description||"",categorySlug:raw.categorySlug||"",
     price:raw.price,currency:raw.currency,stockQuantity:raw.stockQuantity,condition:raw.condition||"new",
     imageUrl:raw.imageUrl||"",manufacturer:raw.manufacturer||"",manufacturerPartNumber:raw.manufacturerPartNumber||"",oemReference:raw.oemReference||""
    });
    if(!parsed.success){errors.push({line:i+1,message:"Données invalides : "+parsed.error.issues.map(x=>x.path.join(".")).join(", ")});continue;}
    const d=parsed.data;
    await client.query("SAVEPOINT import_row");
    try{
     const category= d.categorySlug ? await client.query("SELECT id FROM categories WHERE slug=$1 LIMIT 1",[d.categorySlug]) : {rows:[]};
     if(d.categorySlug&&!category.rows.length)throw new Error("Catégorie inconnue : "+d.categorySlug);
     const result=await client.query("INSERT INTO products(sku,name,slug,description,category_id,price,currency,stock_quantity,condition,image_url,manufacturer,manufacturer_part_number,oem_reference) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT DO NOTHING RETURNING id",
      [d.sku,d.name,d.slug,d.description,category.rows[0]?.id||null,d.price,d.currency,d.stockQuantity,d.condition,d.imageUrl||null,d.manufacturer||null,d.manufacturerPartNumber||null,d.oemReference||null]);
     if(!result.rowCount)throw new Error("SKU ou slug déjà utilisé ; aucune donnée existante n'a été modifiée.");
     imported++;await client.query("RELEASE SAVEPOINT import_row");
    }catch(e){await client.query("ROLLBACK TO SAVEPOINT import_row");await client.query("RELEASE SAVEPOINT import_row");errors.push({line:i+1,message:e instanceof Error?e.message:"Erreur d'importation."});}
   }
   await client.query("COMMIT");
  }catch(e){await client.query("ROLLBACK");throw e;}finally{client.release();}
  return NextResponse.json({imported,skipped:errors.length,errors:errors.slice(0,100)});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Lecture du CSV impossible."},{status:400});}
}
