#编译原理语法规则
 Problem -> GlobalDecl *
 GlobalDecl -> "int" ID [ "=" LITERAL ] ";" | ( "int" | "void" ) ID "(" [ FormalArgs ] ")" Context
 LITERAL -> [0-9]+
 ID -> [A-Za-z][A-Za-z0-9]*
 FormalArgs -> ε| (ID|LITERAL) | (ID|LITERAL),FormalArgs
 Context ->s
