/**
 * Created by 明阳 on 2015/1/8.
 */
var Parser = require('./parser.js');
var parser = new Parser();
parser.setInput('    const a= 1,b=0,c=-1;const ;int A,B,C;int add(int a,int b){return a+b;}int main() {int a;b=1;a = (b+1)+add(a,b) ;printf(a);}');
var root = {};
try {
    parser.parse(root);
    console.log(root.genJSCode());
    eval(root.genJSCode());
}
catch (e) {
    console.log(e.message);
}