/**
 * Created by 明阳 on 2015/1/6.
 */
var l = require('./public/javascripts/lexer.js');
var p = require('./public/javascripts/parser.js');
lexer.setInput('    const a= 1,b=0;');
var parser = new Parser();
lexer.lex();
parser.token = res;
var root ={};
parser.parse(root);
console.log(root);
