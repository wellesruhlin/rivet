import {sqliteTable,text,integer,index} from "drizzle-orm/sqlite-core";
export const conceptRequests=sqliteTable("concept_requests",{
id:text("id").primaryKey(),name:text("name").notNull(),email:text("email").notNull(),website:text("website").notNull(),options:text("options").notNull(),notes:text("notes").notNull().default(""),
status:text("status",{enum:["new","reviewed","concept","shared","proposal","customer"]}).notNull().default("new"),
fileKey:text("file_key"),fileName:text("file_name"),fileType:text("file_type"),fileSize:integer("file_size"),
createdAt:integer("created_at").notNull()
},t=>[index("idx_requests_email_created").on(t.email,t.createdAt)]);