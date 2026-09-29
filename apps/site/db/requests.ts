import { env } from "cloudflare:workers";
export function requestDb(){if(!env.DB)throw new Error("Request storage unavailable");return env.DB;}
export function requestBucket(){if(!env.BUCKET)throw new Error("File storage unavailable");return env.BUCKET;}