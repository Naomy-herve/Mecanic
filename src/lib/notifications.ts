type NotificationEvent="order_updates"|"repair_updates"|"appointment_reminders"|"invoice_updates";

const preferenceByEvent:Record<NotificationEvent,string>={
 order_updates:"order_updates",
 repair_updates:"repair_updates",
 appointment_reminders:"appointment_reminders",
 invoice_updates:"invoice_updates",
};

export async function queueInAppNotification(
 client:import("pg").PoolClient,
 userId:string|null|undefined,
 eventType:NotificationEvent,
 title:string,
 message:string,
 relatedType?:string,
 relatedId?:string|null
){
 if(!userId)return;
 const preference=preferenceByEvent[eventType];
 const enabled=await client.query(
  `SELECT COALESCE((SELECT ${preference} FROM notification_preferences WHERE user_id=$1),true) AS enabled`,
  [userId]
 );
 if(!enabled.rows[0]?.enabled)return;
 await client.query(
  "INSERT INTO notifications(user_id,channel,event_type,title,message,status,related_type,related_id,sent_at) VALUES($1,'in_app',$2,$3,$4,'sent',$5,$6,now())",
  [userId,eventType,title,message,relatedType||null,relatedId||null]
 );
}
