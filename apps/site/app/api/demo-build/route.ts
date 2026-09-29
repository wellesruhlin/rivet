export function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const finish = query.get("finish");
  const length = query.get("length");
  if (!["ember", "forest"].includes(finish || "") || !["177", "184", "191"].includes(length || "")) {
    return new Response("Choose a valid finish and length.", { status: 400 });
  }
  const text = `Rivet — illustrative ski configuration\n\nFinish: ${finish === "ember" ? "Ember / charcoal" : "Forest / oak"}\nLength: ${length} cm\nIllustrative price: $${finish === "ember" ? 849 : 899}\n\nDemo only. This is not a purchasable product or a binding quote.\n`;
  return new Response(text, { headers: {
    "Content-Type": "text/plain; charset=utf-8",
    "Content-Disposition": 'attachment; filename="rivet-demo-build.txt"',
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-store",
  } });
}
