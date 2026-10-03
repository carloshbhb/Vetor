import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReviewContent from "@/components/ReviewContent";
const legacy = [{ id:"x", heading:"x", tocEmoji:"", tocLabel:"x", content:"<p>Texto <strong>antigo</strong>.</p><ul><li>Item A</li><li>Item B</li></ul>" }];
const html = renderToStaticMarkup(React.createElement(ReviewContent, { sections: legacy as never }));
console.log(html.replace(/^<div id="x"><h2>x<\/h2><div>/,"").slice(0,300));
console.log("legado sem p aninhado:", !/<p>\s*<p>/.test(html));
console.log("legado preservou lista:", html.includes("<ul>") && (html.match(/<li>/g)||[]).length===2);
console.log("legado preservou texto:", html.includes("antigo"));
