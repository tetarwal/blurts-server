"use strict";

const articles = require("./articles");
const breaches = require("./breaches");
const footer = require("./footer");
const header = require("./header");
const legacyHelpers = require("./hbs-helpers");


module.exports = {
  helpers: Object.assign(
    articles,
    breaches,
    footer,
    header,
    legacyHelpers,
  ),
};