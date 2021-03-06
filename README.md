# Reference Spreadsheet Blueprints

This is a reference blueprints package for the [Sofie News Studio Automation System](https://github.com/nrkno/Sofie-TV-automation/).

## Features

These blueprints is intended to be used with Spreadsheets based on [this template](https://docs.google.com/spreadsheets/d/1iyegRv5MxYYtlVu8uEEMkBYXsLL-71PAMrNW0ZfWRUw/edit#gid=0)

* 

## Getting started

To start using these blueprints in Sofie, start with going through the [Getting Started guide](https://sofie.gitbook.io/sofie-tv-automation/documentation/getting-started) in the Sofie documentation.



## Installation (for developers)

For developers installation steps are as following:
```sh
git clone https://github.com/SuperFlyTV/sofie-blueprints-spreadsheet
yarn
yarn dist
```
The result dist/*-bundle.js files can be distributed and uploaded in the Sofie UI

TODO - bundle.json is a valid distribution format

## Development

This project builds with webpack and can auto upload on successful compilation
```sh
yarn watch-sync-local # alias to upload to a local instance
yarn watch --env.server="http://localhost:3000" # can be used to connect to upload to a remote sofie instance
```

There are some unit tests for the project, currently just to validate that the blueprints do not crash while executing.
These can be run with 
```sh
yarn unit # run once
yarn test # watch for changes
```
