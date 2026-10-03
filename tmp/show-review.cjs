const fs = require('fs');
const slug = process.argv[2];
const d = [...JSON.parse(fs.readFileSync('tmp/rewrite-slices/slice-1.json','utf8')),...JSON.parse(fs.readFileSync('tmp/rewrite-slices/slice-2.json','utf8'))];
const r = d.find(x=>x.slug===slug);
if (!r) { console.log('NOT FOUND'); process.exit(1); }
for (const s of r.sections) {
  console.log('##### ID=' + s.id + ' #####');
  console.log(s.content);
  console.log('');
}
