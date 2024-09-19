# About

Here we try to replace cds runtime with something else.

The idea was to investigate middlewares and db layers further to see if we can introduce some other runtime for controllers.

Also motivation was to figure out how transaction handling really works in cds

In short, it looks like we could potentially rebuild cap nodejs on nestjs architecture (events out of scope for now)

More can be found here: https://community.sap.com/t5/technology-blogs-by-members/how-we-could-potentially-have-nestjs-as-runtime-for-sap-cap/ba-p/13869645

## Run stuff

- Regular unhacked cds `npm run cds`
- Hacked stuff with db/data `npm run node`
- Hacked stuff with prebuilt csn.json and empty db in gen/srv `npm run prebuilt`
- Nest-ed stuff `npm run nest`
