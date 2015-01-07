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
    //"main":7,
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
                T.type = "关键字"
            }
            else {
                T.type = "标识符";
            }
            res.push(T);
        });

        this.lexer.addRule(/\d+\b/, function (ele) {
            col += ele.length;
            var T = new token(parseInt(ele));
            T.type = "数字";
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
            T.type = "符号";
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
        this.declareParser(root);
    };

    this.declareParser = function (node) {
        node.const = [];
        node.variable = [];
        node.function = [];
        node.symbol = {};
        while(this.cnt < this.token.length) {
            if (this.token[this.cnt].type != "关键字") {
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
                    node.symbol[child.id] = child;
                }
                ++this.cnt;
            }
            else if (this.token[this.cnt].value == 'void') {
                var child = {};
                child.valueType = this.token[this.cnt++];
                child.parent = node;
                this.funcDecParser(child);
                node.function.push(child);
                node.symbol[child.id] = child;
            }
            else {
                var child = {};
                child.valueType = this.token[this.cnt].value;
                child.parent = node;
                if (this.token[this.cnt + 2].value == '(') {
                    ++this.cnt;
                    this.funcDecParser(child);
                    node.function.push(child);
                    node.symbol[child.id] = child;
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
                        node.symbol[child.id] = child;
                    }
                    ++this.cnt;
                }
            }
        }
    };

    this.constParser = function(node) {
        if (this.token[this.cnt].type != "标识符") {
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
        if (this.token[this.cnt].type != "数字") {
            throw Error("解析不了，在第" + this.cnt + "个token，这里应该是个整数");
        }
        node.value = this.token[this.cnt++].value;
        if (sign == "-") {
            node.value = -node.value;
        }
    };

    this.varParser = function(node) {
        if (this.token[this.cnt].type != "标识符") {
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
        if(this.token[this.cnt].type != "标识符") {
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
            if(this.token[this.cnt].type != "标识符") {
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
            node.symbol[child.id] = child;
        }
        ++this.cnt;
        var child ={};
        child.parent = node;
        this.blockParser(child);
        node.body = child;
    };

    this.statementParser = function (node) {
        var child = {};
        var tmp = 0;
        child.parent = node;
        switch (this.token[this.cnt].type) {
            case "关键字":
                switch (this.token[this.cnt].value) {
                    case "if":
                        this.ifParser(child); //TODO:if语句块
                        node.statement.push(child);
                        break;
                    case "while":
                        this.whileParser(child);//TODO:while语句块
                        node.statement.push(child);
                        break;
                    case "scanf":
                        this.scanfParser(child);//TODO:scanf语句
                        node.statement.push(child);
                        break;
                    case "printf":
                        this.printfParser(child);//TODO:printf语句
                        node.statement.push(child);
                        break;
                    case "return":
                        this.returnParser(child);//TODO:return语句
                        node.statement.push(child);
                        break;
                    case "const":
                        ++this.cnt;
                        tmp = 0;
                        while (this.token[this.cnt].value != ";") {
                            if (this.token[this.cnt].value == ",") {
                                ++this.cnt;
                            } else if(tmp > 0) {
                                throw Error("解析不了，在第" + this.cnt + "个token，这里应该在前面有一个,才对");
                            }
                            ++tmp;
                            child.valueType = 'int';
                            this.constParser(child);
                            node.const.push(child);
                            node.symbol[child.id] = child;
                        }
                        ++this.cnt;
                        break;
                    case "int":
                        ++this.cnt;
                        tmp = 0;
                        while (this.token[this.cnt].value != ";") {
                            if (this.token[this.cnt].value == ",") {
                                ++this.cnt;
                            } else if(tmp > 0) {
                                throw Error("解析不了，在第" + this.cnt + "个token，这里应该在前面有一个,才对");
                            }
                            ++tmp;
                            child.valueType = 'int';
                            this.varParser(child);
                            node.variable.push(child);
                            node.symbol[child.id] = child;
                        }
                        ++this.cnt;
                        break;
                    default :
                        throw Error("解析不了，在第" + this.cnt + "个token，不应该以这个关键字开头");
                }
                break;
            default :
                switch (this.token[this.cnt].value) {
                    case '{':
                        this.blockParser(child);
                        node.statement.push(child);
                        break;
                    default :
                        this.expressParser(child);
                        node.statement.push(child);
                        break;
                }
                break;
        }
    };

    this.blockParser = function (node) {
        node.type = "语句块";
        node.const = [];
        node.function = [];
        node.variable = [];
        node.statement = [];
        node.symbol = {};
        if(this.token[this.cnt++].value != '{') {
            throw Error("解析不了，在第" + this.cnt + "个token，语句块的开始应该是'{'才对");
        }
        while(this.token[this.cnt].value != '}') {
            this.statementParser(node);
        }
        ++this.cnt;
    };

    this.expressParser = function (node) {
        //TODO:表达式语句块
        node.type = "赋值语句";
        node.element = {};
        node.element.parent = node;
        this.assignExpParser(node.element);
        if(this.token[this.cnt++].value != ';') {
            throw Error("解析不了，在第" + this.cnt + "个token，语句的末尾应该是';'才对");
        }
    };
    this.assignExpParser = function(node) {
        node.type = "赋值表达式";
        node.elements = [];
        do {
            var child = {};
            child.parent = node;
            if(this.token[this.cnt].value == '=') {
                child.operator = this.token[this.cnt++].value;
            }
            this.adExpParser(child); //进入加减表达式解析
            node.elements.push(child);
        }while(this.token[this.cnt].value == '=');
    };
    this.adExpParser = function (node) {
        node.type = "加减表达式";
        node.elements = [];
        do {
            var child = {};
            child.parent = node;
            if(this.token[this.cnt].value == '+' || this.token[this.cnt].value == '-') {
                child.operator = this.token[this.cnt++].value;
            }
            this.productExpParser(child); //进入乘除表达式解析
            node.elements.push(child);
        }while(this.token[this.cnt].value == '+' || this.token[this.cnt].value == '-');
    };

    this.productExpParser = function (node) {
        node.type = "乘除表达式";
        node.elements = [];
        do {
            var child = {};
            child.parent = node;
            if(this.token[this.cnt].value == '*' || this.token[this.cnt].value == '/' || this.token[this.cnt].value == '%') {
                child.operator = this.token[this.cnt++].value;
            }
            this.factorParser(child); //进入因子解析
            node.elements.push(child);
        }while(this.token[this.cnt].value == '*' || this.token[this.cnt].value == '/' || this.token[this.cnt].value == '%');
    };

    this.findID = function (node,id) {
        if(node) {
            if(node.symbol && node.symbol[id]) {
                return node.symbol[id];
            }
            else return this.findID(node.parent,id);
        } else return undefined;
    };

    this.factorParser = function (node) {
        node.type = "因子";
        node.body = {};
        node.body.parent = node;
        switch (this.token[this.cnt].type) {
            case '标识符':
                node.body.value = this.findID(node,this.token[this.cnt++].value);
                if(node.body.value == undefined) {
                    throw Error("解析不了，在第" + this.cnt + "个token，没有找到这个标识符");
                }
                node.body.type = node.body.value.type;
                if(node.body.type == "function") {
                    if(this.token[this.cnt++].value != '(') {
                        throw Error("解析不了，在第" + this.cnt + "个token，函数调用后面应该有'('");
                    }
                    node.body.parameter = {};
                    this.parParser(node.body.parameter);
                    if(this.token[this.cnt++].value != ')') {
                        throw Error("解析不了，在第" + this.cnt + "个token，参数调用最后应该有')'");
                    }
                }
                break;
            case '数字':
                node.body.value = this.token[this.cnt++].value;
                node.body.type = '数字';
                break;
            case '符号':
                if(this.token[this.cnt++].value != '(') {
                    throw Error("解析不了，在第" + this.cnt + "个token，如果以符号开头，应该使用'('");
                }
                this.expressParser(node.body);
                if(this.token[this.cnt++].value != ')') {
                    throw Error("解析不了，在第" + this.cnt + "个token，匹配不到应有的')'");
                }
                break;
        }
    };

    this.parParser = function (node) {
        node.type = "值参数表";
        node.body = [];
        do {
            var child = {};
            child.parent = node;
            if(this.token[this.cnt].value == ',') {
                child.operator = this.token[this.cnt++].value;
            }
            this.expressParser(child);
            node.body.push(child);
        }while(this.token[this.cnt] == ',');
    };

    this.scanfParser = function (node) {
        if(this.token[this.cnt++].value != "scanf") {
            throw Error("解析不了，在第" + this.cnt + "个token，应该是一个scanf");
        }
        if(this.token[this.cnt++].value != "(") {
            throw Error("解析不了，在第" + this.cnt + "个token，至少scanf后面应该是一个(");
        }
        if(this.token[this.cnt].type != "标识符") {
            throw Error("解析不了，在第" + this.cnt + "个token，scanf应该是一个标识符");
        }
    };
}

var parser = new Parser();
parser.setInput('    const a= 1,b=0,c=-1;const  Int   = -1994;int A,B,C;int main(int a,int b){int a,c;const b=0;a=b+1;}');
var root = {};
try {
    parser.parse(root);
    console.log(root);
}
catch (e) {
    console.log(e.message);
}