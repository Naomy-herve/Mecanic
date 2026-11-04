import {NextResponse} from "next/server";
import {z} from "zod";
import {query} from "@/lib/db";

const schema=z.object({
  name:z.string().trim().min(2).max(100),
  email:z.string().trim().toLowerCase().pipe(z.email().max(254)),
  phone:z.string().trim().max(40).optional(),
  subject:z.string().trim().min(3).max(150),
  message:z.string().trim().min(10).max(3000),
  // Hidden form field used as a lightweight bot trap. Real visitors leave it empty.
  website:z.string().max(0).optional()
});

export async function POST(req:Request){
  const contentType=req.headers.get("content-type")||"";
  const isJson=contentType.includes("application/json");
  try{
    const body=isJson?await req.json():Object.fromEntries((await req.formData()).entries());
    const parsed=schema.safeParse(body);
    if(!parsed.success||parsed.data.website!==undefined){
      return NextResponse.json({error:"Vérifiez les champs de votre demande."},{status:400});
    }
    const d=parsed.data;
    await query(
      "INSERT INTO inquiries(name,email,phone,subject,message) VALUES($1,$2,$3,$4,$5)",
      [d.name,d.email,d.phone||null,d.subject,d.message]
    );
    if(isJson)return NextResponse.json({ok:true},{status:201});
    return NextResponse.redirect(new URL("/?contact=sent#contact",req.url),303);
  }catch{
    return NextResponse.json(
      {error:"Impossible d'envoyer votre demande pour le moment."},
      {status:500}
    );
  }
}
