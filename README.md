# Getting Started

Here we try to replace cds runtime with something else.

So far we managed to make a direct link between new ODataAdapter and DB layer,
meaning we only have generic handlers enabled

The idea is to investigate middlewares and db layers further to see if we can introduce some other runtime for controllers.

Also motivation is to figure out how transaction handling really works in cds

## Run stuff

- Regular unhacked cds `npm run serve`
- Hacked stuff with db/data `npm start`
- Hacked stuff with prebuilt csn.json in gen/srv `npm run prebuilt`
