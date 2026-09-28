import {z} from "zod";
export const conceptSchema=z.object({
requestId:z.string().uuid(),name:z.string().trim().min(2,"Please enter your name.").max(120),
email:z.string().trim().email("Please enter a valid email.").max(254).transform(s=>s.toLowerCase()),
website:z.string().trim().min(3).max(2000).transform(s=>/^https?:\/\//i.test(s)?s:"https://"+s).refine(s=>{try{const u=new URL(s);return ["https:","http:"].includes(u.protocol)&&u.hostname.includes(".")&&!u.username&&!u.password}catch{return false}},"Please enter a website or product link."),
options:z.string().trim().min(10,"Tell us a little more about your product’s options.").max(4000),
notes:z.string().trim().max(2000).default(""),
companyFax:z.string().max(0,"We couldn’t accept this request.")
});