
if (typeof module === "object" && typeof module.exports === "object") module.exports = Lexer;

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

var row = 1;
var col = 1;

var lexer = new Lexer();
var res = [];
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

lexer.addRule(/[\t ]+/, function (token) { //这是空白字符
    col += token.length;
});

lexer.addRule(/[a-z][a-z\d]*/i, function (ele) {
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

lexer.addRule(/\d+\b/, function (ele) {
    col += ele.length;
    var T = new token(parseInt(ele));
    T.type = "TT_Lit";
    res.push(T);
});


lexer.addRule(/\/\/.*\n/, function (ele) {
    ++row;
    col = 1;
});

lexer.addRule(/".*"/, function(ele) {
    col += ele.length;
    var T = new token(ele);
    T.type = "TT_ST";
    res.push(T);
});

lexer.addRule(/(==|!=|>=|<=|[\+\-\*\/%=(){}\[\];,><])/, function (ele) {
    col += ele.length;
    var T = new token(ele);
    T.type = "TT_OP";
    res.push(T);
});
lexer.addRule(/\n/, function(token) {
    ++row;
    col = 1;
});

lexer.addRule(/$/, function() {
    console.log("词法分析结束");
});

//lexer.setInput('// main function\nint main() { \nint a != 1;                  \nint b = 4;                  \nglobalVar = add(a, b);      \nreturn \"abc\";                   \n}');
lexer.setInput('    const a= 1,b=0;');
lexer.lex();
console.log(res);
