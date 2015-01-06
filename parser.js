/**
 * Created by 明阳 on 2015/1/4.
 */
Lexer.defunct = function (char) {
    throw new Error("At row:" + row +" col:"+col);
};

function Lexer(defunct) {
    if (typeof defunct !== "function") defunct = Lexer.defunct;

    var tokens = [];
    var rules = [];
    var remove = 0;
    this.state = 0;
    this.index = 0;
    this.input = "";

    this.addRule = function (pattern, action, start) {
        var global = pattern.global;

        if (!global) {
            var flags = "g";
            if (pattern.multiline) flags += "m";
            if (pattern.ignoreCase) flags += "i";
            pattern = new RegExp(pattern.source, flags);
        }

        if (Object.prototype.toString.call(start) !== "[object Array]") start = [0];

        rules.push({
            pattern: pattern,
            global: global,
            action: action,
            start: start
        });

        return this;
    };

    this.setInput = function (input) {
        remove = 0;
        this.state = 0;
        this.index = 0;
        tokens.length = 0;
        this.input = input;
        return this;
    };

    this.lex = function () {
        if (tokens.length) return tokens.shift();

        this.reject = true;

        while (this.index <= this.input.length) {
            var matches = scan.call(this).splice(remove);
            var index = this.index;

            while (matches.length) {
                if (this.reject) {
                    var match = matches.shift();
                    var result = match.result;
                    var length = match.length;
                    this.index += length;
                    this.reject = false;
                    remove++;

                    var token = match.action.apply(this, result);
                    if (this.reject) this.index = result.index;
                    else if (typeof token !== "undefined") {
                        switch (Object.prototype.toString.call(token)) {
                            case "[object Array]":
                                tokens = token.slice(1);
                                token = token[0];
                            default:
                                if (length) remove = 0;
                                return token;
                        }
                    }
                } else break;
            }

            var input = this.input;

            if (index < input.length) {
                if (this.reject) {
                    remove = 0;
                    var token = defunct.call(this, input.charAt(this.index++));
                    if (typeof token !== "undefined") {
                        if (Object.prototype.toString.call(token) === "[object Array]") {
                            tokens = token.slice(1);
                            return token[0];
                        } else return token;
                    }
                } else {
                    if (this.index !== index) remove = 0;
                    this.reject = true;
                }
            } else if (matches.length)
                this.reject = true;
            else break;
        }
    };

    function scan() {
        var matches = [];
        var index = 0;

        var state = this.state;
        var lastIndex = this.index;
        var input = this.input;

        for (var i = 0, length = rules.length; i < length; i++) {
            var rule = rules[i];
            var start = rule.start;
            var states = start.length;

            if ((!states || start.indexOf(state) >= 0) ||
                (state % 2 && states === 1 && !start[0])) {
                var pattern = rule.pattern;
                pattern.lastIndex = lastIndex;
                var result = pattern.exec(input);

                if (result && result.index === lastIndex) {
                    var j = matches.push({
                        result: result,
                        action: rule.action,
                        length: result[0].length
                    });

                    if (rule.global) index = j;

                    while (--j > index) {
                        var k = j - 1;

                        if (matches[j].length > matches[k].length) {
                            var temple = matches[j];
                            matches[j] = matches[k];
                            matches[k] = temple;
                        }
                    }
                }
            }
        }

        return matches;
    }
}

function token(str) {
    this.value = str;
    this.type = "unknown";
}

var keyWord = {
    "const":1,
    "int":2,
    "void":3,
    "if":4,
    "else":5,
    "while":6,
    "main":7,
    "return":8,
    "printf":9,
    "scanf":10
};

var col = 1;
var row = 1;

function Parser () {
    this.token = [];
    this.cnt = 0;
    this.lexer = new Lexer();
    var res = [];
    this.initLexer = function() {
        this.lexer.addRule(/[\t ]+/, function (token) { //这是空白字符
            col += token.length;
        });

        this.lexer.addRule(/[a-z][a-z\d]*/i, function (ele) {
            col += ele.length;
            var T = new token(ele);
            if(keyWord[ele]) {
                T.type = "TT_KW"
            }
            else {
                T.type = "TT_ID";
            }
            res.push(T);
        });

        this.lexer.addRule(/\d+\b/, function (ele) {
            col += ele.length;
            var T = new token(parseInt(ele));
            T.type = "TT_Lit";
            res.push(T);
        });


        this.lexer.addRule(/\/\/.*\n/, function (ele) {
            ++row;
            col = 1;
        });

        this.lexer.addRule(/".*"/, function(ele) {
            col += ele.length;
            var T = new token(ele);
            T.type = "TT_ST";
            res.push(T);
        });

        this.lexer.addRule(/(==|!=|>=|<=|[\+\-\*\/%=(){}\[\];,><])/, function (ele) {
            col += ele.length;
            var T = new token(ele);
            T.type = "TT_OP";
            res.push(T);
        });
        this.lexer.addRule(/\n/, function(token) {
            ++row;
            col = 1;
        });

        this.lexer.addRule(/$/, function() {
            console.log("词法分析结束");
        });
    };

    this.initLexer();

    this.setInput = function (input) {
        this.lexer.setInput(input);
    };

    this.parse = function (root) { //语法分析过程，对root节点进行建树操作，token应该在之前设定
        this.cnt = 0;
        this.symbol = {};
        this.token = [];
        this.lexer.lex();
        this.token = res;
        console.log(this.token);
        try {
            this.declareParser(root);
        }
        catch (e) {
            console.log(e.message);
        }
    };

    this.declareParser = function (node) {
        node.const = [];
        node.variable = [];
        node.function = [];
        node.symbol = {};
        while(this.cnt < this.token.length) {
            if (this.token[this.cnt].type != "TT_KW") {
                throw Error("解析不了，在第" + this.cnt + "个token，声明的开始应该是关键字");
            }
            if (this.token[this.cnt].value == 'const') {
                ++this.cnt;
                var tmp = 0;
                while (this.token[this.cnt].value != ";") {
                    if (this.token[this.cnt].value == ",") {
                        ++this.cnt;
                    } else if(tmp > 0) {
                        throw Error("解析不了，在第" + this.cnt + "个token，这里应该在前面有一个,才对");
                    }
                    ++tmp;
                    var child = {};
                    child.valueType = 'int';
                    child.parent = node;
                    this.constParser(child);
                    node.const.push(child);
                    node.symbol[child.id] = "const";
                }
                ++this.cnt;
            }
            else if (this.token[this.cnt].value == 'void') {
                var child = {};
                child.valueType = this.token[this.cnt++];
                child.parent = node;
                this.funcDecParser(child);
                node.function.push(child);
                node.symbol[child.id] = 'function';
            }
            else {
                var child = {};
                child.valueType = this.token[this.cnt].value;
                child.parent = node;
                if (this.token[this.cnt + 2].value == '(') {
                    ++this.cnt;
                    this.funcDecParser(child);
                    node.function.push(child);
                    node.symbol[child.id] = 'function';
                } else {
                    ++this.cnt;
                    var tmp = 0;
                    while (this.token[this.cnt].value != ";") {
                        if (this.token[this.cnt].value == ",") {
                            ++this.cnt;
                        } else if(tmp > 0) {
                            throw Error("解析不了，在第" + this.cnt + "个token，这里应该在前面有一个,才对");
                        }
                        ++tmp;
                        var child = {};
                        child.valueType = 'int';
                        child.parent = node;
                        this.varParser(child);
                        node.variable.push(child);
                        node.symbol[child.id] = "variable";
                    }
                    ++this.cnt;
                }
            }
        }
    };

    this.constParser = function(node) {
        if (this.token[this.cnt].type != "TT_ID") {
            throw Error("解析不了，在第" + this.cnt + "个token，这里应该是一个标识符才对");
        }
        if(node.parent.symbol[this.token[this.cnt].value]) {
            throw Error("解析不了，在第" + this.cnt + "个token，这个标识符被定义过了");
        }
        node.id = this.token[this.cnt++].value;
        node.type = "const";
        if (this.token[this.cnt].value != "=") {
            throw Error("解析不了，在第" + this.cnt + "个token，这里应该是一个=才对");
        }
        ++this.cnt;
        var sign;
        if (this.token[this.cnt].value == "+" || this.token[this.cnt].value == "-") {
            sign = this.token[this.cnt++].value;
        }
        if (this.token[this.cnt].type != "TT_Lit") {
            throw Error("解析不了，在第" + this.cnt + "个token，这里应该是个整数");
        }
        node.value = this.token[this.cnt++].value;
        if (sign == "-") {
            node.value = -node.value;
        }
    };

    this.varParser = function(node) {
        if (this.token[this.cnt].type != "TT_ID") {
            throw Error("解析不了，在第" + this.cnt + "个token，这里应该是一个标识符才对");
        }
        if(node.parent.symbol[this.token[this.cnt].value]) {
            throw Error("解析不了，在第" + this.cnt + "个token，这个标识符被定义过了");
        }
        node.id = this.token[this.cnt++].value;
        node.type = "variable";
        node.value = 0;
    };

    this.funcDecParser = function(node) {
        if(this.token[this.cnt].type != "TT_ID") {
            throw Error("解析不了，在第" + this.cnt + "个token，这里应该是一个标识符");
        }
        if(node.parent.symbol[this.token[this.cnt].value]) {
            throw Error("解析不了，在第" + this.cnt + "个token，这个标识符被定义过了");
        }
        node.id = this.token[this.cnt++].value;
        node.type = "function";
        node.symbol = {};
        if(this.token[this.cnt].value != '(') {
            throw Error("解析不了，在第" + this.cnt + "个token，这个应该是'('才对");
        }
        ++this.cnt;
        node.parameter = [];
        var cnt = 0;
        while(this.token[this.cnt].value != ')') {
            if(cnt > 0) {
                if(this.token[this.cnt].value != ',')
                    throw Error("解析不了，在第" + this.cnt + "个token，这个应该是','才对");
                ++this.cnt;
            }
            ++cnt;
            if(this.token[this.cnt].value != "int") {
                throw Error("解析不了，在第" + this.cnt + "个token，这个应该是'int'才对");
            }
            ++this.cnt;
            if(this.token[this.cnt].type != "TT_ID") {
                throw Error("解析不了，在第" + this.cnt + "个token，这个应该是标识符才对");
            }
            if(node.symbol[this.token[this.cnt].value]) {
                throw Error("解析不了，在第" + this.cnt + "个token，这个标识符已经被用过了");
            }
            var child = {};
            child.type = "parameter";
            child.id = this.token[this.cnt++].value;
            child.valueType  = "int";
            child.parent = node;
            node.parameter.push(child);
            node.symbol[child.id] = "parameter";
        }
        ++this.cnt;
        if(this.token[this.cnt].value != '{') {
            throw Error("解析不了，在第" + this.cnt + "个token，这个应该是'{'才对");
        }
        ++this.cnt;
        while(this.token[this.cnt].value != '}') {
            //TODO:复合语句分析
        }
        ++this.cnt;
    }

}

var parser = new Parser();
parser.setInput('    const a= 1,b=0,c=-1;const  Int   = -1994;int A,B,C;int f(int a,int A){}');
var root = {};
parser.parse(root);
console.log(root.function[0]);