# reverse-dependency-search

Searches a given project directory for references to a given file.

usage: `npm i` then `npm start` and follow the prompts.

Rather than using an app entry point to begin the search, this performs a brute-force search of all files in the project directory that match `allowedExtensions` within `src/index.ts`.

An inventory of resolved vs unresolved dependencies can be seen by calling `npm start -- --debug`

If searching for template files, pass `-t` or `--template` followed by the template engine. Currently only [rendr](https://rendrjs.github.io) views and templates are supported.
