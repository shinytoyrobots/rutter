import { search } from "./search.js";

const query = process.argv.slice(2).join(" ");
if (!query) {
  console.error("usage: npm run search -- <query>");
  process.exit(1);
}

const results = search(query, { limit: 10 });
if (results.length === 0) {
  console.log(`No notes matched "${query}".`);
} else {
  for (const [i, r] of results.entries()) {
    const badges = [r.type, r.status, r.created].filter(Boolean).join(" · ");
    console.log(`${i + 1}. ${r.title}${badges ? " — " + badges : ""}`);
    console.log(`   ${r.path}`);
    console.log(`   …${r.snippet}…\n`);
  }
}
