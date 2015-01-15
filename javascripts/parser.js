/**
 * Created by 明阳 on 2015/1/4.
 */

//var Lexer = require('./lexer.js');

var preDis = 0;
var preAdd = 0;
function Parser () {
    this.token = [];
    this.cnt = 0;
    this.lexer = new Lexer();


    this.setInput = function (input) {
        this.lexer.setInput(input);
    };

    this.parse = function (root) { //语法分析过程，对root节点进行建树操作，token应该在之前设定
        this.cnt = 0;
        this.symbol = {};
        this.token = this.lexer.lex();
        this.declareParser(root);
    };

    this.top = function() {
        if(this.cnt>=this.token.length) throw Error("程序过早结束");
        return this.token[this.cnt];
    };

    this.read = function() {
        if(this.cnt>=this.token.length) throw Error("程序过早结束");
        return this.token[this.cnt++];
    };
    
    this.throwError = function (str) {
        throw Error("出现异常，在第" + this.cnt + "个token:\n"+JSON.stringify(this.top()) + "\n" + str);
    };

    this.declareParser = function (node) {
        node.const = [];
        node.variable = [];
        node.function = [];
        node.symbol = {};

        while(this.cnt < this.token.length) {
            if (this.top().type != "关键字") {
                this.throwError("声明的开始应该是关键字");
            }
            if (this.top().value == 'const') {
                this.constParser(node);
            }
            else if (this.top().value == 'void') {
                this.funcDecParser(node);
            }
            else {
                if (this.token[this.cnt + 2].value == '(') {
                    this.funcDecParser(node);
                } else {
                    this.varParser(node);
                }
            }
        }

        node.genJSCode = function () {
            var code = "";
            this.variable.forEach(function(ele){
                code += "var "+ele.id+"="+ele.value+";";
            });
            this.const.forEach(function(ele){
                code += "const "+ele.id+"="+ele.value+";";
            });
            this.function.forEach(function(ele){
                code += "function "+ele.id + "(" ;
                var list = [];
                ele.parameter.forEach(function(ele) {
                    list.push(ele.id);
                });
                code += list.join(',')+")";
                code += ele.body.genJSCode();
            });
            code += "main();";
            return code;
        };
        node.genPcode = function () {
            var command = [];
            node.variable.forEach(function(ele,index) {
                ele.order = index+3;
            });
            command.push(['JMP',0,-1]); //这个是为了修改main函数用的
            command.push(['INT',0,node.variable.length+3]);
            node.function.forEach(function (ele) {
                ele.genPcode(command);
            });
            if(node.symbol['main'])
                command[0][2] = node.symbol['main'].order;
            else
                throw Error('没有找到main函数');
            var list = [];
            command.forEach(function(ele) {
                list.push(ele.join('\t'));
            });
            return list.join('\n');
        }
    };

    this.constParser = function(node) {
        if(this.read().value != 'const') this.throwError("const声明的开始应该是const");
        do {
            if(this.top().value == ';')break;
            if(this.top().value == ',')this.read();
            if(this.top().type != "标识符")this.throwError("声明的应该是标识符");
            if(node.symbol[this.top().value])this.throwError("标识符被定义过了");
            var child = {};
            child.parent = node;
            child.id = this.read().value;
            child.type = "const";
            if(this.read().value != "=")this.throwError("常量需要在定义的时候赋值");
            var sign;
            if (this.top().value == "+" || this.top().value == "-") {
                sign = this.read().value;
            }
            if (this.top().type != "数字") this.throwError("这里应该是个整数");
            child.value = this.read().value;
            if(sign == '-') child.value = -child.value;
            node.const.push(child);
            node.symbol[child.id] = child;
        }while(this.top().value == ',');
        if(this.read().value != ';') this.throwError("语句应该以;结束");
    };

    this.varParser = function(node) {
        if(this.read().value != 'int') this.throwError("变量声明的开始应该是int");
        do {
            if(this.top().value == ';')break;
            if(this.top().value == ',')this.read();
            if(this.top().type != "标识符")this.throwError("声明的应该是标识符");
            if(node.symbol[this.top().value])this.throwError("标识符被定义过了");
            var child = {};
            child.parent = node;
            child.id = this.read().value;
            child.type = "variable";
            child.value = 0;
            node.variable.push(child);
            node.symbol[child.id] = child;
        }while(this.top().value == ',');
        if(this.read().value != ';') this.throwError("语句应该以;结束");
    };

    this.funcDecParser = function(node) {
        if(this.read().value != 'int' && this.read().value != 'void') this.throwError("函数声明的开始应该是int或者void");
        if(this.top().type != "标识符") this.throwError("声明的应该是标识符");
        if(node.symbol[this.top().value]) this.throwError("标识符被定义过了");
        var child = {};
        child.parent = node;
        child.id = this.read().value;
        child.type = "function";
        child.symbol = {};
        if(this.read().value != '(') this.throwError("函数的参数应该以'('开始");
        child.parameter = [];
        child.body = {};
        child.variable = [];
        do {
            if(this.top().value == ')') break; //为了支持没有参数的函数
            if(this.top().value == ',') this.read();
            if(this.read().value != 'int') this.throwError("函数的参数类型应该是'int'");
            if(this.top().type != "标识符") this.throwError("参数应该是标识符");
            if(child.symbol[this.top().value]) this.throwError("标识符被定义过了");
            var ele = {};
            ele.type = "parameter";
            ele.id = this.read().value;
            ele.valueType  = "int";
            ele.parent = node;
            child.parameter.push(ele);
            child.symbol[ele.id] = ele;
        } while(this.top().value == ',');
        if(this.read().value != ')') this.throwError("函数的参数应该以')'结束");
        child.body.parent = child;
        child.body.symbol = child.symbol;
        child.body.variable = child.variable;
        this.blockParser(child.body);
        node.function.push(child);
        node.symbol[child.id] = child;
        child.genPcode = function(command) {
            child.order = command.length;
            command.push(['JMP',0,command.length]);
            command.push(['INT',0,child.variable.length+3]);
            //child.body.genPcode(command);
        };
    };

    this.statementParser = function (node) {
        var child = {};
        child.parent = node;
        switch (this.top().type) {
            case "关键字":
                switch (this.top().value) {
                    case "if":
                        this.ifParser(child);
                        node.statement.push(child);
                        break;
                    case "while":
                        this.whileParser(child);
                        node.statement.push(child);
                        break;
                    case "scanf":
                        this.scanfParser(child);
                        node.statement.push(child);
                        break;
                    case "printf":
                        this.printfParser(child);
                        node.statement.push(child);
                        break;
                    case "return":
                        this.returnParser(child);
                        node.statement.push(child);
                        break;
                    case "const":
                        this.constParser(node);
                        break;
                    case "int":
                        this.varParser(node);
                        break;
                    default :
                        this.throwError("不应该以这个关键字开头");
                }
                break;
            default :
                switch (this.top().value) {
                    case '{':
                        this.blockParser(child);
                        node.statement.push(child);
                        break;
                    case  ';':
                        break;
                    default :
                        this.expStaParser(child);
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
        node.variable = node.variable || [];
        node.statement = [];
        node.symbol =node.symbol || {};
        if(this.read().value != '{') {
            this.throwError("语句块的开始应该是'{'才对");
        }
        while(this.top().value != '}') {
            this.statementParser(node);
        }
        if(this.read().value != '}') this.throwError("语句块的结束应该是'}'才对");
        node.genJSCode = function() {
            var code = "{";
            this.variable.forEach(function(ele){
                code += "var "+ele.id+"="+ele.value+";";
            });
            this.const.forEach(function(ele){
                code += "var "+ele.id+"="+ele.value+";";
            });
            this.function.forEach(function(ele){
                code += "function "+ele.id + "(" ;
                var list = [];
                ele.parameter.forEach(function(ele) {
                    list.push(ele.id);
                });
                code += list.join(',')+")";
                code += ele.body.genJSCode();
            });
            this.statement.forEach(function(ele) {
                code += ele.genJSCode();
            });
            code += '}';
            return code;
        };
        node.genPcode = function(command) {
            node.statement.forEach(function (ele) {
                ele.genPcode(command);
            });
        };
    };

    this.expressParser = function (node) {
        node.type = "逻辑表达式";
        node.elements = [];
        do {
            var child = {};
            child.parent = node;
            if(this.top().value == '||' || this.top().value == '&&') {
                child.operator = this.read().value;
            }
            this.comExpParser(child); //进入比较表达式解析
            node.elements.push(child);
        }while(this.top().value == '||' || this.top().value == '&&');
        node.genJSCode = function() {
            var code = "";
            if(node.operator)code += node.operator;
            code += "(";
            node.elements.forEach(function(ele) {
                code += ele.genJSCode();
            });
            code += ")";
            return code;
        };
        node.genPcode = function(command) {
            node.elements.forEach(function(ele) {
                ele.genPcode(command);
            });
        };
    };

    this.expStaParser = function (node) {
        node.type = "表达式语句";
        node.elements = [];
        do {
            if(this.top().value == ',')this.read();
            var child = {};
            child.parent = node;
            this.expressParser(child);
            node.elements.push(child);
        }while(this.top().value == ',');
        if(this.read().value != ';') {
            this.throwError("语句应该以;结束");
        }
        node.genJSCode = function() {
            var code = "";
            node.elements.forEach(function (ele) {
                code += ele.genJSCode();
            });
            code += ";";
            return code;
        };
        node.genPcode = function(command) {
            node.elements.forEach(function(ele) {
                ele.genPcode(command);
            });
        };
    };

    this.comExpParser = function(node) {
        node.type = "比较表达式";
        node.elements = [];
        do {
            var child = {};
            child.parent = node;
            if(this.top().value == '>' || this.top().value == '>=' || this.top().value == '<' || this.top().value == '<=' || this.top().value == '==' || this.top().value == '!=') {
                child.operator = this.read().value;
            }
            this.assignExpParser(child); //进入赋值表达式解析
            node.elements.push(child);
        }while(this.top().value == '>' || this.top().value == '>=' || this.top().value == '<' || this.top().value == '<=' || this.top().value == '==' || this.top().value == '!=');
        node.genJSCode = function() {
            var code = "";
            if(node.operator)code += node.operator;
            code += "(";
            node.elements.forEach(function(ele) {
                code += ele.genJSCode();
            });
            code += ")";
            return code;
        };
        node.genPcode = function(command) {
            node.elements.forEach(function(ele) {
                ele.genPcode(command);
            });
            if(node.operator == '||') command.push(['OPR',0,13]);
            if(node.operator == '&&') command.push(['OPR',0,14]);
        };
    };

    this.assignExpParser = function(node) {
        node.type = "赋值表达式";
        node.elements = [];
        do {
            var child = {};
            child.parent = node;
            if(this.top().value == '=') {
                child.operator = this.read().value;
            }
            this.adExpParser(child); //进入加减表达式解析
            node.elements.push(child);
        }while(this.top().value == '=');
        node.genJSCode = function() {
            var code = "";
            if(node.operator)code += node.operator;
            code += "(";
            node.elements.forEach(function(ele) {
                code += ele.genJSCode();
            });
            code += ")";
            return code;
        };
        node.genPcode = function(command) {
            node.elements.forEach(function(ele) {
                ele.genPcode(command);
            });
            if(node.operator == '==') command.push(['OPR',0,7]);
            if(node.operator == '!=') command.push(['OPR',0,8]);
            if(node.operator == '<') command.push(['OPR',0,9]);
            if(node.operator == '>=') command.push(['OPR',0,10]);
            if(node.operator == '>') command.push(['OPR',0,11]);
            if(node.operator == '<=') command.push(['OPR',0,12]);
        };
    };

    this.adExpParser = function (node) {
        node.type = "加减表达式";
        node.elements = [];
        do {
            var child = {};
            child.parent = node;
            if(this.top().value == '+' || this.top().value == '-') {
                child.operator = this.read().value;
            }
            this.productExpParser(child); //进入乘除表达式解析
            node.elements.push(child);
        }while(this.top().value == '+' || this.top().value == '-');
        node.genJSCode = function() {
            var code = "";
            if(node.operator)code += node.operator;
            code += "(";
            node.elements.forEach(function(ele) {
                code += ele.genJSCode();
            });
            code += ")";
            return code;
        };
        node.genPcode = function(command) {
            node.elements.forEach(function(ele) {
                ele.genPcode(command);
            });
            if(node.operator == '=') command.push(['STO',0,0]); //TODO:这里生成的赋值是有问题的
        };
    };

    this.productExpParser = function (node) {
        node.type = "乘除表达式";
        node.elements = [];
        do {
            var child = {};
            child.parent = node;
            if(this.top().value == '*' || this.top().value == '/' || this.top().value == '%') {
                child.operator = this.read().value;
            }
            this.factorParser(child); //进入因子解析
            node.elements.push(child);
        }while(this.top().value == '*' || this.top().value == '/' || this.top().value == '%');
        node.genJSCode = function() {
            var code = "";
            if(node.operator)code += node.operator;
            code += "(";
            node.elements.forEach(function(ele) {
                code += ele.genJSCode();
            });
            code += ")";
            return code;
        };
        node.genPcode = function(command) {
            node.elements.forEach(function(ele) {
                ele.genPcode(command);
            });
            if(node.operator == '+') command.push(['OPR',0,2]);
            if(node.operator == '-') command.push(['OPR',0,3]);
        };
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
        node.value = {};
        node.genPcode = function(command) {
            command.push(['LOD',0,0]); //TODO:先到这儿吧
        };
        switch (this.top().type) {
            case '标识符':
                node.value = this.findID(node,this.read().value);
                if(node.value == undefined) {
                    this.throwError("没有找到这个标识符");
                }
                if(node.value.type == "function") {
                    if(this.read().value != '(') {
                        this.throwError("函数调用后面应该有'('");
                    }
                    node.parameter = {};
                    node.parameter.parent = node;
                    this.parParser(node.parameter);
                    if(this.read().value != ')') {
                        this.throwError("参数调用最后应该有')'");
                    }
                    node.genJSCode = function() {
                        var code ="";
                        if(node.operator)code += node.operator;
                        code += node.value.id;
                        code += "(";
                        code += node.parameter.genJSCode();
                        code += ")";
                        return code;
                    }
                } else {
                    node.genJSCode = function() {
                        var code = "";
                        if(node.operator)code += node.operator;
                        code += node.value.id;
                        return code;
                    };
                }
                break;
            case '数字':
                node.value = this.read();
                node.genJSCode = function() {
                    var code = "";
                    if(node.operator)code += node.operator;
                    code += node.value.value;
                    return code;
                };
                break;
            case '符号':
                if(this.top().value == ';') {
                    return ;
                }
                if(this.read().value != '(') {
                    this.throwError("如果以符号开头，应该使用'('");
                }
                node.value.parent = node;
                this.expressParser(node.value);
                if(this.read().value != ')') {
                    this.throwError("匹配不到应有的')'");
                }
                node.genJSCode = function() {
                    var code = "";
                    if(node.operator)code += node.operator;
                    code += '(';
                    code += node.value.genJSCode;
                    code += ')';
                    return code;
                };
                break;
            case '字符串':
                node.value = this.read();
                node.genJSCode = function() {
                    var code = "";
                    if(node.operator)code += node.operator;
                    code += node.value.value;
                    return code;
                };
                break;
        }
    };

    this.parParser = function (node) {
        node.type = "值参数表";
        node.parameter = [];
        do {
            if(this.top().value == ')')break;
            var child = {};
            child.parent = node;
            if(this.top().value == ',') {
                child.operator = this.read().value;
            }
            this.expressParser(child);
            node.parameter.push(child);
        }while(this.top().value == ',');
        node.genJSCode = function() {
            var code = "";
            node.parameter.forEach(function(ele) {
                code += ele.genJSCode();
            });
            return code;
        }
    };

    this.scanfParser = function (node) {
        if(this.read().value != "scanf") {
            this.throwError("应该是一个scanf");
        }
        node.type = "scanf语句";
        if(this.read().value != "(") {
            this.throwError("至少scanf后面应该是一个(");
        }
        node.parameter = [];
        do {
            if(this.top().value == ",") {
                ++this.cnt;
            }
            if(this.top().type != "标识符") {
                this.throwError("scanf的参数应该是标识符");
            }
            var child = this.findID(node,this.top().value);
            if(child == undefined) {
                this.throwError("没有找到这个标识符");
            }
            this.read();
            node.parameter.push(child);
        } while(this.top().value == ",");
        if(this.read().value != ')') {
            this.throwError("scanf的参数应该以)结束");
        }
        if(this.read().value != ';') {
            this.throwError("语句应该以;结束");
        }
        node.genJSCode = function () {
            var code = "";
            node.parameter.forEach(function (ele) {
                code += ele.id+"=read();";
            });
            return code;
        }
    };

    this.ifParser = function (node) {
        node.type = "if语句块";
        node.elements = [];
        do {
            var child = {};
            child.parent = node;
            if(this.top().value == "else") {
                ++this.cnt;
            }
            if(this.top().value == "if") {
                child.condition = {};
                ++this.cnt;
                if(this.read().value != "(") {
                    this.throwError("条件应该以'('开始");
                }
                this.expressParser(child.condition);
                if(this.read().value != ")") {
                    this.throwError("条件应该以')'结束");
                }
            }
            child.body = {};
            this.blockParser(child.body);
            node.elements.push(child);
        }while(this.top().value == "else");
        node.genJSCode = function () {
            var list = [];
            node.elements.forEach(function (ele) {
                var code = '';
                if(ele.condition) {
                    code += 'if(';
                    code += ele.condition.genJSCode();
                    code += ')';
                }
                code += ele.body.genJSCode();
                list.push(code);
            });
            return list.join(' else ');
        }
    };

    this.whileParser = function (node) {
        node.type = "while语句块";
        node.condition = {};
        node.body = {};
        if(this.read().value != "while") {
            this.throwError("while循环语句应该以while开始");
        }
        if(this.read().value != "(") {
            this.throwError("条件应该以'('开始");
        }
        this.expressParser(node.condition);
        if(this.read().value != ")") {
            this.throwError("条件应该以')'结束");
        }
        this.blockParser(node.body);
        node.genJSCode = function () {
            var code ="";
            code += 'while(';
            code += node.condition.genJSCode();
            code += ')';
            code += node.body.genJSCode();
            return code;
        }
    };

    this.returnParser = function (node) {
        node.type = "return语句";
        node.body = {};
        node.body.parent = node;
        if(this.read().value != "return") {
            this.throwError("return语句应该以return开始");
        }
        this.expressParser(node.body);
        if(this.read().value != ';') {
            this.throwError("语句应该以;结束");
        }
        node.genJSCode = function () {
            var code = "";
            code += "return ";
            code += node.body.genJSCode();
            code += ';';
            return code;
        };
    };

    this.printfParser = function (node) {
        if(this.read().value != "printf") {
            this.throwError("printf语句应该以printf开始");
        }
        node.type = "printf语句";
        if(this.read().value != "(") {
            this.throwError("至少printf后面应该是一个(");
        }
        node.parameter = {};
        node.parameter.parent = node;
        this.parParser(node.parameter);
        if(this.read().value != ')') {
            this.throwError("printf的参数应该以)结束");
        }
        if(this.read().value != ';') {
            this.throwError("语句应该以;结束");
        }
        node.genJSCode = function () {
            var code = "";
            code += 'printf(';
            code += node.parameter.genJSCode();
            code += ');';
            return code;
        };
    };
}

//module.exports = Parser;