const {
  parse,
  parseExpressionAt,
  Parser,
  tokTypes,
} = require('acorn');
const fs = require('fs');
const glob = require('glob');
const klaw = require('klaw');

const globParse = path => new Promise((resolve, reject) => glob(path, {
  dot: true,
}, (err, files) => {
  if (err) {
    reject(err);
  } else {
    resolve(files);
  }
}));

const acornParse = (content, tagContent) => {
  parse(content, {
    onComment: (b, t, s, d) => {
      if (b && t[0] === '*') {
        const a = {};
        a.comment = t;
        const p = new Parser(undefined, content, d);
        p.nextToken();
        if (p.type === tokTypes._function) {
          a.name = parseExpressionAt(content, d).id.name;
        } else if (p.type === tokTypes._const) {
          a.name = p.parseVarStatement(p.startNode()).declarations[0].id.name;
        } else {
          a.name = p.parseStatement().declarations[0].id.name;
        }
        tagContent.push(a);
      }
    },
  });
};

const walk = (x) => {
  const result = [];
  return new Promise((resolve, reject) => {
    klaw(x)
      .on('data', (item) => {
        if (!item.stats.isDirectory()) {
          const tag = {
            content: [],
            name: item.path,
          };
          const content = fs.readFileSync(item.path, 'utf8');
          acornParse(content, tag.content);
          result.push(tag);
        }
      })
      .on('error', (err) => {
        reject(err);
      })
      .on('end', () => {
        resolve(result);
      });
  });
};

const extract = (arr, exclude) => Promise.all(arr.map(x => globParse(x))).then((x) => {
  // console.log("extract", x);
  const paths = [].concat(...x);
  return Promise.all(paths.map(path => walk(path))).then(result => [].concat(...result));
});

//extract(['**/*.js']).then(x => console.log(x));
//extract(['extract.js']).then(x => console.log(x));
//extract(['./']).then(x => console.log(x));
//It's Correct!!
module.exports = extract;