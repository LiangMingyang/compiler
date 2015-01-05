#C-0文法

1.关键字: **const**, **int**, **void**, **if**, **else**, **while**, **main**, **return**, **printf**, **scanf**
`加法运算符`  ::=  **+**|**-**
`乘法运算符` ::=  \* | /
`关系运算符` ::=  **<**｜**>**｜**<=**｜**>=**｜**!＝**｜**＝＝**
`字符`   ::=  **\_** ｜**a**｜．．．｜**z**｜**A**｜．．．｜**Z**
`数字` ::=  **0**｜`非零数字`
`非零数字`    ::= **1**｜．．．｜**9**
`专用符号` ::=  **(**｜**)**｜**{**｜**}**｜**,**｜**;**｜**＝**
`字符串` ::= "{`合法字符`}"

2.
`程序` ::=  [`常量说明部分`][`变量说明部分`][`函数定义部分`]

`标识符` ::=  `字符`{`字符`|`数字`}

`常量说明部分`  ::=  **const** `常量定义`{**,**`常量定义`}**;**
`常量定义`  ::=  `标识符` **＝** `整数`
`整数` ::=  [+|-]`数字`

`变量说明部分` ::= **int** `标识符`{**,**`标识符`}**;**

`函数定义部分` ::= (**int**｜**void**) `标识符` `参数` `复合语句`

`复合语句` ::=  **{**[`常量说明部分`][`变量说明部分`][`语句序列`]**}**
`参数` ::=  **(**`参数表`**)**
`参数表` ::=  **int** `标识符`｛**,int** `标识符`} | `空`
                  *//参数表可以为空*
`表达式` ::=  [+|-]`项`{`加法运算符` `项`}
`项` ::=  `因子`{`乘法运算符` `因子`}
`因子` ::=  `标识符`｜**(**`表达式`**)**｜`整数`｜`函数调用语句`
`语句` ::=  `条件语句`｜`循环语句`｜**{**`语句序列`**}**｜`函数调用语句`**;**
｜`赋值语句`**;**| `返回语句`**;**｜`读语句`**;**｜`写语句`**;**｜`空`
`赋值语句` ::=  `标识符`**＝**`表达式`
`条件语句` ::=  **if(**`条件`**)**`语句`(**else**`语句`)
`条件` ::=  `表达式` `关系运算符` `表达式`｜`表达式`
`循环语句` ::=  **while(**`条件`**)**`语句`
`函数调用语句` ::=  `标识符`**(**`值参数表`**)**
`值参数表` ::=  `表达式`{**,**`表达式`}｜`空`
`语句序列` ::=  `语句`{`语句`}
`读语句` ::=  **scanf(**`标识符`**)**
`写语句` ::=  **printf(**[`字符串`,][`expression`]**)**  //*当出现字符串时，就加印字符串, 之后打印表达式的值；*

`返回语句` ::=  **return** [`表达式`] 