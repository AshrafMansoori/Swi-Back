# SwiVastu Backend

Express and MongoDB API for the SwiVastu peer-to-peer marketplace.

## Marketplace API

- `POST /api/v1/items/item` — authenticated listing creation with 1–5 photos
- `GET /api/v1/items/home` — available item feed
- `GET /api/v1/items/:itemId` — item details with public owner fields only
- `GET /api/v1/items/my-items` — authenticated user's listings
- `POST /api/v1/purchase/request` — purchase or giveaway request
- `POST /api/v1/exchange-requests/` — exchange request
- `POST /api/v1/rent/request` — rental request

Auth tokens are issued in secure, HTTP-only cookies. Configure `CORS_ORIGIN` for the frontend origin and use HTTPS in deployment so credentialed cross-site cookies work.
