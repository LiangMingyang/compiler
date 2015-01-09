/**
 * Created by 明阳 on 2015/1/8.
 */
//var Parser = require('./parser.js');


function exec(editorID) {
    var parser = new Parser();
    parser.setInput(editAreaLoader.getValue('editor'));
    var root = {};
    var print = "";
    var scan = new Istream();
    scan.setInput(editAreaLoader.getValue('input'));
    var item = scan.lex();
    var scanCnt = 0;
    var printf = function() {
        var list = [];
        for(var i in arguments) {
            list.push(arguments[i]);
        }
        print += list.join(' ');
        print += '\n';
        editAreaLoader.setValue('output', print);
    };
    var read = function() {
        if (scanCnt < item.length && item[scanCnt].type != "数字") {
            throw Error('出现异常，在\n'+JSON.stringify(item[scanCnt++])+'\n暂不支持非数字');
        }
        return parseInt(item[scanCnt++].value);
    };
    try {
        parser.parse(root);
        //console.log(prettyPrint(root));
        document.getElementById('button').style.display='block';
        var parseTree = document.getElementById('root');
        if(parseTree.children && parseTree.children.length) parseTree.removeChild(parseTree.children[0]);
        parseTree.appendChild(prettyPrint(root));
        parseTree.style.display='none';
        console.log(root.genJSCode());
        try {
            eval(root.genJSCode());
        }
        catch (e) {
            //console.log(e.message);
            printf(e.message);
        }
    }
    catch (e) {
        //console.log(e.message);
        printf(e.message);
    }
}

