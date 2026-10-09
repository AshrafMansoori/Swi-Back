# SwiVastu Backend

Express and MongoDB API for the SwiVastu peer-to-peer marketplace.

## Marketplace API

- `POST /api/v1/items/item` — authenticated listing creation with 1–5 photos
- `GET /api/v1/items/home` — available item feed, optionally filtered with `q` and `category`
- `GET /api/v1/items/:itemId` — item details with public owner fields only
- `GET /api/v1/items/my-items` — authenticated user's listings
- `GET /api/v1/items/liked-items` — authenticated user's saved listings
- `PUT /api/v1/items/:itemId/like` — save or remove an item (`{ "liked": true|false }`)
- `POST /api/v1/purchase/request` — purchase or giveaway request
- `POST /api/v1/exchange-requests/` — exchange request
- `POST /api/v1/rent/request` — rental request

Auth tokens are issued in secure, HTTP-only cookies that persist for 10 days, matching `REFRESH_TOKEN_EXPIRY=10d`. Keep the cookie lifetime in `src/constants.js` aligned if that token expiry changes. The frontend refreshes an expired access token when the app starts. The live frontend origin (`https://swi-vastu.vercel.app`) is allowed by default. Set `CORS_ORIGIN` to one or more comma-separated additional frontend origins, and use HTTPS in deployment so credentialed cross-site cookies work.

Trust score is recalculated when a purchase/exchange completes, a rental is returned, or a review is submitted. Completed transactions count in the score; each reviewed transaction contributes its star rating and each completed transaction without a review contributes a neutral rating of 3. The resulting weighted average is shown on a 0–5 scale.
