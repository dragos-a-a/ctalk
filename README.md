# CTalk

## Introduction

A two service system for product reviews that calculates average ratings.
Boilerplate and original README.md at https://github.com/edwinhern/express-typescript-2024

## Setup
- Create a copy of `.env.template` as `.env` and adjust if need be
- Start app via docker `docker compose up`
- Recommend for DB & Redis to be kept running inside docker
- Local: install dependencies `npm install` (recommend latest node version)
- Local: debugging  use `npm run dev:product` and `npm run dev:review`
- Local: running without debugging and docker use `npm run build`, `npm run start:product` and `npm run start:review`
- Note: code changes are visible in docker containers only after `docker compose build --no-cache` (candidate for further improvements)
- App Swagger should be accesible by default at `http://localhost:8080/swagger-ui.html` 

## Features
- Product service API that allows CRUD for products and reviews (including swagger support, requests validation, caching, healthcheck, logging, error handling, DB creation and seeding, reqs rate limiting)
- Review service that handles average rating calculation in a distributed manner. It can calculate a simple operation efficiently or support multiple concurrent changes leading to eventual consistency for the average rating
- MariaDB for persistent storage and Redis for caching and cross service communication via pub/sub

## Implementation notes
- Decided on the technologies used (ts, nodejs, express, mariadb, redis) due to them covering the needs of the project and due to previous experience using them
- Especially decided to use redis for both caching and pub/sub due to past experience and considering it enough for the project
- Used a SQL DB due to the structured nature of the data (check `dbInit.ts` for table definitions, including used indexes)
- Used raw SQL instead of an ORM due to limited scope of the project
- Decided to store the avgRating on the product instead of always computing & caching it due to also caching the product
- Check the `*Model` files for API validations as well (things like only allowing an review text and rating to be updated (and not the name of the reviewer))
- `orchestrator.ts` contains the most interesting part of the project (how we ensure support for concurrent changes to product reviews). The comments in the file should (hopefully) detail the flow / thought process enough

## Out of time (things I intended to integrate)
- Proper tests (unit/integration)
- App startup improvements: allowing connections only after DB & Redis are connected
- Code reuse improvements across services (maybe extract common part of `dbInit`)
- Docker build can be improved (to not pass the whole context; how we install packages)
- Improve error handling & monitoring
- Checking for subscribers to the review redis pub/sub channel before publishing from `product-service` (and if no listeners are up store the productId in the DB for future processing)
- More detailed documentation / thought process / tradeoffs

## Out of scope (things I did not intend to integrate)
- Hardcoded 1 product service and 2 review services inside `docker-compose.yml`. This could be improved by integrating in a proper build/deploy system
- Authentication & Authorization (if we had users)
- Product / Reviews lists pagination
- Possible smarter caching. The list of products/reviews do not get cached as we do not have pagination 

## Personal notes
- It was an interesting project and I do not really get to build up repos/services from scratch too often
- I approached it as I would develop it for production
- I had some difficulties with the initial personal repo (github) setup (in order to not conflict to my work one)
- It also took a bit of time to find a proper boilerplate to start from (and adjust to the needs of the project)
- By the time I got to the more interesting part (cross service communication, concurrency, caching) I was running out of time
- I did use github copilot
- It mainly took me around a weekend of intense (but fun work), would appreciate any feedback
