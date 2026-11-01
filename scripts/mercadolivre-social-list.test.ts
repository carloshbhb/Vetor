import assert from "node:assert/strict";
import { parseSocialListPage, parseSocialListTotal } from "../src/lib/mercadolivre-social-list";

const html = String.raw`<!doctype html>
<html>
  <body>
    <script>melidata("add","event_data",{"total_results":287});</script>
    <div class="aff-social-polycard__container">
      <div class="poly-card">
        <img class="poly-component__picture" src="https://http2.mlstatic.com/product.webp" />
        <a class="poly-component__title" href="https://www.mercadolivre.com.br/produto/p/MLB62498423?matt_event_ts=123#polycard_client=social-profile-middleend&source=lists&type=product&tracking_id=abc&wid=MLB5064996023&sid=storefronts">Produto de teste</a>
        <div class="poly-price__previous"><span class="andes-money-amount__fraction">214</span><span class="andes-money-amount__cents">99</span></div>
        <div class="poly-price__current"><span class="andes-money-amount__fraction">204</span><span class="andes-money-amount__cents">99</span></div>
        <span class="poly-reviews__rating">4.8</span>
        <span class="poly-reviews__total">(1.397)</span>
        <span class="poly-component__highlight">MAIS VENDIDO</span>
      </div>
    </div>
  </body>
</html>`;

assert.equal(parseSocialListTotal(html), 287);
const items = parseSocialListPage(html, 1);
assert.equal(items.length, 1);
assert.equal(items[0].item_id, "MLB5064996023");
assert.equal(items[0].product_id, "MLB62498423");
assert.equal(items[0].title, "Produto de teste");
assert.equal(items[0].price, 204.99);
assert.equal(items[0].original_price, 214.99);
assert.equal(items[0].rating, 4.8);
assert.equal(items[0].review_count, 1397);
assert.equal(items[0].image_url, "https://http2.mlstatic.com/product.webp");

console.log("Mercado Livre social list parser: OK");
