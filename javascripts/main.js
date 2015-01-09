/**
 * Created by 明阳 on 2015/1/8.
 */
//var Parser = require('./parser.js');
function exec(editorID) {
    var parser = new Parser();
    parser.setInput(editAreaLoader.getValue(editorID));
    var root = {};
    var print = "";
    var printf = function() {
        var list = [];
        for(var i in arguments) list.push(arguments[i]);
        print += list.join(' ');
        editAreaLoader.setValue('output', print);
    };
    try {
        parser.parse(root);
        //console.log(prettyPrint(root));
        document.getElementById('button').style.display='block';
        document.getElementById('root').appendChild(prettyPrint(root));
        document.getElementById('root').style.display='none';
        //console.log(root.genJSCode());
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

