const fs = require('fs');
const { DOMParser } = require('@xmldom/xmldom');

const buffer = fs.readFileSync('Master.xml');
let xmlText = buffer.toString('utf16le');
xmlText = xmlText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
xmlText = xmlText.replace(/&#[0-8];|&#1[12];|&#1[4-9];|&#2[0-9];|&#3[01];/g, '');
xmlText = xmlText.replace(/&(?!(?:apos|quot|[lg]t|amp);|#)/g, '&amp;');

const parser = new DOMParser();
const doc = parser.parseFromString(xmlText, 'text/xml');

const stockItems = doc.getElementsByTagName('STOCKITEM');
console.log('STOCKITEM count:', stockItems.length);

if (stockItems.length > 0) {
    console.log('First stock item name:', stockItems[0].getAttribute('NAME'));
}
